import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { asyncHandler } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../utils/audit";

export const warrantyRouter = Router();
warrantyRouter.use(authenticate);

const warrantySchema = z.object({
  deviceId: z.string().uuid(),
  supplierId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  terms: z.string().optional(),
  notes: z.string().optional(),
});

warrantyRouter.get(
  "/",
  requirePermission("warranty", "VIEW"),
  asyncHandler(async (req, res) => {
    const { expiringWithinDays } = req.query;
    const where: any = {};
    if (expiringWithinDays) {
      const days = parseInt(expiringWithinDays as string, 10);
      where.endDate = { lte: new Date(Date.now() + days * 86400000) };
      where.isActive = true;
    }
    res.json(await prisma.warranty.findMany({ where, include: { device: true }, orderBy: { endDate: "asc" } }));
  })
);

warrantyRouter.post(
  "/",
  requirePermission("warranty", "CREATE"),
  asyncHandler(async (req, res) => {
    const data = warrantySchema.parse(req.body);
    const created = await prisma.$transaction(async (tx) => {
      const w = await tx.warranty.create({ data });
      await writeAuditLog({ req, action: "CREATE", entity: "Warranty", entityId: w.id, newData: w }, tx as any);
      return w;
    });
    res.status(201).json(created);
  })
);

warrantyRouter.put(
  "/:id",
  requirePermission("warranty", "EDIT"),
  asyncHandler(async (req, res) => {
    const data = warrantySchema.partial().parse(req.body);
    const before = await prisma.warranty.findUniqueOrThrow({ where: { id: req.params.id } });
    const updated = await prisma.$transaction(async (tx) => {
      const w = await tx.warranty.update({ where: { id: req.params.id }, data });
      await writeAuditLog({ req, action: "UPDATE", entity: "Warranty", entityId: w.id, oldData: before, newData: w }, tx as any);
      return w;
    });
    res.json(updated);
  })
);
