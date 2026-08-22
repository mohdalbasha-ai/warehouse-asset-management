import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { asyncHandler, AppError } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../utils/audit";

export const departmentRouter = Router();
departmentRouter.use(authenticate);

const departmentSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  notes: z.string().optional(),
});

departmentRouter.get(
  "/",
  requirePermission("departments", "VIEW"),
  asyncHandler(async (_req, res) => {
    const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
    res.json(departments);
  })
);

departmentRouter.post(
  "/",
  requirePermission("departments", "CREATE"),
  asyncHandler(async (req, res) => {
    const data = departmentSchema.parse(req.body);

    const created = await prisma.$transaction(async (tx) => {
      // اسم المستخدم يُلتقط تلقائيًا من الجلسة الحالية
      const dept = await tx.department.create({ data: { ...data, createdByUserId: req.user!.id } });
      await writeAuditLog(
        { req, action: "CREATE", entity: "Department", entityId: dept.id, newData: dept },
        tx as any
      );
      return dept;
    });

    res.status(201).json(created);
  })
);

departmentRouter.put(
  "/:id",
  requirePermission("departments", "EDIT"),
  asyncHandler(async (req, res) => {
    const data = departmentSchema.partial().parse(req.body);
    const before = await prisma.department.findUniqueOrThrow({ where: { id: req.params.id } });

    const updated = await prisma.$transaction(async (tx) => {
      const dept = await tx.department.update({ where: { id: req.params.id }, data });
      await writeAuditLog(
        { req, action: "UPDATE", entity: "Department", entityId: dept.id, oldData: before, newData: dept },
        tx as any
      );
      return dept;
    });

    res.json(updated);
  })
);

const deleteSchema = z.object({ reason: z.string().min(3, "سبب الحذف مطلوب") });

// حذف ناعم (تعطيل) — بشرط ألا تكون هناك مراكز مرتبطة بهذه المديرية، ويتطلب سبب حذف
departmentRouter.delete(
  "/:id",
  requirePermission("departments", "DELETE"),
  asyncHandler(async (req, res) => {
    const { reason } = deleteSchema.parse(req.body);
    const before = await prisma.department.findUniqueOrThrow({ where: { id: req.params.id } });

    const linkedCenters = await prisma.center.count({ where: { departmentId: req.params.id } });
    if (linkedCenters > 0) {
      throw new AppError(`لا يمكن حذف هذه المديرية — يوجد ${linkedCenters} مركز تابع لها`, 409);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const dept = await tx.department.update({ where: { id: req.params.id }, data: { status: "INACTIVE" } });
      await writeAuditLog(
        { req, action: "DELETE", entity: "Department", entityId: dept.id, oldData: { ...before, deletionReason: reason }, newData: dept },
        tx as any
      );
      return dept;
    });

    res.json(updated);
  })
);
