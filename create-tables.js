import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://wlzwtsvvvzlprlmzukks.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsend0c3Z2dnpscHJsbXp1a2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNzc0MzYsImV4cCI6MjA5Mjg1MzQzNn0.1LlRBp6V2FY2kqtqJ-rFqQTtfnq8b2MeTd8KQRSALBQ'
)

// Try to create tables using REST API insert approach
// If table doesn't exist, we'll get a specific error

async function main() {
  console.log('Testing if products table exists...')
  const { error } = await supabase.from('products').select('id').limit(1)
  
  if (error && error.message.includes('Could not find')) {
    console.log('')
    console.log('❌ جدول products غير موجود.')
    console.log('')
    console.log('═══════════════════════════════════════════════════════')
    console.log('  📋 يجب إنشاء الجداول في Supabase يدوياً:')
    console.log('═══════════════════════════════════════════════════════')
    console.log('')
    console.log('  1. افتح: https://supabase.com/dashboard')
    console.log('  2. اختر مشروعك')
    console.log('  3. اذهب إلى SQL Editor')
    console.log('  4. انسخ محتوى الملف: src/setup-supabase.sql')
    console.log('  5. الصقه في SQL Editor واضغط Run')
    console.log('')
    console.log('  بعدها شغّل: node src/seed-products.js')
    console.log('═══════════════════════════════════════════════════════')
  } else if (!error) {
    console.log('✅ جدول products موجود!')
    console.log('جاري إضافة المنتجات...')
    await seedProducts()
  } else {
    console.log('Error:', error.message)
  }
}

async function seedProducts() {
  const products = [
    { name: 'سماعات بلوتوث لاسلكية', description: 'سماعات لاسلكية عالية الجودة مع إلغاء الضوضاء وبطارية تدوم 24 ساعة.', price: 45000, old_price: 65000, discount: 30, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500', category: 'إلكترونيات', brand: 'Sony', stock: 50, sold: 120, is_available: true, is_featured: true },
    { name: 'ساعة ذكية رياضية', description: 'ساعة ذكية مقاومة للماء مع مراقب نبض القلب. شاشة AMOLED.', price: 85000, old_price: 120000, discount: 29, image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500', category: 'إلكترونيات', brand: 'Samsung', stock: 30, sold: 85, is_available: true, is_featured: true },
    { name: 'حقيبة ظهر جلد طبيعي', description: 'حقيبة ظهر أنيقة من الجلد الطبيعي مناسبة للعمل والسفر.', price: 55000, old_price: 75000, discount: 27, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500', category: 'حقائب', brand: 'Zara', stock: 25, sold: 60, is_available: true, is_featured: true },
    { name: 'عطر فاخر رجالي', description: 'عطر رجالي فاخر بتركيبة فريدة من العود والمسك. يدوم طوال اليوم.', price: 95000, old_price: 130000, discount: 27, image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=500', category: 'عطور', brand: 'Dior', stock: 40, sold: 200, is_available: true, is_featured: true },
    { name: 'حذاء رياضي Nike Air', description: 'حذاء رياضي مريح للجري. تقنية Air Max لامتصاص الصدمات.', price: 125000, old_price: 160000, discount: 22, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', category: 'أحذية', brand: 'Nike', stock: 35, sold: 150, is_available: true, is_featured: true },
    { name: 'كريم عناية بالبشرة', description: 'كريم مرطب للوجه بالهيالورونيك أسيد وفيتامين C.', price: 25000, old_price: 35000, discount: 29, image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500', category: 'جمال', brand: 'CeraVe', stock: 100, sold: 300, is_available: true, is_featured: false },
    { name: 'نظارة شمسية Ray-Ban', description: 'نظارة شمسية كلاسيكية بعدسات بولارايزد.', price: 75000, old_price: 95000, discount: 21, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500', category: 'إكسسوارات', brand: 'Ray-Ban', stock: 20, sold: 45, is_available: true, is_featured: false },
    { name: 'سوار ذهبي أنيق', description: 'سوار ذهبي عيار 18 بتصميم إيطالي أنيق.', price: 180000, old_price: 220000, discount: 18, image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500', category: 'إكسسوارات', brand: 'Cartier', stock: 10, sold: 25, is_available: true, is_featured: true },
    { name: 'قميص كتان صيفي', description: 'قميص كتان خفيف ومريح للصيف. تصميم كاجوال أنيق.', price: 35000, old_price: 50000, discount: 30, image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500', category: 'ملابس', brand: 'H&M', stock: 80, sold: 90, is_available: true, is_featured: false },
    { name: 'شاحن لاسلكي سريع', description: 'شاحن لاسلكي 15W يدعم الشحن السريع لجميع الأجهزة.', price: 18000, old_price: 25000, discount: 28, image: 'https://images.unsplash.com/photo-1591815302525-756a9bcc3425?w=500', category: 'إلكترونيات', brand: 'Anker', stock: 60, sold: 180, is_available: true, is_featured: false },
    { name: 'حقيبة يد نسائية', description: 'حقيبة يد نسائية أنيقة بتصميم عصري.', price: 65000, old_price: 85000, discount: 24, image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500', category: 'حقائب', brand: 'Michael Kors', stock: 15, sold: 55, is_available: true, is_featured: true },
    { name: 'مكبر صوت بلوتوث JBL', description: 'مكبر صوت محمول مقاوم للماء مع بطارية 12 ساعة.', price: 38000, old_price: 52000, discount: 27, image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500', category: 'إلكترونيات', brand: 'JBL', stock: 45, sold: 110, is_available: true, is_featured: false },
  ]

  const { data, error } = await supabase.from('products').insert(products).select()
  if (error) {
    console.log('❌ Error inserting:', error.message)
  } else {
    console.log(`✅ تم إضافة ${data.length} منتج بنجاح!`)
    data.forEach(p => console.log(`  📦 ${p.name} — ${p.price} د.ع`))
  }
}

main()
