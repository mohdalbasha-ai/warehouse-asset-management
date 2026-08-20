import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { asyncHandler } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../utils/audit";

export const supplierRouter = Router();
supplierRouter.use(authenticate);

const supplierSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

supplierRouter.get(
  "/",
  requirePermission("suppliers", "VIEW"),
  asyncHandler(async (_req, res) => {
    res.json(await prisma.supplier.findMany({ orderBy: { name: "asc" } }));
  })
);

supplierRouter.post(
  "/",
  requirePermission("suppliers", "CREATE"),
  asyncHandler(async (req, res) => {
    const data = supplierSchema.parse(req.body);
    const created = await prisma.$transaction(async (tx) => {
      const s = await tx.supplier.create({ data });
      await writeAuditLog({ req, action: "CREATE", entity: "Supplier", entityId: s.id, newData: s }, tx as any);
      return s;
    });
    res.status(201).json(created);
  })
);

supplierRouter.put(
  "/:id",
  requirePermission("suppliers", "EDIT"),
  asyncHandler(async (req, res) => {
    const data = supplierSchema.partial().parse(req.body);
    const before = await prisma.supplier.findUniqueOrThrow({ where: { id: req.params.id } });
    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.supplier.update({ where: { id: req.params.id }, data });
      await writeAuditLog({ req, action: "UPDATE", entity: "Supplier", entityId: s.id, oldData: before, newData: s }, tx as any);
      return s;
    });
    res.json(updated);
  })
);

supplierRouter.delete(
  "/:id",
  requirePermission("suppliers", "DELETE"),
  asyncHandler(async (req, res) => {
    const before = await prisma.supplier.findUniqueOrThrow({ where: { id: req.params.id } });
    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.supplier.update({ where: { id: req.params.id }, data: { status: "INACTIVE" } });
      await writeAuditLog({ req, action: "DELETE", entity: "Supplier", entityId: s.id, oldData: before, newData: s }, tx as any);
      return s;
    });
    res.json(updated);
  })
);
