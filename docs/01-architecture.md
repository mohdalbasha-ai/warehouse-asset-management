# Warehouse & Asset Management System — Architecture

## 1. نظرة عامة
نظام مؤسسي متكامل لإدارة المستودعات، الأجهزة، العقود، الصيانة، الضمان، المستخدمين والصلاحيات.

## 2. Stack التقني (مفترض — قابل للتغيير)
| الطبقة | التقنية | السبب |
|---|---|---|
| Backend | Node.js + TypeScript + Express | نضج، سهولة التوسع، توفر مكتبات |
| ORM | Prisma | Type-safety، Migrations، علاقات واضحة |
| Database | PostgreSQL | Relational قوي، يدعم Transactions وConstraints بشكل ممتاز |
| Auth | JWT (access + refresh) + bcrypt | معياري وآمن |
| Frontend | React + TypeScript + Tailwind | حديث، RTL/LTR سهل، Responsive |
| File Storage | Local disk / S3-compatible (قابل للتبديل) | للمرفقات |
| Validation | Zod | Type-safe validation على مستوى API |
| Testing | Vitest + Supertest | اختبارات Unit + Integration |

## 3. الطبقات المعمارية (Layered Architecture)
```
Client (React) 
   ↓ HTTPS
API Layer (Express Routes)
   ↓
Validation Layer (Zod schemas)
   ↓
Authorization Layer (RBAC middleware — Department/Center/Warehouse scoped)
   ↓
Service / Business Logic Layer  ← منطق مثل حساب التأخير، حالات الجهاز، دورة الصيانة
   ↓
Repository Layer (Prisma Client)
   ↓
PostgreSQL Database
```

كل عملية حساسة (صرف، توريد، مناقلة، تسليم/استلام جهاز) تمر عبر **Prisma Transaction** لضمان عدم حفظ جزء من العملية عند الفشل.

## 4. مبدأ الـ Audit Log
كل تعديل على الجداول الحساسة (Contracts, Devices, StockTransactions, Users, Permissions...) يُسجَّل عبر Middleware مركزي يلتقط:
`user, action, entity, entityId, oldData (JSON), newData (JSON), ip, timestamp`.

## 5. مبدأ الحالة بدل الحذف (Soft State)
لا حذف فعلي (Hard Delete) للسجلات المرتبطة بعمليات؛ كل كيان له حقل `status` (Active/Inactive/Cancelled/Expired...) والتاريخ يُحفظ عبر جداول الحركات (Movements/Assignments/StockTransactions) وليس بالتعديل المباشر على السجل الأساسي.

## 6. نطاق الصلاحيات (Scoped RBAC)
الصلاحية = `(Role, Action, Resource) + (Department? , Center? , Warehouse?)`.
عند كل طلب API، الـ Middleware يتحقق:
1. هل يملك المستخدم Role يمنحه Action على Resource؟
2. هل النطاق (Department/Center/Warehouse) الخاص بالسجل ضمن النطاقات المسموحة للمستخدم؟

## 7. خطة البناء التدريجي (Module by Module)
1. **Foundation**: Database schema كامل + Auth + RBAC base
2. **Org Structure**: Departments, Centers, Warehouses, Employees (+ نقل الموظف مع History)
3. **Items & Inventory**: Items, StockTransactions (توريد/صرف/مرتجع/مناقلة) + حساب الرصيد
4. **Devices**: Devices + DeviceAssignments (تسليم/إرجاع) + دورة الحالة
5. **Contracts & Deliveries**: Contracts, ContractDeliveries + حساب التأخير + API التنبيهات
6. **Warranty & Maintenance**: Warranty, MaintenanceRequests + دورة الصيانة الكاملة
7. **Notifications & Dashboard APIs**
8. **Reports** (PDF/Excel/CSV)
9. **Frontend** (بعد استقرار الـ APIs)
10. **Testing شامل** لكل Module فور اكتماله

كل Module سيُسلَّم كـ: **Prisma models + Migration + Service layer + API routes + Validation + Tests**، ولن ننتقل للتالي قبل التأكد أن السابق يعمل فعليًا (وليس شكليًا).

## 8. لماذا نبدأ بـ Database الآن
كل الوحدات (Contracts, Devices, Maintenance...) مترابطة عبر Foreign Keys حقيقية. بناء الـ Schema الكامل أولًا يضمن أن العلاقات (مثل: جهاز → عقد → دفعة توريد → ضمان → صيانة → موظف) صحيحة من البداية بدل إعادة الهيكلة لاحقًا.
