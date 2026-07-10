---
Task ID: 1
Agent: main
Task: مراجعة شاملة للمشروع وإصلاح مشكلة فشل إضافة العقار

Work Log:
- استكشاف هيكل المشروع الكامل (API routes, components, hooks, contexts)
- قراءة جميع الملفات الرئيسية: db.ts, property-form.tsx, page.tsx, app-shell.tsx, agent-context.tsx
- اختبار API عبر curl - يعمل بنجاح مع payloads صغيرة
- اكتشاف أن السيرفر يعمل بوضع التطوير (next dev) غير المستقر
- اكتشاف أن السيرفر ينهار عند استقبال payloads كبيرة (base64 images في JSON)
- تغيير معمارية رفع الملفات: من base64 مضمّن في JSON إلى رفع منفصل عبر /api/upload
- إنشاء /api/upload/route.ts لرفع الملفات إلى القرص
- إنشاء /api/files/[...path]/route.ts لخدمة الملفات المرفوعة
- تحديث property-form.tsx لاستخدام رفع الملفات المنفصل
- تحسين page.tsx: QueryClient داخل المكون بدلاً من خارجه
- تحسين API route: dynamic = 'force-dynamic', logging أفضل, timeout في fetch
- إعادة البناء والاختبار الشامل

Stage Summary:
- الجذر الحقيقي: payload كبير (base64 images) يسبب انهيار السيرفر + عدم استقرار وضع التطوير
- الحل: فصل رفع الملفات عن إنشاء العقار + التحويل لوضع الإنتاج
- الملفات المعدلة: property-form.tsx, page.tsx, next.config.ts, start-server.sh
- الملفات الجديدة: upload/route.ts, files/[...path]/route.ts
- بناء الإنتاج ناجح، جميع الاختبارات通过的 (بدون صور، مع صور، رفع، خدمة ملفات)
