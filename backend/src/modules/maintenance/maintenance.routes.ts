import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { asyncHandler, AppError } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../utils/audit";
import { determineCoverage } from "./coverage.service";

export const maintenanceRouter = Router();
maintenanceRouter.use(authenticate);

const requestSchema = z.object({
  requestNumber: z.string().min(1),
  deviceId: z.string().uuid(),
  employeeId: z.string().uuid(),
  issue: z.string().min(1),
  faultDescription: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  notes: z.string().optional(),
});

// دورة المراحل المسموح الانتقال بينها بالترتيب (يمكن تخصيصها لاحقًا حسب الحاجة)
const STAGE_ORDER = [
  "NEW", "RECEIVED", "INSPECTING", "COVERAGE_DETERMINED", "AWAITING_APPROVAL",
  "APPROVED", "SENT_FOR_REPAIR", "IN_REPAIR", "REPAIRED", "POST_CHECK",
  "DELIVERED_TO_USER", "CLOSED",
] as const;

maintenanceRouter.get(
  "/",
  requirePermission("maintenance", "VIEW"),
  asyncHandler(async (req, res) => {
    const { status, priority, deviceId } = req.query;
    res.json(
      await prisma.maintenanceRequest.findMany({
        where: { status: status as any, priority: priority as any, deviceId: deviceId as string | undefined },
        include: { device: true, employee: true },
        orderBy: { requestDate: "desc" },
      })
    );
  })
);

maintenanceRouter.post(
  "/",
  requirePermission("maintenance", "CREATE"),
  asyncHandler(async (req, res) => {
    const data = requestSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.maintenanceRequest.create({
        data: { ...data, status: "NEW" },
      });

      await tx.maintenanceAction.create({
        data: { requestId: request.id, stage: "NEW", performedByUserId: req.user!.id },
      });

      await tx.device.update({ where: { id: data.deviceId }, data: { status: "UNDER_MAINTENANCE" } });

      await writeAuditLog(
        { req, action: "CREATE", entity: "MaintenanceRequest", entityId: request.id, newData: request },
        tx as any
      );

      return request;
    });

    res.status(201).json(result);
  })
);

/**
 * استلام الجهاز وفحصه وتحديد التغطية تلقائيًا (ضمان / عقد صيانة / خارج التغطية).
 * إن كان خارج التغطية → الحالة تصبح AWAITING_APPROVAL ويُطلب اعتماد قبل التنفيذ.
 */
maintenanceRouter.post(
  "/:id/inspect",
  requirePermission("maintenance", "MAINTENANCE"),
  asyncHandler(async (req, res) => {
    const request = await prisma.maintenanceRequest.findUniqueOrThrow({ where: { id: req.params.id } });
    const coverage = await determineCoverage(prisma, request.deviceId);

    const nextStatus = coverage.coverageType === "OUT_OF_COVERAGE" ? "AWAITING_APPROVAL" : "COVERAGE_DETERMINED";

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.update({
        where: { id: request.id },
        data: {
          status: nextStatus,
          coverageType: coverage.coverageType,
          contractId: "contractId" in coverage ? coverage.contractId : undefined,
          approvalRequired: coverage.coverageType === "OUT_OF_COVERAGE",
        },
      });

      await tx.maintenanceAction.create({
        data: { requestId: request.id, stage: nextStatus as any, performedByUserId: req.user!.id, notes: `التغطية: ${coverage.coverageType}` },
      });

      await writeAuditLog(
        { req, action: "UPDATE", entity: "MaintenanceRequest", entityId: request.id, newData: updated },
        tx as any
      );

      return updated;
    });

    res.json(result);
  })
);

const approvalSchema = z.object({
  approved: z.boolean(),
  quoteAmount: z.number().nonnegative().optional(),
  executingCompany: z.string().optional(),
  notes: z.string().optional(),
});

/** اعتماد صيانة خارج التغطية (يتطلب صلاحية APPROVE) */
maintenanceRouter.post(
  "/:id/approve",
  requirePermission("maintenance", "APPROVE"),
  asyncHandler(async (req, res) => {
    const data = approvalSchema.parse(req.body);
    const request = await prisma.maintenanceRequest.findUniqueOrThrow({ where: { id: req.params.id } });

    if (request.status !== "AWAITING_APPROVAL") {
      throw new AppError("الطلب ليس بانتظار الاعتماد", 409);
    }

    const nextStatus = data.approved ? "APPROVED" : "REJECTED";

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.update({
        where: { id: request.id },
        data: {
          status: nextStatus,
          approvedByUserId: req.user!.id,
          approvalDate: new Date(),
          quoteAmount: data.quoteAmount,
          executingCompany: data.executingCompany,
        },
      });

      await tx.maintenanceAction.create({
        data: { requestId: request.id, stage: nextStatus as any, performedByUserId: req.user!.id, notes: data.notes },
      });

      await writeAuditLog(
        { req, action: data.approved ? "APPROVE" : "REJECT", entity: "MaintenanceRequest", entityId: request.id, newData: updated },
        tx as any
      );

      return updated;
    });

    res.json(result);
  })
);

const advanceSchema = z.object({
  stage: z.enum(STAGE_ORDER),
  notes: z.string().optional(),
  cost: z.number().nonnegative().optional(),
});

/** الانتقال إلى أي مرحلة لاحقة في دورة الصيانة، مع تسجيلها في MaintenanceAction */
maintenanceRouter.post(
  "/:id/advance",
  requirePermission("maintenance", "MAINTENANCE"),
  asyncHandler(async (req, res) => {
    const data = advanceSchema.parse(req.body);
    const request = await prisma.maintenanceRequest.findUniqueOrThrow({ where: { id: req.params.id } });

    const result = await prisma.$transaction(async (tx) => {
      const updateData: any = { status: data.stage };
      if (data.cost != null) updateData.cost = data.cost;
      if (data.stage === "RECEIVED") updateData.receivedForRepairDate = new Date();
      if (data.stage === "REPAIRED" || data.stage === "DELIVERED_TO_USER") updateData.returnDate = new Date();

      const updated = await tx.maintenanceRequest.update({ where: { id: request.id }, data: updateData });

      await tx.maintenanceAction.create({
        data: { requestId: request.id, stage: data.stage, performedByUserId: req.user!.id, notes: data.notes },
      });

      // عند إغلاق الطلب وتسليم الجهاز، تُعاد حالة الجهاز إلى "بالمستودع" أو "مستخدم" حسب السياق
      if (data.stage === "CLOSED") {
        await tx.device.update({ where: { id: request.deviceId }, data: { status: "IN_USE" } });
      }

      await writeAuditLog(
        { req, action: "UPDATE", entity: "MaintenanceRequest", entityId: request.id, newData: updated },
        tx as any
      );

      return updated;
    });

    res.json(result);
  })
);

maintenanceRouter.get(
  "/:id/timeline",
  requirePermission("maintenance", "VIEW"),
  asyncHandler(async (req, res) => {
    const actions = await prisma.maintenanceAction.findMany({
      where: { requestId: req.params.id },
      orderBy: { date: "asc" },
    });
    res.json(actions);
  })
);
