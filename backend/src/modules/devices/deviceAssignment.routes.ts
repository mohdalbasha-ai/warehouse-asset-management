import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { asyncHandler, AppError } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../utils/audit";

export const deviceAssignmentRouter = Router();
deviceAssignmentRouter.use(authenticate);

const issueSchema = z.object({
  deviceId: z.string().uuid(),
  employeeId: z.string().uuid(),
  centerId: z.string().uuid().optional(),
  conditionAtEvent: z.string().optional(),
  meterReading: z.string().optional(),
  recipientSignature: z.string().optional(),
  notes: z.string().optional(),
});

deviceAssignmentRouter.post(
  "/issue",
  requirePermission("devices", "ISSUE"),
  asyncHandler(async (req, res) => {
    const data = issueSchema.parse(req.body);
    const device = await prisma.device.findUniqueOrThrow({ where: { id: data.deviceId } });

    if (!["NEW", "IN_WAREHOUSE", "RETURNED"].includes(device.status)) {
      throw new AppError(`لا يمكن تسليم جهاز بحالة (${device.status})`, 409);
    }

    const result = await prisma.$transaction(async (tx) => {
      const assignment = await tx.deviceAssignment.create({
        data: {
          deviceId: data.deviceId,
          employeeId: data.employeeId,
          centerId: data.centerId,
          action: "ISSUE",
          performedByUserId: req.user!.id,
          conditionAtEvent: data.conditionAtEvent,
          meterReading: data.meterReading,
          recipientSignature: data.recipientSignature,
          notes: data.notes,
        },
      });

      const updatedDevice = await tx.device.update({
        where: { id: data.deviceId },
        data: {
          status: "DELIVERED",
          currentEmployeeId: data.employeeId,
          centerId: data.centerId ?? device.centerId,
          warehouseId: null, // خرج من المستودع
        },
      });

      await writeAuditLog(
        { req, action: "ISSUE", entity: "Device", entityId: device.id, oldData: device, newData: updatedDevice },
        tx as any
      );

      return { assignment, device: updatedDevice };
    });

    res.status(201).json(result);
  })
);

const returnSchema = z.object({
  deviceId: z.string().uuid(),
  employeeId: z.string().uuid(),
  returnReason: z.string().optional(),
  conditionAtEvent: z.string().optional(),
  notes: z.string().optional(),
  targetWarehouseId: z.string().uuid(), // المستودع الذي سيعود إليه الجهاز
});

deviceAssignmentRouter.post(
  "/return",
  requirePermission("devices", "ISSUE"),
  asyncHandler(async (req, res) => {
    const data = returnSchema.parse(req.body);
    const device = await prisma.device.findUniqueOrThrow({ where: { id: data.deviceId } });

    const result = await prisma.$transaction(async (tx) => {
      const assignment = await tx.deviceAssignment.create({
        data: {
          deviceId: data.deviceId,
          employeeId: data.employeeId,
          action: "RETURN",
          performedByUserId: req.user!.id,
          returnReason: data.returnReason,
          conditionAtEvent: data.conditionAtEvent,
          notes: data.notes,
        },
      });

      const updatedDevice = await tx.device.update({
        where: { id: data.deviceId },
        data: {
          status: "RETURNED",
          currentEmployeeId: null,
          warehouseId: data.targetWarehouseId,
        },
      });

      await writeAuditLog(
        { req, action: "UPDATE", entity: "Device", entityId: device.id, oldData: device, newData: updatedDevice },
        tx as any
      );

      return { assignment, device: updatedDevice };
    });

    res.status(201).json(result);
  })
);

deviceAssignmentRouter.get(
  "/device/:deviceId/history",
  requirePermission("devices", "VIEW"),
  asyncHandler(async (req, res) => {
    const history = await prisma.deviceAssignment.findMany({
      where: { deviceId: req.params.deviceId },
      include: { employee: true, center: true },
      orderBy: { date: "desc" },
    });
    res.json(history);
  })
);
