# عقاري - Aqari
نظام إدارة العقارات - كراء وبيع الشقق والفيلات والأراضي

## للتشغيل المحلي
```bash
npm install
npx prisma db push
npm run dev
```

## متغيرات البيئة (.env.local)
```
DATABASE_URL="file:./db/custom.db"

# لتفعيل رفع الوسائط (Cloudinary - مجاني 25GB)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

## إنشاء حساب Cloudinary مجاني
1. اذهب إلى https://cloudinary.com وإنشاء حساب مجاني
2. من Settings → Upload → Upload Presets → Add Upload Preset
3. سمّه مثلاً "aqari_uploads"
4. Signing Mode: Unsigned
5. ضع القيم في `.env.local`