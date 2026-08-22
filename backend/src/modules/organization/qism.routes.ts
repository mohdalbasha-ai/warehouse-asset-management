import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { asyncHandler, AppError } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../utils/audit";

export const qismRouter = Router();
qismRouter.use(authenticate);

const qismSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  notes: z.string().optional(),
});

qismRouter.get(
  "/",
  requirePermission("aqsam", "VIEW"),
  asyncHandler(async (_req, res) => {
    res.json(await prisma.qism.findMany({ orderBy: { name: "asc" } }));
  })
);

qismRouter.post(
  "/",
  requirePermission("aqsam", "CREATE"),
  asyncHandler(async (req, res) => {
    const data = qismSchema.parse(req.body);
    const created = await prisma.$transaction(async (tx) => {
      const qism = await tx.qism.create({ data: { ...data, createdByUserId: req.user!.id } });
      await writeAuditLog({ req, action: "CREATE", entity: "Qism", entityId: qism.id, newData: qism }, tx as any);
      return qism;
    });
    res.status(201).json(created);
  })
);

qismRouter.put(
  "/:id",
  requirePermission("aqsam", "EDIT"),
  asyncHandler(async (req, res) => {
    const data = qismSchema.partial().parse(req.body);
    const before = await prisma.qism.findUniqueOrThrow({ where: { id: req.params.id } });
    const updated = await prisma.$transaction(async (tx) => {
      const qism = await tx.qism.update({ where: { id: req.params.id }, data });
      await writeAuditLog({ req, action: "UPDATE", entity: "Qism", entityId: qism.id, oldData: before, newData: qism }, tx as any);
      return qism;
    });
    res.json(updated);
  })
);

const deleteSchema = z.object({ reason: z.string().min(3, "سبب الحذف مطلوب") });

qismRouter.delete(
  "/:id",
  requirePermission("aqsam", "DELETE"),
  asyncHandler(async (req, res) => {
    const { reason } = deleteSchema.parse(req.body);
    const before = await prisma.qism.findUniqueOrThrow({ where: { id: req.params.id } });

    const linkedCenters = await prisma.center.count({ where: { qismId: req.params.id } });
    if (linkedCenters > 0) {
      throw new AppError(`لا يمكن حذف هذا القسم — يوجد ${linkedCenters} مركز تابع له`, 409);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const qism = await tx.qism.update({ where: { id: req.params.id }, data: { status: "INACTIVE" } });
      await writeAuditLog(
        { req, action: "DELETE", entity: "Qism", entityId: qism.id, oldData: { ...before, deletionReason: reason }, newData: qism },
        tx as any
      );
      return qism;
    });

    res.json(updated);
  })
);
