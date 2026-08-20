import { Router } from "express";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { asyncHandler } from "../../middleware/errorHandler";
import { toCsv } from "../../utils/csv";
import { computeDeliveryDelay } from "../contracts/delay.service";

export const reportRouter = Router();
reportRouter.use(authenticate);

function sendCsv(res: any, filename: string, rows: Record<string, unknown>[]) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(toCsv(rows));
}

// تقرير المخزون
reportRouter.get(
  "/inventory",
  requirePermission("reports", "EXPORT"),
  asyncHandler(async (req, res) => {
    const levels = await prisma.stockLevel.findMany({ include: { item: true, warehouse: true } });
    const rows = levels.map((l) => ({
      المستودع: l.warehouse.name,
      الصنف: l.item.name,
      رقم_الصنف: l.item.itemNumber,
      الرصيد: l.quantity,
      المحجوز: l.reservedQty,
      المتاح: l.quantity - l.reservedQty,
      الحد_الأدنى: l.item.minStock,
    }));
    req.query.format === "json" ? res.json(rows) : sendCsv(res, "inventory-report.csv", rows);
  })
);

// تقرير الأجهزة
reportRouter.get(
  "/devices",
  requirePermission("reports", "EXPORT"),
  asyncHandler(async (req, res) => {
    const devices = await prisma.device.findMany({ include: { item: true, warehouse: true, contract: true } });
    const rows = devices.map((d) => ({
      الرقم_الداخلي: d.internalNumber,
      الاسم: d.name,
      Serial_Number: d.serialNumber,
      الحالة: d.status,
      المستودع: d.warehouse?.name ?? "-",
      العقد: d.contract?.contractNumber ?? "-",
    }));
    req.query.format === "json" ? res.json(rows) : sendCsv(res, "devices-report.csv", rows);
  })
);

// تقرير العقود
reportRouter.get(
  "/contracts",
  requirePermission("reports", "EXPORT"),
  asyncHandler(async (req, res) => {
    const contracts = await prisma.contract.findMany({ include: { supplier: true } });
    const rows = contracts.map((c) => ({
      رقم_العقد: c.contractNumber,
      الاسم: c.name,
      النوع: c.type,
      المورد: c.supplier.name,
      تاريخ_البداية: c.startDate.toISOString().slice(0, 10),
      تاريخ_النهاية: c.endDate.toISOString().slice(0, 10),
      الحالة: c.status,
      القيمة: c.value.toString(),
    }));
    req.query.format === "json" ? res.json(rows) : sendCsv(res, "contracts-report.csv", rows);
  })
);

// تقرير التوريدات المتأخرة
reportRouter.get(
  "/deliveries-delayed",
  requirePermission("reports", "EXPORT"),
  asyncHandler(async (req, res) => {
    const deliveries = await prisma.contractDelivery.findMany({ where: { actualDate: null }, include: { contract: { include: { supplier: true } } } });
    const rows = deliveries
      .map((d) => ({ d, delay: computeDeliveryDelay(d) }))
      .filter((x) => x.delay.isDelayed)
      .map((x) => ({
        العقد: x.d.contract.contractNumber,
        المورد: x.d.contract.supplier.name,
        الدفعة: x.d.batchNumber,
        موعد_التوريد: x.d.agreedDate.toISOString().slice(0, 10),
        أيام_التأخير: x.delay.delayDays,
      }));
    req.query.format === "json" ? res.json(rows) : sendCsv(res, "delayed-deliveries-report.csv", rows);
  })
);

// تقرير الصيانة
reportRouter.get(
  "/maintenance",
  requirePermission("reports", "EXPORT"),
  asyncHandler(async (req, res) => {
    const requests = await prisma.maintenanceRequest.findMany({ include: { device: true, employee: true } });
    const rows = requests.map((r) => ({
      رقم_الطلب: r.requestNumber,
      الجهاز: r.device.name,
      الموظف: r.employee.fullName,
      الأولوية: r.priority,
      الحالة: r.status,
      التغطية: r.coverageType ?? "-",
      التكلفة: r.cost?.toString() ?? "-",
    }));
    req.query.format === "json" ? res.json(rows) : sendCsv(res, "maintenance-report.csv", rows);
  })
);
