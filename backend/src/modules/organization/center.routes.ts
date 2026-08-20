import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { asyncHandler } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../utils/audit";

export const centerRouter = Router();
centerRouter.use(authenticate);

const centerSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  departmentId: z.string().uuid(),
  notes: z.string().optional(),
});

centerRouter.get(
  "/",
  requirePermission("centers", "VIEW"),
  asyncHandler(async (req, res) => {
    const { departmentId } = req.query;
    res.json(
      await prisma.center.findMany({
        where: { departmentId: departmentId as string | undefined },
        include: { department: true },
        orderBy: { name: "asc" },
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
      const c = await tx.center.create({ data });
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

centerRouter.delete(
  "/:id",
  requirePermission("centers", "DELETE"),
  asyncHandler(async (req, res) => {
    const before = await prisma.center.findUniqueOrThrow({ where: { id: req.params.id } });
    const updated = await prisma.$transaction(async (tx) => {
      const c = await tx.center.update({ where: { id: req.params.id }, data: { status: "INACTIVE" } });
      await writeAuditLog({ req, action: "DELETE", entity: "Center", entityId: c.id, oldData: before, newData: c }, tx as any);
      return c;
    });
    res.json(updated);
  })
);
