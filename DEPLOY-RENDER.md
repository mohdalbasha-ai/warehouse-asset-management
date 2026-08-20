# نشر نظام إدارة المستودعات على Render

## الطريقة الأسهل
1. ارفع مجلد `warehouse-system` إلى GitHub.
2. في Render اختر **New > Blueprint**.
3. اختر مستودع GitHub الذي يحتوي على `render.yaml`.
4. اضغط **Apply**.
5. سيتم إنشاء Backend + Frontend + PostgreSQL.

## تسجيل الدخول التجريبي
- Username: `admin`
- Password: `ChangeMe@123`

غيّر كلمة المرور فورًا عند استخدام النظام فعليًا.

## ملاحظة
الـ Backend يستخدم Prisma ويقوم عند بدء الخدمة بتنفيذ `prisma db push` ثم seed.
هذا مناسب للتجربة الأولية. في بيئة الإنتاج الحقيقية يفضّل استخدام migrations منفصلة.
