import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { asyncHandler } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../utils/audit";

export const deviceRouter = Router();
deviceRouter.use(authenticate);

const deviceSchema = z.object({
  internalNumber: z.string().min(1),
  itemId: z.string().uuid(),
  deviceType: z.string().optional(),
  name: z.string().min(1),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().min(1),
  assetNumber: z.string().optional(),
  purchaseDate: z.coerce.date().optional(),
  receivedDate: z.coerce.date().optional(),
  supplierId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  contractDeliveryId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  centerId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

deviceRouter.get(
  "/",
  requirePermission("devices", "VIEW"),
  asyncHandler(async (req, res) => {
    const { status, warehouseId, centerId, contractId, employeeId } = req.query;
    res.json(
      await prisma.device.findMany({
        where: {
          status: status as any,
          warehouseId: warehouseId as string | undefined,
          centerId: centerId as string | undefined,
          contractId: contractId as string | undefined,
          currentEmployeeId: employeeId as string | undefined,
        },
        include: { item: true, warehouse: true, contract: true, warranty: true },
        orderBy: { createdAt: "desc" },
      })
    );
  })
);

deviceRouter.post(
  "/",
  requirePermission("devices", "CREATE"),
  asyncHandler(async (req, res) => {
    const data = deviceSchema.parse(req.body);
    // Serial Number فريد (مفروض أيضًا على مستوى DB @unique) — رسالة أوضح هنا
    const dup = await prisma.device.findUnique({ where: { serialNumber: data.serialNumber } });
    if (dup) {
      return res.status(409).json({ error: `Serial Number مكرر: ${data.serialNumber}` });
    }

    const created = await prisma.$transaction(async (tx) => {
      const device = await tx.device.create({ data: { ...data, status: "NEW" } });
      await writeAuditLog({ req, action: "CREATE", entity: "Device", entityId: device.id, newData: device }, tx as any);
      return device;
    });
    res.status(201).json(created);
  })
);

deviceRouter.put(
  "/:id",
  requirePermission("devices", "EDIT"),
  asyncHandler(async (req, res) => {
    const data = deviceSchema.partial().parse(req.body);
    const before = await prisma.device.findUniqueOrThrow({ where: { id: req.params.id } });
    const updated = await prisma.$transaction(async (tx) => {
      const device = await tx.device.update({ where: { id: req.params.id }, data });
      await writeAuditLog({ req, action: "UPDATE", entity: "Device", entityId: device.id, oldData: before, newData: device }, tx as any);
      return device;
    });
    res.json(updated);
  })
);

const statusSchema = z.object({
  status: z.enum([
    "NEW", "IN_WAREHOUSE", "DELIVERED", "IN_USE", "UNDER_MAINTENANCE",
    "FAULTY", "OUT_OF_SERVICE", "RETURNED", "LOST", "DAMAGED",
  ]),
  notes: z.string().optional(),
});

deviceRouter.patch(
  "/:id/status",
  requirePermission("devices", "EDIT"),
  asyncHandler(async (req, res) => {
    const data = statusSchema.parse(req.body);
    const before = await prisma.device.findUniqueOrThrow({ where: { id: req.params.id } });
    const updated = await prisma.$transaction(async (tx) => {
      const device = await tx.device.update({ where: { id: req.params.id }, data: { status: data.status, notes: data.notes ?? before.notes } });
      await writeAuditLog({ req, action: "UPDATE", entity: "Device", entityId: device.id, oldData: before, newData: device }, tx as any);
      return device;
    });
    res.json(updated);
  })
);

/**
 * تاريخ الجهاز الكامل منذ دخوله المؤسسة حتى الآن —
 * العقد ← الدفعة ← الضمان ← عمليات التسليم/الإرجاع ← طلبات الصيانة ومراحلها
 * تمامًا كما هو مطلوب: "فتح جهاز واحد ومعرفة تاريخه الكامل".
 */
deviceRouter.get(
  "/:id/full-history",
  requirePermission("devices", "VIEW"),
  asyncHandler(async (req, res) => {
    const device = await prisma.device.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        item: true,
        contract: { include: { supplier: true } },
        contractDelivery: true,
        warehouse: true,
        warranty: true,
        assignments: { include: { employee: true, center: true }, orderBy: { date: "asc" } },
        maintenanceRequests: {
          include: { actions: { orderBy: { date: "asc" } } },
          orderBy: { requestDate: "asc" },
        },
        attachments: true,
      },
    });
    res.json(device);
  })
);
