import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { env } from "../env";
import { getSupabaseAdmin, isAdminConfigured } from "../lib/supabaseAdmin";

export const adminRouter = new Hono();

const COOKIE = "bx_admin";

const STATUSES = [
  { value: "new", label: "جديد", color: "#2563eb" },
  { value: "confirmed", label: "مؤكد", color: "#d97706" },
  { value: "shipping", label: "قيد الشحن", color: "#7c3aed" },
  { value: "delivered", label: "تم التوصيل", color: "#16a34a" },
  { value: "cancelled", label: "ملغي", color: "#dc2626" },
];

function statusMeta(v: string) {
  return STATUSES.find((s) => s.value === v) ?? STATUSES[0]!;
}

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ar-IQ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtNum(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString("en");
}

// ── Shared HTML shell ────────────────────────────────────────────
function layout(active: string, body: string): string {
  const nav = [
    { href: "/admin", label: "نظرة عامة", key: "overview" },
    { href: "/admin/orders", label: "الطلبات", key: "orders" },
    { href: "/admin/pricing", label: "الأسعار", key: "pricing" },
    { href: "/admin/users", label: "المستخدمون", key: "users" },
  ];
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>لوحة تحكم Box Global</title>
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { margin:0; font-family: system-ui, Tahoma, Arial, sans-serif; background:#f3f4f6; color:#131921; }
  .wrap { display:flex; min-height:100vh; }
  aside { width:230px; background:#131921; color:#fff; display:flex; flex-direction:column; flex-shrink:0; }
  .brand { display:flex; align-items:center; gap:10px; padding:18px 20px; }
  .logo { width:40px; height:40px; border-radius:12px; background:#1A8C4E; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:18px; }
  nav { flex:1; padding:8px; }
  nav a { display:block; padding:12px 16px; border-radius:12px; color:#cbd5e1; text-decoration:none; font-weight:600; font-size:14px; margin-bottom:4px; }
  nav a.active { background:#1A8C4E; color:#fff; }
  nav a:hover:not(.active) { background:rgba(255,255,255,.08); }
  .logout { margin:12px; padding:12px; border-radius:12px; background:rgba(255,255,255,.08); color:#e5e7eb; text-decoration:none; text-align:center; font-weight:600; font-size:14px; }
  .logout:hover { background:#dc2626; color:#fff; }
  main { flex:1; padding:28px; overflow-x:hidden; }
  h1 { font-size:24px; font-weight:800; margin:0 0 20px; }
  .grid { display:grid; gap:16px; }
  .cards { grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); }
  .card { background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:18px; box-shadow:0 1px 2px rgba(0,0,0,.04); }
  .card .lbl { font-size:13px; color:#6b7280; }
  .card .val { font-size:30px; font-weight:800; margin-top:4px; }
  .card .hint { font-size:12px; color:#9ca3af; margin-top:4px; }
  .pill { display:inline-block; border-radius:999px; padding:4px 12px; font-size:12px; font-weight:700; color:#fff; }
  .tabs { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px; }
  .tabs a { background:#fff; color:#4b5563; border-radius:999px; padding:8px 16px; font-size:14px; font-weight:600; text-decoration:none; }
  .tabs a.active { background:#1A8C4E; color:#fff; }
  .order { background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:16px; margin-bottom:14px; }
  .order .top { display:flex; flex-wrap:wrap; justify-content:space-between; gap:12px; align-items:center; }
  .muted { color:#9ca3af; font-size:12px; }
  select, input { font-family:inherit; }
  select { border:1px solid #d1d5db; border-radius:10px; padding:8px 12px; font-size:14px; font-weight:600; }
  .btn { background:#1A8C4E; color:#fff; border:none; border-radius:12px; padding:10px 18px; font-weight:700; font-size:14px; cursor:pointer; }
  .btn:hover { background:#146B3C; }
  .btn-sm { padding:6px 12px; font-size:13px; }
  .item { display:flex; gap:12px; background:#f9fafb; border:1px solid #f1f5f9; border-radius:12px; padding:10px; margin-top:10px; }
  .item img { width:60px; height:60px; border-radius:8px; object-fit:contain; background:#fff; }
  details > summary { cursor:pointer; color:#1A8C4E; font-weight:600; font-size:14px; margin-top:10px; }
  table { width:100%; background:#fff; border:1px solid #e5e7eb; border-radius:16px; border-collapse:collapse; overflow:hidden; }
  th, td { text-align:right; padding:12px 16px; font-size:14px; }
  thead { background:#f9fafb; color:#6b7280; }
  tbody tr { border-top:1px solid #f1f5f9; }
  .field { margin-bottom:14px; }
  .field label { display:block; font-size:13px; color:#4b5563; margin-bottom:6px; }
  .field input { width:100%; border:1px solid #d1d5db; border-radius:12px; padding:10px 14px; font-size:15px; direction:ltr; text-align:left; }
  .group { background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:18px; margin-bottom:16px; }
  .group h3 { margin:0 0 14px; font-size:17px; }
  .group .row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .ok { color:#16a34a; font-weight:700; }
  .empty { background:#fff; border:2px dashed #d1d5db; border-radius:16px; padding:48px; text-align:center; color:#9ca3af; }
  .ltr { direction:ltr; }
  @media (max-width:640px){ aside{width:64px;} .brand .txt,nav a span{display:none;} main{padding:16px;} .group .row{grid-template-columns:1fr;} }
</style>
</head>
<body>
<div class="wrap">
  <aside>
    <div class="brand"><div class="logo">B</div><div class="txt"><div style="font-weight:800;font-size:14px">Box Global</div><div style="font-size:11px;color:#9ca3af">لوحة التحكم</div></div></div>
    <nav>
      ${nav
        .map(
          (n) =>
            `<a class="${active === n.key ? "active" : ""}" href="${n.href}"><span>${n.label}</span></a>`
        )
        .join("")}
    </nav>
    <a class="logout" href="/admin/logout">تسجيل الخروج</a>
  </aside>
  <main>${body}</main>
</div>
</body>
</html>`;
}

function notConfiguredPage(): string {
  return layout(
    "overview",
    `<h1>اللوحة غير مهيّأة</h1>
     <div class="empty">
       لتشغيل اللوحة أضف المتغيّرين التاليين إلى بيئة الباكند ثم أعد التشغيل:<br/><br/>
       <code>SUPABASE_SERVICE_ROLE_KEY</code><br/><code>ADMIN_PASSWORD</code>
     </div>`
  );
}

function loginPage(error?: string): string {
  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex,nofollow"/>
<title>دخول — لوحة Box Global</title>
<style>
  body{margin:0;font-family:system-ui,Tahoma,Arial,sans-serif;background:#131921;display:flex;min-height:100vh;align-items:center;justify-content:center;}
  form{background:#fff;border-radius:20px;padding:32px;width:100%;max-width:360px;box-shadow:0 20px 50px rgba(0,0,0,.3);}
  .logo{width:56px;height:56px;border-radius:16px;background:#1A8C4E;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:24px;color:#fff;margin:0 auto 12px;}
  h1{text-align:center;font-size:20px;margin:0 0 4px;}
  p{text-align:center;color:#6b7280;font-size:14px;margin:0 0 20px;}
  input{width:100%;border:1px solid #d1d5db;border-radius:12px;padding:12px;text-align:center;font-size:18px;margin-bottom:12px;box-sizing:border-box;}
  button{width:100%;background:#1A8C4E;color:#fff;border:none;border-radius:12px;padding:12px;font-weight:700;font-size:16px;cursor:pointer;}
  .err{background:#fef2f2;color:#dc2626;border-radius:10px;padding:8px;text-align:center;font-size:14px;margin-bottom:12px;}
</style></head><body>
<form method="post" action="/admin/login">
  <div class="logo">B</div>
  <h1>لوحة تحكم Box Global</h1>
  <p>أدخل كلمة المرور للمتابعة</p>
  ${error ? `<div class="err">${esc(error)}</div>` : ""}
  <input type="password" name="password" placeholder="كلمة المرور" autofocus required />
  <button type="submit">دخول</button>
</form>
</body></html>`;
}

// ── Auth guard ───────────────────────────────────────────────────
adminRouter.use("*", async (c, next) => {
  const path = c.req.path;
  if (path === "/admin/login") return next();
  if (!isAdminConfigured()) {
    return c.html(notConfiguredPage());
  }
  const token = getCookie(c, COOKIE);
  if (!token || token !== env.ADMIN_PASSWORD) {
    return c.redirect("/admin/login");
  }
  return next();
});

// ── Login / logout ───────────────────────────────────────────────
adminRouter.get("/login", (c) => {
  if (!isAdminConfigured()) return c.html(notConfiguredPage());
  if (getCookie(c, COOKIE) === env.ADMIN_PASSWORD) return c.redirect("/admin");
  return c.html(loginPage());
});

adminRouter.post("/login", async (c) => {
  const body = await c.req.parseBody();
  const password = String(body.password ?? "");
  if (!password || password !== env.ADMIN_PASSWORD) {
    return c.html(loginPage("كلمة المرور غير صحيحة"), 401);
  }
  setCookie(c, COOKIE, password, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return c.redirect("/admin");
});

adminRouter.get("/logout", (c) => {
  deleteCookie(c, COOKIE, { path: "/" });
  return c.redirect("/admin/login");
});

// ── Overview ─────────────────────────────────────────────────────
adminRouter.get("/", async (c) => {
  const sb = getSupabaseAdmin()!;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const count = async (table: string, col?: string, val?: string) => {
    let q = sb.from(table).select("*", { count: "exact", head: true });
    if (col && val) q = q.eq(col, val);
    const { count } = await q;
    return count ?? 0;
  };

  const [totalOrders, totalSearches] = await Promise.all([
    count("orders"),
    count("search_events"),
  ]);
  const recentSearches =
    (
      await sb
        .from("search_events")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since)
    ).count ?? 0;

  const statusCounts: Record<string, number> = {};
  await Promise.all(
    STATUSES.map(async (s) => {
      statusCounts[s.value] = await count("orders", "status", s.value);
    })
  );

  let usersCount = 0;
  try {
    const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
    usersCount = data?.users?.length ?? 0;
  } catch {
    usersCount = 0;
  }

  const body = `
    <h1>نظرة عامة</h1>
    <div class="grid cards">
      <div class="card"><div class="lbl">إجمالي الطلبات</div><div class="val">${fmtNum(totalOrders)}</div></div>
      <div class="card"><div class="lbl">طلبات جديدة</div><div class="val">${fmtNum(statusCounts["new"])}</div><div class="hint">بانتظار المراجعة</div></div>
      <div class="card"><div class="lbl">المستخدمون</div><div class="val">${fmtNum(usersCount)}</div></div>
      <div class="card"><div class="lbl">عمليات البحث</div><div class="val">${fmtNum(totalSearches)}</div><div class="hint">${fmtNum(recentSearches)} خلال 7 أيام</div></div>
    </div>
    <h1 style="font-size:18px;margin-top:28px">الطلبات حسب الحالة</h1>
    <div class="grid cards">
      ${STATUSES.map(
        (s) =>
          `<div class="card" style="text-align:center"><span class="pill" style="background:${s.color}">${s.label}</span><div class="val">${fmtNum(statusCounts[s.value])}</div></div>`
      ).join("")}
    </div>`;
  return c.html(layout("overview", body));
});

// ── Orders ───────────────────────────────────────────────────────
adminRouter.get("/orders", async (c) => {
  const sb = getSupabaseAdmin()!;
  const active = c.req.query("status") ?? "all";
  let q = sb
    .from("orders")
    .select(
      "id, customer_phone, status, total_items, note, created_at, order_items(*)"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (active !== "all") q = q.eq("status", active);
  const { data } = await q;
  const orders = (data ?? []) as Array<{
    id: string;
    customer_phone: string | null;
    status: string;
    total_items: number;
    note: string | null;
    created_at: string;
    order_items: Array<{
      id: string;
      title: string;
      price_text: string | null;
      quantity: number;
      url: string | null;
      image: string | null;
      platform: string | null;
      variant_title: string | null;
    }>;
  }>;

  const tabs = [{ value: "all", label: "الكل" }, ...STATUSES];
  const tabsHtml = tabs
    .map(
      (t) =>
        `<a class="${active === t.value ? "active" : ""}" href="/admin/orders${t.value === "all" ? "" : `?status=${t.value}`}">${t.label}</a>`
    )
    .join("");

  const ordersHtml = orders.length
    ? orders
        .map((o) => {
          const meta = statusMeta(o.status);
          const items = (o.order_items ?? [])
            .map(
              (it) => `
              <div class="item">
                ${it.image ? `<img src="${esc(it.image)}" alt="" />` : `<div class="item-img" style="width:60px;height:60px;border-radius:8px;background:#e5e7eb;display:flex;align-items:center;justify-content:center">🛍</div>`}
                <div style="flex:1">
                  <div style="font-size:14px;font-weight:500">${esc(it.title)}</div>
                  ${it.variant_title ? `<div class="muted">${esc(it.variant_title)}</div>` : ""}
                  <div style="margin-top:4px;font-size:13px">
                    <b style="color:#1A8C4E">${esc(it.price_text ?? "—")}</b>
                    <span class="muted">×${it.quantity}</span>
                    ${it.platform ? `<span class="muted">${esc(it.platform)}</span>` : ""}
                    ${it.url ? `<a href="${esc(it.url)}" target="_blank" rel="noreferrer" style="color:#2563eb">الرابط</a>` : ""}
                  </div>
                </div>
              </div>`
            )
            .join("");
          const options = STATUSES.map(
            (s) =>
              `<option value="${s.value}" ${s.value === o.status ? "selected" : ""}>${s.label}</option>`
          ).join("");
          return `
          <div class="order">
            <div class="top">
              <div>
                <span class="pill" style="background:${meta.color}">${meta.label}</span>
                <span class="muted">#${esc(o.id.slice(0, 8))}</span>
                <div style="font-weight:600;margin-top:6px">${esc(o.customer_phone ?? "زبون غير مسجّل")}</div>
                <div class="muted">${fmtDate(o.created_at)}</div>
              </div>
              <form method="post" action="/admin/orders/status" style="display:flex;gap:8px;align-items:center">
                <input type="hidden" name="id" value="${esc(o.id)}" />
                <input type="hidden" name="status_filter" value="${esc(active)}" />
                <span class="pill" style="background:#f3f4f6;color:#131921">${o.total_items} قطعة</span>
                <select name="status" onchange="this.form.submit()">${options}</select>
                <noscript><button class="btn btn-sm" type="submit">حفظ</button></noscript>
              </form>
            </div>
            <details>
              <summary>عرض المنتجات (${(o.order_items ?? []).length})</summary>
              ${items}
              ${o.note ? `<div style="margin-top:10px" class="muted">ملاحظة: ${esc(o.note)}</div>` : ""}
              <form method="post" action="/admin/orders/delete" style="margin-top:10px" onsubmit="return confirm('حذف هذا الطلب نهائياً؟')">
                <input type="hidden" name="id" value="${esc(o.id)}" />
                <input type="hidden" name="status_filter" value="${esc(active)}" />
                <button type="submit" style="background:none;border:none;color:#dc2626;font-weight:600;cursor:pointer;font-size:13px">حذف الطلب</button>
              </form>
            </details>
          </div>`;
        })
        .join("")
    : `<div class="empty">لا توجد طلبات</div>`;

  const body = `
    <h1>الطلبات</h1>
    <div class="tabs">${tabsHtml}</div>
    ${ordersHtml}`;
  return c.html(layout("orders", body));
});

adminRouter.post("/orders/status", async (c) => {
  const sb = getSupabaseAdmin()!;
  const body = await c.req.parseBody();
  const id = String(body.id ?? "");
  const status = String(body.status ?? "");
  const filter = String(body.status_filter ?? "all");
  if (id && STATUSES.some((s) => s.value === status)) {
    await sb.from("orders").update({ status }).eq("id", id);
  }
  return c.redirect(`/admin/orders${filter === "all" ? "" : `?status=${filter}`}`);
});

adminRouter.post("/orders/delete", async (c) => {
  const sb = getSupabaseAdmin()!;
  const body = await c.req.parseBody();
  const id = String(body.id ?? "");
  const filter = String(body.status_filter ?? "all");
  if (id) await sb.from("orders").delete().eq("id", id);
  return c.redirect(`/admin/orders${filter === "all" ? "" : `?status=${filter}`}`);
});

// ── Pricing ──────────────────────────────────────────────────────
adminRouter.get("/pricing", async (c) => {
  const sb = getSupabaseAdmin()!;
  const { data } = await sb
    .from("settings")
    .select("key, value, description")
    .order("key");
  const rows = (data ?? []) as Array<{
    key: string;
    value: number;
    description: string | null;
  }>;
  const byKey = new Map(rows.map((r) => [r.key, r]));

  const groups = [
    { title: "أسعار الصرف والهامش (أمريكا)", keys: ["usd_to_iqd", "iqd_markup"] },
    {
      title: "أسعار الصرف والشحن (الصين)",
      keys: ["cny_to_usd", "usd_to_iqd_china", "china_shipping_per_kg"],
    },
    {
      title: "أسعار الشحن (دينار)",
      keys: [
        "shipping_regular_per_lb",
        "shipping_perfume_flat",
        "shipping_hazardous_flat",
        "shipping_supplement_per_lb",
        "shipping_supplement_tax",
        "shipping_mobile_flat",
        "shipping_laptop_flat",
      ],
    },
  ];

  const saved = c.req.query("saved") === "1";
  const groupsHtml = groups
    .map((g) => {
      const fields = g.keys
        .map((k) => {
          const r = byKey.get(k);
          if (!r) return "";
          return `<div class="field"><label>${esc(r.description ?? k)}</label><input type="number" step="any" name="${esc(k)}" value="${esc(r.value)}" /></div>`;
        })
        .join("");
      return `<div class="group"><h3>${g.title}</h3><div class="row">${fields}</div></div>`;
    })
    .join("");

  const body = `
    <h1>الأسعار</h1>
    <p class="muted" style="margin-top:-12px;margin-bottom:18px">تحكّم بأسعار الصرف وهوامش الربح وأسعار الشحن المستخدمة في حساب السعر النهائي.</p>
    ${saved ? `<div class="ok" style="margin-bottom:14px">تم الحفظ بنجاح ✓</div>` : ""}
    <form method="post" action="/admin/pricing">
      ${groupsHtml}
      <button class="btn" type="submit">حفظ التغييرات</button>
      <p class="muted" style="margin-top:12px">تُطبّق التغييرات على الأسعار خلال دقيقة واحدة كحد أقصى (بسبب التخزين المؤقت).</p>
    </form>`;
  return c.html(layout("pricing", body));
});

adminRouter.post("/pricing", async (c) => {
  const sb = getSupabaseAdmin()!;
  const body = await c.req.parseBody();
  const rows = Object.entries(body)
    .map(([key, raw]) => ({ key, value: parseFloat(String(raw)) }))
    .filter((r) => !isNaN(r.value))
    .map((r) => ({ ...r, updated_at: new Date().toISOString() }));
  if (rows.length) {
    await sb.from("settings").upsert(rows, { onConflict: "key" });
  }
  return c.redirect("/admin/pricing?saved=1");
});

// ── Users ────────────────────────────────────────────────────────
adminRouter.get("/users", async (c) => {
  const sb = getSupabaseAdmin()!;
  let users: Array<{
    id: string;
    phone: string;
    created_at: string;
    last_sign_in_at: string | null;
  }> = [];
  try {
    const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
    users = (data?.users ?? []).map((u) => ({
      id: u.id,
      phone:
        (u.user_metadata?.phone as string) ??
        u.phone ??
        u.email?.replace(/@.*/, "") ??
        "—",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    }));
  } catch {
    users = [];
  }

  const rowsHtml = users.length
    ? users
        .map(
          (u) =>
            `<tr><td class="ltr" style="font-weight:600">${esc(u.phone)}</td><td class="muted">${fmtDate(u.created_at)}</td><td class="muted">${fmtDate(u.last_sign_in_at)}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="3" style="text-align:center;color:#9ca3af;padding:40px">لا يوجد مستخدمون</td></tr>`;

  const body = `
    <h1>المستخدمون <span class="muted" style="font-size:14px">(${fmtNum(users.length)})</span></h1>
    <table>
      <thead><tr><th>رقم الهاتف</th><th>تاريخ التسجيل</th><th>آخر دخول</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>`;
  return c.html(layout("users", body));
});
