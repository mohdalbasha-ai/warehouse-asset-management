import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { asyncHandler } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../utils/audit";
import { computeDeliveryDelay, contractExpiryRiskLevel } from "./delay.service";

export const contractRouter = Router();
contractRouter.use(authenticate);

const contractSchema = z.object({
  contractNumber: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["SUPPLY", "MAINTENANCE", "SUPPLY_AND_MAINTENANCE", "SERVICES", "TECHNICAL_SUPPORT", "WARRANTY", "OTHER"]),
  supplierId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  value: z.number().nonnegative(),
  currency: z.string().default("JOD"),
  centerId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  responsibleUserId: z.string().uuid().optional(),
  terms: z.string().optional(),
  warrantyPeriodMonths: z.number().int().optional(),
  warrantyTerms: z.string().optional(),
  supplyTerms: z.string().optional(),
  supplyDurationDays: z.number().int().optional(),
  delayTerms: z.string().optional(),
  delayPenalty: z.number().optional(),
  delayPenaltyPercent: z.number().optional(),
  maxPenalty: z.number().optional(),
  notes: z.string().optional(),
});

contractRouter.get(
  "/",
  requirePermission("contracts", "VIEW"),
  asyncHandler(async (req, res) => {
    const { status, type, supplierId } = req.query;
    const contracts = await prisma.contract.findMany({
      where: {
        status: status as any,
        type: type as any,
        supplierId: supplierId as string | undefined,
      },
      include: { supplier: true },
      orderBy: { endDate: "asc" },
    });

    const withDaysRemaining = contracts.map((c) => {
      const daysRemaining = Math.round((c.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return { ...c, daysRemaining, riskLevel: contractExpiryRiskLevel(daysRemaining) };
    });

    res.json(withDaysRemaining);
  })
);

contractRouter.post(
  "/",
  requirePermission("contracts", "CREATE"),
  asyncHandler(async (req, res) => {
    const data = contractSchema.parse(req.body);
    const created = await prisma.$transaction(async (tx) => {
      const contract = await tx.contract.create({ data: data as any });
      await writeAuditLog({ req, action: "CREATE", entity: "Contract", entityId: contract.id, newData: contract }, tx as any);
      return contract;
    });
    res.status(201).json(created);
  })
);

contractRouter.put(
  "/:id",
  requirePermission("contracts", "EDIT"),
  asyncHandler(async (req, res) => {
    const data = contractSchema.partial().parse(req.body);
    const before = await prisma.contract.findUniqueOrThrow({ where: { id: req.params.id } });

    const updated = await prisma.$transaction(async (tx) => {
      const contract = await tx.contract.update({ where: { id: req.params.id }, data: data as any });
      await writeAuditLog(
        { req, action: "UPDATE", entity: "Contract", entityId: contract.id, oldData: before, newData: contract },
        tx as any
      );
      return contract;
    });

    res.json(updated);
  })
);

/** عرض كل دفعات التوريد عبر كل العقود (للاستخدام في شاشة "التوريدات" العامة) */
contractRouter.get(
  "/deliveries/all",
  requirePermission("contract-deliveries", "VIEW"),
  asyncHandler(async (_req, res) => {
    const deliveries = await prisma.contractDelivery.findMany({
      include: { contract: { include: { supplier: true } } },
      orderBy: { agreedDate: "asc" },
    });
    res.json(deliveries.map((d) => ({ ...d, ...computeDeliveryDelay(d) })));
  })
);

/**
 * GET /api/contracts/expiring?days=30
 * قابلة لإعادة الاستخدام في Dashboard والتقارير والتنبيهات كما هو مطلوب صراحة.
 */
contractRouter.get(
  "/expiring",
  requirePermission("contracts", "VIEW"),
  asyncHandler(async (req, res) => {
    const days = parseInt((req.query.days as string) || "30", 10);
    const now = new Date();
    const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const contracts = await prisma.contract.findMany({
      where: {
        status: "ACTIVE",
        endDate: { lte: threshold },
      },
      include: { supplier: true },
      orderBy: { endDate: "asc" },
    });

    const result = contracts.map((c) => {
      const daysRemaining = Math.round((c.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        contractId: c.id,
        contractNumber: c.contractNumber,
        type: c.type,
        supplierName: c.supplier.name,
        endDate: c.endDate,
        daysRemaining,
        riskLevel: contractExpiryRiskLevel(daysRemaining),
      };
    });

    res.json(result);
  })
);

const deliverySchema = z.object({
  batchNumber: z.string().min(1),
  description: z.string().optional(),
  quantity: z.number().int().positive(),
  value: z.number().nonnegative().optional(),
  agreedDate: z.coerce.date(),
  warehouseId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

contractRouter.post(
  "/:id/deliveries",
  requirePermission("contract-deliveries", "CREATE"),
  asyncHandler(async (req, res) => {
    const data = deliverySchema.parse(req.body);
    const created = await prisma.$transaction(async (tx) => {
      const delivery = await tx.contractDelivery.create({
        data: { ...data, contractId: req.params.id, createdByUserId: req.user!.id, status: "NOT_STARTED" },
      });
      await writeAuditLog({ req, action: "CREATE", entity: "ContractDelivery", entityId: delivery.id, newData: delivery }, tx as any);
      return delivery;
    });
    res.status(201).json(created);
  })
);

/** تسجيل استلام دفعة توريد فعليًا */
contractRouter.post(
  "/deliveries/:deliveryId/receive",
  requirePermission("contract-deliveries", "RECEIVE"),
  asyncHandler(async (req, res) => {
    const { actualDate } = z.object({ actualDate: z.coerce.date().default(new Date()) }).parse(req.body);
    const before = await prisma.contractDelivery.findUniqueOrThrow({ where: { id: req.params.deliveryId } });
    const updated = await prisma.$transaction(async (tx) => {
      const delivery = await tx.contractDelivery.update({
        where: { id: req.params.deliveryId },
        data: { actualDate, status: "RECEIVED" },
      });
      await writeAuditLog(
        { req, action: "RECEIVE", entity: "ContractDelivery", entityId: delivery.id, oldData: before, newData: delivery },
        tx as any
      );
      return delivery;
    });
    res.json(updated);
  })
);

/** حالة كل دفعات التوريد الخاصة بعقد معيّن، مع التأخير المحسوب لحظيًا */
contractRouter.get(
  "/:id/deliveries",
  requirePermission("contracts", "VIEW"),
  asyncHandler(async (req, res) => {
    const deliveries = await prisma.contractDelivery.findMany({ where: { contractId: req.params.id } });
    const withDelay = deliveries.map((d) => ({ ...d, ...computeDeliveryDelay(d) }));
    res.json(withDelay);
  })
);
