import { Router } from "express";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";
import { contractExpiryRiskLevel } from "../contracts/delay.service";

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 86400000);

    const [
      totalWarehouses,
      totalItems,
      totalDevices,
      devicesDelivered,
      devicesInWarehouse,
      devicesUnderMaintenance,
      devicesOutOfService,
      activeContracts,
      expiringContractsCount,
      expiredContractsCount,
      upcomingDeliveries,
      delayedDeliveries,
      openMaintenanceRequests,
      criticalMaintenanceRequests,
      expiringWarrantiesCount,
      stockLevels,
    ] = await Promise.all([
      prisma.warehouse.count({ where: { status: "ACTIVE" } }),
      prisma.item.count({ where: { status: "ACTIVE" } }),
      prisma.device.count(),
      prisma.device.count({ where: { status: "DELIVERED" } }),
      prisma.device.count({ where: { status: "IN_WAREHOUSE" } }),
      prisma.device.count({ where: { status: "UNDER_MAINTENANCE" } }),
      prisma.device.count({ where: { status: "OUT_OF_SERVICE" } }),
      prisma.contract.count({ where: { status: "ACTIVE" } }),
      prisma.contract.count({ where: { status: "ACTIVE", endDate: { lte: in30Days, gte: now } } }),
      prisma.contract.count({ where: { status: "EXPIRED" } }),
      prisma.contractDelivery.count({ where: { actualDate: null, agreedDate: { lte: in30Days, gte: now } } }),
      prisma.contractDelivery.count({ where: { actualDate: null, agreedDate: { lt: now } } }),
      prisma.maintenanceRequest.count({ where: { status: { notIn: ["CLOSED", "REJECTED"] } } }),
      prisma.maintenanceRequest.count({ where: { priority: "CRITICAL", status: { notIn: ["CLOSED", "REJECTED"] } } }),
      prisma.warranty.count({ where: { isActive: true, endDate: { lte: in30Days, gte: now } } }),
      prisma.stockLevel.findMany({ include: { item: true } }),
    ]);

    const lowStockItems = stockLevels.filter((l) => l.quantity <= l.item.minStock).length;

    res.json({
      warehouses: totalWarehouses,
      items: totalItems,
      devices: {
        total: totalDevices,
        delivered: devicesDelivered,
        inWarehouse: devicesInWarehouse,
        underMaintenance: devicesUnderMaintenance,
        outOfService: devicesOutOfService,
      },
      contracts: {
        active: activeContracts,
        expiringSoon: expiringContractsCount,
        expired: expiredContractsCount,
      },
      deliveries: {
        upcoming: upcomingDeliveries,
        delayed: delayedDeliveries,
      },
      maintenance: {
        open: openMaintenanceRequests,
        critical: criticalMaintenanceRequests,
      },
      warrantiesExpiringSoon: expiringWarrantiesCount,
      lowStockItems,
    });
  })
);

/** بطاقات العقود القريبة من الانتهاء مع الألوان — لعرضها مباشرة في الـ Dashboard */
dashboardRouter.get(
  "/contracts-expiring-cards",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const contracts = await prisma.contract.findMany({
      where: { status: "ACTIVE", endDate: { lte: new Date(now.getTime() + 30 * 86400000) } },
      include: { supplier: true },
      orderBy: { endDate: "asc" },
      take: 20,
    });
    res.json(
      contracts.map((c) => {
        const daysRemaining = Math.round((c.endDate.getTime() - now.getTime()) / 86400000);
        return {
          contractNumber: c.contractNumber,
          supplierName: c.supplier.name,
          daysRemaining,
          riskLevel: contractExpiryRiskLevel(daysRemaining),
        };
      })
    );
  })
);
