import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { asyncHandler } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../utils/audit";

export const warehouseRouter = Router();
warehouseRouter.use(authenticate);

const warehouseSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  centerId: z.string().uuid(),
  managerId: z.string().uuid().optional(),
  location: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

warehouseRouter.get(
  "/",
  requirePermission("warehouses", "VIEW"),
  asyncHandler(async (req, res) => {
    const { centerId } = req.query;
    res.json(
      await prisma.warehouse.findMany({
        where: { centerId: centerId as string | undefined },
        include: { center: { include: { department: true } } },
        orderBy: { name: "asc" },
      })
    );
  })
);

warehouseRouter.get(
  "/:id",
  requirePermission("warehouses", "VIEW"),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.warehouse.findUniqueOrThrow({
        where: { id: req.params.id },
        include: { center: true, stockLevels: { include: { item: true } } },
      })
    );
  })
);

warehouseRouter.post(
  "/",
  requirePermission("warehouses", "CREATE"),
  asyncHandler(async (req, res) => {
    const data = warehouseSchema.parse(req.body);
    const created = await prisma.$transaction(async (tx) => {
      const w = await tx.warehouse.create({ data });
      await writeAuditLog({ req, action: "CREATE", entity: "Warehouse", entityId: w.id, newData: w }, tx as any);
      return w;
    });
    res.status(201).json(created);
  })
);

warehouseRouter.put(
  "/:id",
  requirePermission("warehouses", "EDIT"),
  asyncHandler(async (req, res) => {
    const data = warehouseSchema.partial().parse(req.body);
    const before = await prisma.warehouse.findUniqueOrThrow({ where: { id: req.params.id } });
    const updated = await prisma.$transaction(async (tx) => {
      const w = await tx.warehouse.update({ where: { id: req.params.id }, data });
      await writeAuditLog({ req, action: "UPDATE", entity: "Warehouse", entityId: w.id, oldData: before, newData: w }, tx as any);
      return w;
    });
    res.json(updated);
  })
);

warehouseRouter.delete(
  "/:id",
  requirePermission("warehouses", "DELETE"),
  asyncHandler(async (req, res) => {
    const before = await prisma.warehouse.findUniqueOrThrow({ where: { id: req.params.id } });
    const updated = await prisma.$transaction(async (tx) => {
      const w = await tx.warehouse.update({ where: { id: req.params.id }, data: { status: "INACTIVE" } });
      await writeAuditLog({ req, action: "DELETE", entity: "Warehouse", entityId: w.id, oldData: before, newData: w }, tx as any);
      return w;
    });
    res.json(updated);
  })
);
