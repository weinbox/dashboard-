# لوحة تحكم Box Global

لوحة إدارة منفصلة (Next.js) لإدارة الطلبات والأسعار والإحصائيات والمستخدمين.
**غير مرتبطة بتطبيق الموبايل** وتُنشر على رابط خاص.

## المتطلبات

أنشئ ملف `.env.local` (انسخ من `.env.example`) وعبّئ القيم:

```
SUPABASE_URL=https://wlzwtsvvvzlprlmzukks.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<مفتاح service_role من Supabase>
ADMIN_PASSWORD=<كلمة مرور قوية للدخول>
```

> مفتاح `service_role` تجده في: Supabase Dashboard → Project Settings → API → service_role secret.
> هذا المفتاح سري للغاية ويُستخدم على الخادم فقط.

## التشغيل محلياً

```bash
npm install
npm run dev
```

ثم افتح http://localhost:3001

## قبل أول استخدام

شغّل سكربت قاعدة البيانات `../supabase/sql/dashboard_schema.sql` في محرر SQL في Supabase.

## الصفحات

- **نظرة عامة** — إحصائيات الطلبات والمستخدمين والبحث
- **الطلبات** — عرض الطلبات، تصفية حسب الحالة، تغيير الحالة، حذف
- **الأسعار** — تعديل أسعار الصرف وهوامش الربح وأسعار الشحن (تُطبّق على الباكند خلال دقيقة)
- **المستخدمون** — قائمة المستخدمين المسجّلين

## النشر

يُنشر كتطبيق Next.js (Netlify / Vercel). تأكد من ضبط متغيرات البيئة الثلاثة في إعدادات المنصة.
