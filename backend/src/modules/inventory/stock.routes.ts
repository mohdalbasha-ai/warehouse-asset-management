import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { asyncHandler, AppError } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../utils/audit";

export const stockRouter = Router();
stockRouter.use(authenticate);

const lineSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  serialNumber: z.string().optional(),
  unitPrice: z.number().nonnegative().optional(),
});

// ---------------------------------------------------------------
// التوريد — يزيد الرصيد
// ---------------------------------------------------------------
const receiptSchema = z.object({
  receiptNumber: z.string().min(1),
  warehouseId: z.string().uuid(),
  supplierId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1),
});

stockRouter.post(
  "/receipts",
  requirePermission("stock", "RECEIVE"),
  asyncHandler(async (req, res) => {
    const data = receiptSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      // منع تكرار Serial Number للأصناف التي تتطلب ذلك
      for (const line of data.lines) {
        if (line.serialNumber) {
          const item = await tx.item.findUniqueOrThrow({ where: { id: line.itemId } });
          if (item.requiresSerial) {
            const existingDevice = await tx.device.findFirst({ where: { serialNumber: line.serialNumber } });
            if (existingDevice) {
              throw new AppError(`Serial Number مكرر: ${line.serialNumber}`, 409);
            }
          }
        }
      }

      const receipt = await tx.stockReceipt.create({
        data: {
          receiptNumber: data.receiptNumber,
          warehouseId: data.warehouseId,
          supplierId: data.supplierId,
          contractId: data.contractId,
          performedByUserId: req.user!.id,
          notes: data.notes,
          lines: {
            create: data.lines.map((l) => ({
              itemId: l.itemId,
              quantity: l.quantity,
              serialNumber: l.serialNumber,
              unitPrice: l.unitPrice,
              total: l.unitPrice ? l.unitPrice * l.quantity : undefined,
            })),
          },
        },
        include: { lines: true },
      });

      // تحديث الرصيد لكل صنف (Upsert)
      for (const line of data.lines) {
        await tx.stockLevel.upsert({
          where: { warehouseId_itemId: { warehouseId: data.warehouseId, itemId: line.itemId } },
          create: { warehouseId: data.warehouseId, itemId: line.itemId, quantity: line.quantity },
          update: { quantity: { increment: line.quantity } },
        });
      }

      await writeAuditLog({ req, action: "RECEIVE", entity: "StockReceipt", entityId: receipt.id, newData: receipt }, tx as any);

      return receipt;
    });

    res.status(201).json(result);
  })
);

// ---------------------------------------------------------------
// الصرف — ينقص الرصيد، ويمنع الصرف إن كان الرصيد المتاح غير كافٍ
// ---------------------------------------------------------------
const issueSchema = z.object({
  issueNumber: z.string().min(1),
  warehouseId: z.string().uuid(),
  recipientEmployeeId: z.string().uuid().optional(),
  reason: z.string().optional(),
  contractId: z.string().uuid().optional(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1),
});

stockRouter.post(
  "/issues",
  requirePermission("stock", "ISSUE"),
  asyncHandler(async (req, res) => {
    const data = issueSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      // التحقق من توفر الرصيد الكافي قبل أي حفظ
      for (const line of data.lines) {
        const level = await tx.stockLevel.findUnique({
          where: { warehouseId_itemId: { warehouseId: data.warehouseId, itemId: line.itemId } },
        });
        const available = (level?.quantity ?? 0) - (level?.reservedQty ?? 0);
        if (available < line.quantity) {
          throw new AppError(`الرصيد المتاح غير كافٍ للصنف ${line.itemId} (المتاح: ${available})`, 409);
        }
      }

      const issue = await tx.stockIssue.create({
        data: {
          issueNumber: data.issueNumber,
          warehouseId: data.warehouseId,
          recipientEmployeeId: data.recipientEmployeeId,
          reason: data.reason,
          contractId: data.contractId,
          performedByUserId: req.user!.id,
          notes: data.notes,
          lines: { create: data.lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, serialNumber: l.serialNumber })) },
        },
        include: { lines: true },
      });

      for (const line of data.lines) {
        await tx.stockLevel.update({
          where: { warehouseId_itemId: { warehouseId: data.warehouseId, itemId: line.itemId } },
          data: { quantity: { decrement: line.quantity } },
        });
      }

      await writeAuditLog({ req, action: "ISSUE", entity: "StockIssue", entityId: issue.id, newData: issue }, tx as any);

      return issue;
    });

    res.status(201).json(result);
  })
);

// ---------------------------------------------------------------
// المناقلة بين مستودعين — تنقص من المصدر وتزيد في الوجهة معًا أو لا شيء
// ---------------------------------------------------------------
const transferSchema = z.object({
  transferNumber: z.string().min(1),
  fromWarehouseId: z.string().uuid(),
  toWarehouseId: z.string().uuid(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1),
});

stockRouter.post(
  "/transfers",
  requirePermission("stock", "TRANSFER"),
  asyncHandler(async (req, res) => {
    const data = transferSchema.parse(req.body);
    if (data.fromWarehouseId === data.toWarehouseId) {
      throw new AppError("لا يمكن أن يكون المستودع المصدر هو نفسه المستودع الوجهة", 422);
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const line of data.lines) {
        const level = await tx.stockLevel.findUnique({
          where: { warehouseId_itemId: { warehouseId: data.fromWarehouseId, itemId: line.itemId } },
        });
        if ((level?.quantity ?? 0) < line.quantity) {
          throw new AppError(`الرصيد غير كافٍ في المستودع المصدر للصنف ${line.itemId}`, 409);
        }
      }

      const transfer = await tx.stockTransfer.create({
        data: {
          transferNumber: data.transferNumber,
          fromWarehouseId: data.fromWarehouseId,
          toWarehouseId: data.toWarehouseId,
          status: "PENDING",
          performedByUserId: req.user!.id,
          notes: data.notes,
          lines: { create: data.lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, serialNumber: l.serialNumber })) },
        },
        include: { lines: true },
      });

      // الخصم الفوري من المصدر؛ الإضافة للوجهة تتم عند تأكيد الاستلام الفعلي (receive-transfer)
      for (const line of data.lines) {
        await tx.stockLevel.update({
          where: { warehouseId_itemId: { warehouseId: data.fromWarehouseId, itemId: line.itemId } },
          data: { quantity: { decrement: line.quantity } },
        });
      }

      await writeAuditLog({ req, action: "TRANSFER", entity: "StockTransfer", entityId: transfer.id, newData: transfer }, tx as any);

      return transfer;
    });

    res.status(201).json(result);
  })
);

// تأكيد استلام المناقلة في المستودع الوجهة
stockRouter.post(
  "/transfers/:id/receive",
  requirePermission("stock", "RECEIVE"),
  asyncHandler(async (req, res) => {
    const transfer = await prisma.stockTransfer.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { lines: true },
    });

    if (transfer.status !== "PENDING" && transfer.status !== "IN_TRANSIT") {
      throw new AppError("لا يمكن استلام هذه المناقلة في حالتها الحالية", 409);
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const line of transfer.lines) {
        await tx.stockLevel.upsert({
          where: { warehouseId_itemId: { warehouseId: transfer.toWarehouseId, itemId: line.itemId } },
          create: { warehouseId: transfer.toWarehouseId, itemId: line.itemId, quantity: line.quantity },
          update: { quantity: { increment: line.quantity } },
        });
      }

      const updated = await tx.stockTransfer.update({
        where: { id: transfer.id },
        data: { status: "RECEIVED", receivedByUserId: req.user!.id, receivedDate: new Date() },
      });

      await writeAuditLog(
        { req, action: "RECEIVE", entity: "StockTransfer", entityId: transfer.id, newData: updated },
        tx as any
      );

      return updated;
    });

    res.json(result);
  })
);

// ---------------------------------------------------------------
// عرض المخزون الحالي مع التصفية
// ---------------------------------------------------------------
stockRouter.get(
  "/levels",
  requirePermission("stock", "VIEW"),
  asyncHandler(async (req, res) => {
    const { warehouseId, itemId, belowMin } = req.query;

    const levels = await prisma.stockLevel.findMany({
      where: { warehouseId: warehouseId as string | undefined, itemId: itemId as string | undefined },
      include: { item: true, warehouse: true },
    });

    const enriched = levels.map((l) => ({
      ...l,
      available: l.quantity - l.reservedQty,
      belowMin: l.quantity <= l.item.minStock,
      aboveMax: l.item.maxStock != null && l.quantity >= l.item.maxStock,
      needsReorder: l.item.reorderPoint != null && l.quantity <= l.item.reorderPoint,
    }));

    res.json(belowMin === "true" ? enriched.filter((l) => l.belowMin) : enriched);
  })
);
