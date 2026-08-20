import { Router } from "express";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { asyncHandler } from "../../middleware/errorHandler";

export const auditLogRouter = Router();
auditLogRouter.use(authenticate);

// View فقط — لا يوجد أي route لحذف أو تعديل الـ Audit Log عمدًا
auditLogRouter.get(
  "/",
  requirePermission("audit-log", "VIEW"),
  asyncHandler(async (req, res) => {
    const { entity, userId, from, to } = req.query;
    const logs = await prisma.auditLog.findMany({
      where: {
        entity: entity as string | undefined,
        userId: userId as string | undefined,
        createdAt: {
          gte: from ? new Date(from as string) : undefined,
          lte: to ? new Date(to as string) : undefined,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    res.json(logs);
  })
);
