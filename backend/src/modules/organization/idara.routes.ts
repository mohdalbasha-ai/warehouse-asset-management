import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { asyncHandler, AppError } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../utils/audit";

export const idaraRouter = Router();
idaraRouter.use(authenticate);

const idaraSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  notes: z.string().optional(),
});

idaraRouter.get(
  "/",
  requirePermission("idarat", "VIEW"),
  asyncHandler(async (_req, res) => {
    res.json(await prisma.idara.findMany({ orderBy: { name: "asc" } }));
  })
);

idaraRouter.post(
  "/",
  requirePermission("idarat", "CREATE"),
  asyncHandler(async (req, res) => {
    const data = idaraSchema.parse(req.body);
    const created = await prisma.$transaction(async (tx) => {
      // اسم المستخدم الذي أنشأ السجل يُلتقط تلقائيًا من الجلسة — لا يُدخله المستخدم يدويًا
      const idara = await tx.idara.create({ data: { ...data, createdByUserId: req.user!.id } });
      await writeAuditLog({ req, action: "CREATE", entity: "Idara", entityId: idara.id, newData: idara }, tx as any);
      return idara;
    });
    res.status(201).json(created);
  })
);

idaraRouter.put(
  "/:id",
  requirePermission("idarat", "EDIT"),
  asyncHandler(async (req, res) => {
    const data = idaraSchema.partial().parse(req.body);
    const before = await prisma.idara.findUniqueOrThrow({ where: { id: req.params.id } });
    const updated = await prisma.$transaction(async (tx) => {
      const idara = await tx.idara.update({ where: { id: req.params.id }, data });
      await writeAuditLog({ req, action: "UPDATE", entity: "Idara", entityId: idara.id, oldData: before, newData: idara }, tx as any);
      return idara;
    });
    res.json(updated);
  })
);

const deleteSchema = z.object({ reason: z.string().min(3, "سبب الحذف مطلوب") });

idaraRouter.delete(
  "/:id",
  requirePermission("idarat", "DELETE"),
  asyncHandler(async (req, res) => {
    const { reason } = deleteSchema.parse(req.body);
    const before = await prisma.idara.findUniqueOrThrow({ where: { id: req.params.id } });

    // لا يمكن حذف الإدارة إن كانت هناك مراكز مرتبطة بها
    const linkedCenters = await prisma.center.count({ where: { idaraId: req.params.id } });
    if (linkedCenters > 0) {
      throw new AppError(`لا يمكن حذف هذه الإدارة — يوجد ${linkedCenters} مركز تابع لها`, 409);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const idara = await tx.idara.update({ where: { id: req.params.id }, data: { status: "INACTIVE" } });
      await writeAuditLog(
        { req, action: "DELETE", entity: "Idara", entityId: idara.id, oldData: { ...before, deletionReason: reason }, newData: idara },
        tx as any
      );
      return idara;
    });

    res.json(updated);
  })
);
