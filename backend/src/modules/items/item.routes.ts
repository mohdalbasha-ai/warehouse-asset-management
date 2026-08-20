import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { asyncHandler } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../utils/audit";

export const itemRouter = Router();
itemRouter.use(authenticate);

const itemSchema = z.object({
  itemNumber: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  type: z.string().optional(),
  unit: z.string().min(1),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  minStock: z.number().int().nonnegative().default(0),
  maxStock: z.number().int().nonnegative().optional(),
  reorderPoint: z.number().int().nonnegative().optional(),
  requiresSerial: z.boolean().default(false),
  isDevice: z.boolean().default(false),
  isMaintainable: z.boolean().default(false),
  hasWarranty: z.boolean().default(false),
  notes: z.string().optional(),
});

itemRouter.get(
  "/",
  requirePermission("items", "VIEW"),
  asyncHandler(async (req, res) => {
    const { category, manufacturer } = req.query;
    res.json(
      await prisma.item.findMany({
        where: {
          category: category as string | undefined,
          manufacturer: manufacturer as string | undefined,
        },
        orderBy: { name: "asc" },
      })
    );
  })
);

itemRouter.post(
  "/",
  requirePermission("items", "CREATE"),
  asyncHandler(async (req, res) => {
    const data = itemSchema.parse(req.body);
    // منع تكرار الأصناف: نفس الاسم + الشركة المصنعة + الموديل
    const duplicate = await prisma.item.findFirst({
      where: { name: data.name, manufacturer: data.manufacturer ?? null, model: data.model ?? null },
    });
    if (duplicate) {
      return res.status(409).json({ error: "هذا الصنف موجود مسبقًا (نفس الاسم والشركة المصنعة والموديل)" });
    }

    const created = await prisma.$transaction(async (tx) => {
      const item = await tx.item.create({ data });
      await writeAuditLog({ req, action: "CREATE", entity: "Item", entityId: item.id, newData: item }, tx as any);
      return item;
    });
    res.status(201).json(created);
  })
);

itemRouter.put(
  "/:id",
  requirePermission("items", "EDIT"),
  asyncHandler(async (req, res) => {
    const data = itemSchema.partial().parse(req.body);
    const before = await prisma.item.findUniqueOrThrow({ where: { id: req.params.id } });
    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.item.update({ where: { id: req.params.id }, data });
      await writeAuditLog({ req, action: "UPDATE", entity: "Item", entityId: item.id, oldData: before, newData: item }, tx as any);
      return item;
    });
    res.json(updated);
  })
);

itemRouter.delete(
  "/:id",
  requirePermission("items", "DELETE"),
  asyncHandler(async (req, res) => {
    const before = await prisma.item.findUniqueOrThrow({ where: { id: req.params.id } });
    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.item.update({ where: { id: req.params.id }, data: { status: "INACTIVE" } });
      await writeAuditLog({ req, action: "DELETE", entity: "Item", entityId: item.id, oldData: before, newData: item }, tx as any);
      return item;
    });
    res.json(updated);
  })
);
