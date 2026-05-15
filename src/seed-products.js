// Script to create products table and seed data in Supabase
// Run with: node src/seed-products.js

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://wlzwtsvvvzlprlmzukks.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsend0c3Z2dnpscHJsbXp1a2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNzc0MzYsImV4cCI6MjA5Mjg1MzQzNn0.1LlRBp6V2FY2kqtqJ-rFqQTtfnq8b2MeTd8KQRSALBQ'
)

const products = [
  {
    name: 'سماعات بلوتوث لاسلكية',
    description: 'سماعات لاسلكية عالية الجودة مع إلغاء الضوضاء وبطارية تدوم 24 ساعة. صوت نقي وباس عميق.',
    price: 45000,
    old_price: 65000,
    discount: 30,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
    category: 'إلكترونيات',
    brand: 'Sony',
    stock: 50,
    sold: 120,
    is_available: true,
    is_featured: true,
  },
  {
    name: 'ساعة ذكية رياضية',
    description: 'ساعة ذكية مقاومة للماء مع مراقب نبض القلب وتتبع اللياقة البدنية. شاشة AMOLED.',
    price: 85000,
    old_price: 120000,
    discount: 29,
    image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500',
    category: 'إلكترونيات',
    brand: 'Samsung',
    stock: 30,
    sold: 85,
    is_available: true,
    is_featured: true,
  },
  {
    name: 'حقيبة ظهر جلد طبيعي',
    description: 'حقيبة ظهر أنيقة من الجلد الطبيعي مناسبة للعمل والسفر. تصميم عصري مع جيوب متعددة.',
    price: 55000,
    old_price: 75000,
    discount: 27,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
    category: 'حقائب',
    brand: 'Zara',
    stock: 25,
    sold: 60,
    is_available: true,
    is_featured: true,
  },
  {
    name: 'عطر فاخر رجالي',
    description: 'عطر رجالي فاخر بتركيبة فريدة من العود والمسك. يدوم طوال اليوم.',
    price: 95000,
    old_price: 130000,
    discount: 27,
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=500',
    category: 'عطور',
    brand: 'Dior',
    stock: 40,
    sold: 200,
    is_available: true,
    is_featured: true,
  },
  {
    name: 'حذاء رياضي Nike Air',
    description: 'حذاء رياضي مريح للجري والتمارين اليومية. تقنية Air Max لامتصاص الصدمات.',
    price: 125000,
    old_price: 160000,
    discount: 22,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
    category: 'أحذية',
    brand: 'Nike',
    stock: 35,
    sold: 150,
    is_available: true,
    is_featured: true,
  },
  {
    name: 'كريم عناية بالبشرة',
    description: 'كريم مرطب للوجه بالهيالورونيك أسيد وفيتامين C. يفتح البشرة ويرطبها بعمق.',
    price: 25000,
    old_price: 35000,
    discount: 29,
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500',
    category: 'جمال',
    brand: 'CeraVe',
    stock: 100,
    sold: 300,
    is_available: true,
    is_featured: false,
  },
  {
    name: 'نظارة شمسية Ray-Ban',
    description: 'نظارة شمسية كلاسيكية بعدسات بولارايزد لحماية كاملة من الأشعة فوق البنفسجية.',
    price: 75000,
    old_price: 95000,
    discount: 21,
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500',
    category: 'إكسسوارات',
    brand: 'Ray-Ban',
    stock: 20,
    sold: 45,
    is_available: true,
    is_featured: false,
  },
  {
    name: 'سوار ذهبي أنيق',
    description: 'سوار ذهبي عيار 18 بتصميم إيطالي أنيق. مناسب للمناسبات والاستخدام اليومي.',
    price: 180000,
    old_price: 220000,
    discount: 18,
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500',
    category: 'إكسسوارات',
    brand: 'Cartier',
    stock: 10,
    sold: 25,
    is_available: true,
    is_featured: true,
  },
  {
    name: 'قميص كتان صيفي',
    description: 'قميص كتان خفيف ومريح للصيف. تصميم كاجوال أنيق بألوان متعددة.',
    price: 35000,
    old_price: 50000,
    discount: 30,
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500',
    category: 'ملابس',
    brand: 'H&M',
    stock: 80,
    sold: 90,
    is_available: true,
    is_featured: false,
  },
  {
    name: 'شاحن لاسلكي سريع',
    description: 'شاحن لاسلكي 15W يدعم الشحن السريع لجميع الأجهزة. تصميم أنيق ومضاد للانزلاق.',
    price: 18000,
    old_price: 25000,
    discount: 28,
    image: 'https://images.unsplash.com/photo-1591815302525-756a9bcc3425?w=500',
    category: 'إلكترونيات',
    brand: 'Anker',
    stock: 60,
    sold: 180,
    is_available: true,
    is_featured: false,
  },
  {
    name: 'حقيبة يد نسائية',
    description: 'حقيبة يد نسائية أنيقة بتصميم عصري. جلد صناعي عالي الجودة مع حزام كتف قابل للتعديل.',
    price: 65000,
    old_price: 85000,
    discount: 24,
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500',
    category: 'حقائب',
    brand: 'Michael Kors',
    stock: 15,
    sold: 55,
    is_available: true,
    is_featured: true,
  },
  {
    name: 'مكبر صوت بلوتوث محمول',
    description: 'مكبر صوت محمول مقاوم للماء مع بطارية 12 ساعة. صوت 360 درجة قوي ونقي.',
    price: 38000,
    old_price: 52000,
    discount: 27,
    image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500',
    category: 'إلكترونيات',
    brand: 'JBL',
    stock: 45,
    sold: 110,
    is_available: true,
    is_featured: false,
  },
]

async function seed() {
  console.log('🔄 Attempting to insert products...')
  
  const { data, error } = await supabase
    .from('products')
    .insert(products)
    .select()

  if (error) {
    console.log('❌ Error:', error.message)
    console.log('')
    console.log('⚠️  You need to create the "products" table in Supabase first!')
    console.log('Go to https://supabase.com/dashboard → SQL Editor → Run this:')
    console.log('')
    console.log(`
CREATE TABLE products (
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

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Public read" ON products FOR SELECT USING (true);

-- Allow authenticated insert/update
CREATE POLICY "Admin insert" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin update" ON products FOR UPDATE USING (true);
`)
    console.log('')
    console.log('After creating the table, run this script again.')
  } else {
    console.log(`✅ Successfully inserted ${data.length} products!`)
    data.forEach(p => console.log(`  📦 ${p.name} - ${p.price} د.ع`))
  }
}

seed()
