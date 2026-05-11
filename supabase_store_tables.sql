-- ============================================
-- جداول المتجر الإلكتروني — افرزلي
-- نفّذ هذا في Supabase SQL Editor
-- ============================================

-- 1. جدول المتاجر
CREATE TABLE IF NOT EXISTS stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  logo TEXT,
  description TEXT,
  delivery_price NUMERIC DEFAULT 5000,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. جدول المنتجات
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  image TEXT,
  price NUMERIC NOT NULL,
  description TEXT,
  stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. جدول طلبات المتجر
CREATE TABLE IF NOT EXISTS store_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  city TEXT,
  region TEXT,
  address TEXT,
  total NUMERIC DEFAULT 0,
  delivery_price NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. جدول عناصر الطلب
CREATE TABLE IF NOT EXISTS store_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES store_orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  quantity INTEGER DEFAULT 1
);

-- 5. إضافة عمود التصميم (theme) للمتاجر الموجودة
-- نفّذ هذا الأمر في SQL Editor:
-- ALTER TABLE stores ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'minimal';

-- 6. إضافة أعمدة جديدة
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price NUMERIC;

-- 7. جدول الكوبونات
CREATE TABLE IF NOT EXISTS store_coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  discount_type TEXT DEFAULT 'fixed', -- 'fixed' or 'percent'
  discount_value NUMERIC NOT NULL,
  min_order NUMERIC DEFAULT 0,
  max_uses INTEGER DEFAULT 0, -- 0 = unlimited
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupons_store ON store_coupons(store_id);
ALTER TABLE store_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_coupons" ON store_coupons FOR SELECT USING (true);
CREATE POLICY "manage_coupons" ON store_coupons FOR ALL USING (true) WITH CHECK (true);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_store ON store_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_store_order_items_order ON store_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_username ON stores(username);

-- تفعيل RLS
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_order_items ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول العامة (anon يقدر يقرأ ويكتب)
CREATE POLICY "public_read_stores" ON stores FOR SELECT USING (true);
CREATE POLICY "public_read_products" ON products FOR SELECT USING (true);
CREATE POLICY "public_insert_orders" ON store_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "public_read_orders" ON store_orders FOR SELECT USING (true);
CREATE POLICY "public_update_orders" ON store_orders FOR UPDATE USING (true);
CREATE POLICY "public_insert_order_items" ON store_order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "public_read_order_items" ON store_order_items FOR SELECT USING (true);

-- سياسات إدارة المنتجات والمتاجر
CREATE POLICY "manage_products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "manage_stores" ON stores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "manage_order_items" ON store_order_items FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 8. جدول البانرات (السلايدر)
-- ============================================
CREATE TABLE IF NOT EXISTS store_banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  image TEXT,
  title TEXT,
  subtitle TEXT,
  bg_color TEXT DEFAULT '#10b981',
  bg_gradient TEXT DEFAULT 'from-emerald-500 to-teal-600',
  text_color TEXT DEFAULT '#ffffff',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_banners_store ON store_banners(store_id);
ALTER TABLE store_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_banners" ON store_banners FOR SELECT USING (true);
CREATE POLICY "manage_banners" ON store_banners FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 9. جدول طلبات الصين
-- ============================================
CREATE TABLE IF NOT EXISTS china_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_city TEXT,
  customer_address TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  total_cny NUMERIC DEFAULT 0,
  total_usd NUMERIC DEFAULT 0,
  total_iqd NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS china_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES china_orders(id) ON DELETE CASCADE NOT NULL,
  product_id TEXT NOT NULL,
  title TEXT,
  image TEXT,
  price_cny NUMERIC DEFAULT 0,
  price_usd NUMERIC DEFAULT 0,
  price_iqd NUMERIC DEFAULT 0,
  qty INTEGER DEFAULT 1,
  provider TEXT,
  product_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE china_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE china_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_china_orders" ON china_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_china_items" ON china_order_items FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 10. إصلاح سياسات Storage (رفع الصور والشعارات)
-- ⚠️ نفّذ هذا في Supabase SQL Editor
-- ============================================

-- جعل الـ bucket عام (public) حتى تظهر الصور
UPDATE storage.buckets SET public = true WHERE id = 'order-images';

-- السماح لأي شخص برفع ملفات
CREATE POLICY "allow_public_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'order-images');

-- السماح لأي شخص بقراءة الملفات
CREATE POLICY "allow_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'order-images');

-- السماح بتحديث الملفات (upsert)
CREATE POLICY "allow_public_update" ON storage.objects FOR UPDATE USING (bucket_id = 'order-images');
