# دليل تسليم المطور — BoxCargo

## معلومات التطبيق
- **اسم التطبيق:** BoxCargo
- **Bundle ID (iOS):** com.boxshipiq.boxcargo
- **Package (Android):** com.boxshipiq.boxcargo
- **الإصدار:** 1.0.0

---

## ✅ ما هو جاهز في المجلد
جميع المفاتيح والبيانات موجودة بالفعل في الملفات:
- `mobile/.env` — مفاتيح Supabase للتطبيق
- `backend/.env` — مفاتيح SerpAPI و OpenAI و Supabase للخادم

**⚠️ تحذير مهم:** هذه الملفات تحتوي على مفاتيح سرية — لا تشاركها مع أي شخص غير موثوق ولا ترفعها على GitHub عام.

---

## ما يحتاجه المطور فقط

### 1. حساب المطور (ضروري للنشر)
- **Apple Developer Program** (للـ iPhone): https://developer.apple.com — رسوم **99$ سنوياً**
- **Google Play Console** (للـ Android): https://play.google.com/console — رسوم **25$ مرة واحدة**

### 2. تحديث eas.json بعد إنشاء الحسابات
يجب تعديل هذه القيم في `mobile/eas.json`:
```
appleId        → البريد الإلكتروني لحساب Apple Developer
ascAppId       → App ID من App Store Connect
appleTeamId    → Team ID من Apple Developer
google-play-service-account.json → ملف من Google Play Console
```

---

## خطوات البناء والنشر

### تثبيت الأدوات
```bash
npm install -g eas-cli
cd mobile
npm install
eas login
```

### بناء ونشر iOS
```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

### بناء ونشر Android
```bash
eas build --platform android --profile production
eas submit --platform android --profile production
```

---

## نشر الخادم (Backend)
الخادم في مجلد `backend/` ويعمل بـ Bun + Hono.
يمكن نشره على أي منصة تدعم Node.js/Bun مثل:
- Railway.app
- Render.com
- Fly.io

بعد النشر، يجب تحديث `EXPO_PUBLIC_BACKEND_URL` في `mobile/.env` برابط الخادم الجديد.
