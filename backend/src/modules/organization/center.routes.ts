import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { asyncHandler, AppError } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../utils/audit";

export const centerRouter = Router();
centerRouter.use(authenticate);

// المركز يتكوّن دائمًا من ثلاثة عناصر مطلوبة: إدارة + مديرية + قسم
const centerSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  idaraId: z.string().uuid(),
  departmentId: z.string().uuid(),
  qismId: z.string().uuid(),
  notes: z.string().optional(),
});

centerRouter.get(
  "/",
  requirePermission("centers", "VIEW"),
  asyncHandler(async (req, res) => {
    const { departmentId, idaraId, qismId } = req.query;
    res.json(
      await prisma.center.findMany({
        where: {
          departmentId: departmentId as string | undefined,
          idaraId: idaraId as string | undefined,
          qismId: qismId as string | undefined,
        },
        include: { department: true, idara: true, qism: true },
        orderBy: { name: "asc" },
      })
    );
  })
);

centerRouter.get(
  "/:id",
  requirePermission("centers", "VIEW"),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.center.findUniqueOrThrow({
        where: { id: req.params.id },
        include: { department: true, idara: true, qism: true, employees: true },
      })
    );
  })
);

centerRouter.post(
  "/",
  requirePermission("centers", "CREATE"),
  asyncHandler(async (req, res) => {
    const data = centerSchema.parse(req.body);
    const created = await prisma.$transaction(async (tx) => {
      // اسم المستخدم يُلتقط تلقائيًا من الجلسة الحالية — لا يُدخله المستخدم يدويًا
      const c = await tx.center.create({ data: { ...data, createdByUserId: req.user!.id } });
      await writeAuditLog({ req, action: "CREATE", entity: "Center", entityId: c.id, newData: c }, tx as any);
      return c;
    });
    res.status(201).json(created);
  })
);

centerRouter.put(
  "/:id",
  requirePermission("centers", "EDIT"),
  asyncHandler(async (req, res) => {
    const data = centerSchema.partial().parse(req.body);
    const before = await prisma.center.findUniqueOrThrow({ where: { id: req.params.id } });
    const updated = await prisma.$transaction(async (tx) => {
      const c = await tx.center.update({ where: { id: req.params.id }, data });
      await writeAuditLog({ req, action: "UPDATE", entity: "Center", entityId: c.id, oldData: before, newData: c }, tx as any);
      return c;
    });
    res.json(updated);
  })
);

const deleteSchema = z.object({ reason: z.string().min(3, "سبب الحذف مطلوب") });

// حذف ناعم (تعطيل) — بشرط ألا يكون هناك أي موظف تابع لهذا المركز، ويتطلب سبب حذف
centerRouter.delete(
  "/:id",
  requirePermission("centers", "DELETE"),
  asyncHandler(async (req, res) => {
    const { reason } = deleteSchema.parse(req.body);
    const before = await prisma.center.findUniqueOrThrow({ where: { id: req.params.id } });

    const employeeCount = await prisma.employee.count({ where: { centerId: req.params.id, status: "ACTIVE" } });
    if (employeeCount > 0) {
      throw new AppError(`لا يمكن حذف هذا المركز — يوجد ${employeeCount} موظف تابع له`, 409);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const c = await tx.center.update({ where: { id: req.params.id }, data: { status: "INACTIVE" } });
      await writeAuditLog(
        { req, action: "DELETE", entity: "Center", entityId: c.id, oldData: { ...before, deletionReason: reason }, newData: c },
        tx as any
      );
      return c;
    });

    res.json(updated);
  })
);
