-- =============================================
-- SQL لإنشاء الجداول المطلوبة في Supabase
-- انسخ هذا الكود والصقه في SQL Editor في لوحة Supabase
-- https://supabase.com/dashboard → SQL Editor → New Query
-- =============================================

-- 1. جدول المنتجات
CREATE TABLE IF NOT EXISTS products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  old_price numeric DEFAULT 0,
  discount integer DEFAULT 0,
  image text,
  images text[] DEFAULT '{}',
  category text,
  brand text,
  stock integer DEFAULT 0,
  sold integer DEFAULT 0,
  is_available boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 2. جدول طلبات المتجر المحلي
CREATE TABLE IF NOT EXISTS store_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_city text,
  customer_address text,
  notes text,
  total_iqd numeric DEFAULT 0,
  items_count integer DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- 3. جدول عناصر الطلبات
CREATE TABLE IF NOT EXISTS store_order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES store_orders(id) ON DELETE CASCADE,
  product_id uuid,
  title text,
  image text,
  price numeric DEFAULT 0,
  qty integer DEFAULT 1,
  category text,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- تفعيل RLS (Row Level Security)
-- =============================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_order_items ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول - قراءة عامة للمنتجات
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public insert products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update products" ON products FOR UPDATE USING (true);

-- سياسات الطلبات - إدخال عام + قراءة عامة
CREATE POLICY "Public insert orders" ON store_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read orders" ON store_orders FOR SELECT USING (true);
CREATE POLICY "Public update orders" ON store_orders FOR UPDATE USING (true);

CREATE POLICY "Public insert order items" ON store_order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read order items" ON store_order_items FOR SELECT USING (true);

-- =============================================
-- تم! الآن شغّل: node src/seed-products.js
-- =============================================
