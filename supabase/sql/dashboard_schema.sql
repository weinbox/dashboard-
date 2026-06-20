-- ============================================================
-- BoxBuy / Box Global — Dashboard schema
-- Run this in the Supabase SQL editor (project: wlzwtsvvvzlprlmzukks)
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. ORDERS
-- ─────────────────────────────────────────────
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users (id) on delete set null,
  customer_phone text,
  status        text not null default 'new'
                check (status in ('new','confirmed','shipping','delivered','cancelled')),
  total_items   integer not null default 0,
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_user_id_idx on public.orders (user_id);

-- ─────────────────────────────────────────────
-- 2. ORDER ITEMS
-- ─────────────────────────────────────────────
create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  title         text not null,
  price_text    text,
  price_numeric numeric,
  quantity      integer not null default 1,
  url           text,
  image         text,
  platform      text,
  variant_title text,
  created_at    timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);

-- ─────────────────────────────────────────────
-- 3. SETTINGS (pricing config — key/value)
-- ─────────────────────────────────────────────
create table if not exists public.settings (
  key         text primary key,
  value       numeric not null,
  description text,
  updated_at  timestamptz not null default now()
);

-- Seed default pricing values (matches backend/src/lib/pricing.ts)
insert into public.settings (key, value, description) values
  ('usd_to_iqd',                 1350,   'سعر صرف الدولار للدينار (أمريكا)'),
  ('iqd_markup',                 1.2,    'هامش الربح (مضاعف)'),
  ('cny_to_usd',                 6.5,    'سعر صرف اليوان للدولار'),
  ('usd_to_iqd_china',           1400,   'سعر صرف الدولار للدينار (الصين)'),
  ('china_shipping_per_kg',      15500,  'شحن الصين لكل كيلوغرام (دينار)'),
  ('shipping_regular_per_lb',    8900,   'شحن عادي لكل باوند (دينار)'),
  ('shipping_perfume_flat',      40000,  'شحن العطور (ثابت/دينار)'),
  ('shipping_hazardous_flat',    25000,  'شحن المواد الخطرة (ثابت/دينار)'),
  ('shipping_supplement_per_lb', 12000,  'شحن المكملات لكل باوند (دينار)'),
  ('shipping_supplement_tax',    2000,   'ضريبة المكملات (دينار)'),
  ('shipping_mobile_flat',       95000,  'شحن الهواتف (ثابت/دينار)'),
  ('shipping_laptop_flat',       55000,  'شحن اللابتوبات (ثابت/دينار)')
on conflict (key) do nothing;

-- ─────────────────────────────────────────────
-- 4. SEARCH EVENTS (analytics)
-- ─────────────────────────────────────────────
create table if not exists public.search_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users (id) on delete set null,
  query         text,
  platform      text,
  results_count integer,
  created_at    timestamptz not null default now()
);

create index if not exists search_events_created_at_idx on public.search_events (created_at desc);

-- ─────────────────────────────────────────────
-- updated_at trigger for orders
-- ─────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- The dashboard uses the SERVICE ROLE key, which BYPASSES RLS.
-- These policies only govern the mobile app (anon / authenticated).
-- ============================================================

alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;
alter table public.settings      enable row level security;
alter table public.search_events enable row level security;

-- ORDERS: anyone (incl. guests) may create an order; users may read their own.
drop policy if exists "orders_insert_any" on public.orders;
create policy "orders_insert_any" on public.orders
  for insert to anon, authenticated with check (true);

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select to authenticated using (user_id = auth.uid());

-- ORDER ITEMS: anyone may insert; users may read items of their own orders.
drop policy if exists "order_items_insert_any" on public.order_items;
create policy "order_items_insert_any" on public.order_items
  for insert to anon, authenticated with check (true);

drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own" on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- SETTINGS: readable by everyone (pricing numbers), writable only via service role.
drop policy if exists "settings_select_all" on public.settings;
create policy "settings_select_all" on public.settings
  for select to anon, authenticated using (true);

-- SEARCH EVENTS: anyone may insert; no client read access.
drop policy if exists "search_events_insert_any" on public.search_events;
create policy "search_events_insert_any" on public.search_events
  for insert to anon, authenticated with check (true);

-- ============================================================
-- ATOMIC ORDER CREATION
-- Inserts an order AND its items in a single transaction so the
-- client only needs one network round-trip. This prevents partial
-- "0-item" orders that happened when the second request (items)
-- was cancelled after the app switched to WhatsApp.
-- ============================================================
create or replace function public.place_order(
  p_items jsonb,
  p_total integer,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_item jsonb;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'order must contain at least one item';
  end if;

  insert into public.orders (user_id, customer_phone, total_items)
  values (auth.uid(), p_phone, coalesce(p_total, 0))
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.order_items (
      order_id, title, price_text, price_numeric,
      quantity, url, image, platform, variant_title
    ) values (
      v_order_id,
      coalesce(v_item->>'title', ''),
      v_item->>'price_text',
      nullif(v_item->>'price_numeric', '')::numeric,
      coalesce((v_item->>'quantity')::int, 1),
      v_item->>'url',
      v_item->>'image',
      v_item->>'platform',
      v_item->>'variant_title'
    );
  end loop;

  return v_order_id;
end;
$$;

grant execute on function public.place_order(jsonb, integer, text) to anon, authenticated;
