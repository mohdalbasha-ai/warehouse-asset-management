import { PrismaClient } from "@prisma/client";

const CONTRACT_THRESHOLDS = [90, 60, 30, 15, 7, 0];

/**
 * يُشغَّل دوريًا (Cron / Scheduled Job) — يفحص العقود والضمانات ودفعات التوريد
 * ويُنشئ إشعارات لكل مستخدم يملك صلاحية VIEW على "contracts" ضمن نطاقه،
 * مع تفادي التكرار (لا يُنشئ إشعارًا للعقد لنفس العتبة أكثر من مرة).
 */
export async function generateAlerts(prisma: PrismaClient) {
  const now = new Date();
  let created = 0;

  // من يستقبل تنبيهات العقود: أصحاب صلاحية VIEW على contracts
  const recipients = await prisma.user.findMany({
    where: { status: "ACTIVE", roles: { some: { role: { permissions: { some: { permission: { resource: "contracts", action: "VIEW" } } } } } } },
  });

  // ---- العقود القريبة من الانتهاء ----
  const activeContracts = await prisma.contract.findMany({ where: { status: "ACTIVE" } });
  for (const contract of activeContracts) {
    const daysRemaining = Math.round((contract.endDate.getTime() - now.getTime()) / 86400000);
    const matchedThreshold = CONTRACT_THRESHOLDS.find((t) => daysRemaining === t);
    if (matchedThreshold === undefined) continue;

    for (const user of recipients) {
      const exists = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          type: "CONTRACT_EXPIRING",
          relatedEntityId: contract.id,
          message: { contains: `${matchedThreshold}` },
        },
      });
      if (exists) continue;

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: matchedThreshold === 0 ? "CONTRACT_EXPIRED" : "CONTRACT_EXPIRING",
          message: `العقد رقم ${contract.contractNumber} سينتهي خلال ${matchedThreshold} يومًا.`,
          priority: matchedThreshold <= 7 ? "CRITICAL" : matchedThreshold <= 15 ? "HIGH" : "MEDIUM",
          relatedEntityType: "Contract",
          relatedEntityId: contract.id,
        },
      });
      created++;
    }
  }

  // ---- الضمانات القريبة من الانتهاء (30 يومًا) ----
  const expiringWarranties = await prisma.warranty.findMany({
    where: { isActive: true, endDate: { lte: new Date(now.getTime() + 30 * 86400000), gte: now } },
    include: { device: true },
  });
  for (const warranty of expiringWarranties) {
    for (const user of recipients) {
      const exists = await prisma.notification.findFirst({
        where: { userId: user.id, type: "WARRANTY_EXPIRING", relatedEntityId: warranty.id },
      });
      if (exists) continue;
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "WARRANTY_EXPIRING",
          message: `ضمان الجهاز ${warranty.device.name} (${warranty.device.serialNumber}) سينتهي قريبًا.`,
          priority: "MEDIUM",
          relatedEntityType: "Warranty",
          relatedEntityId: warranty.id,
        },
      });
      created++;
    }
  }

  // ---- دفعات التوريد المتأخرة ----
  const pendingDeliveries = await prisma.contractDelivery.findMany({
    where: { actualDate: null, status: { notIn: ["CANCELLED"] } },
  });
  for (const delivery of pendingDeliveries) {
    const delayDays = Math.round((now.getTime() - delivery.agreedDate.getTime()) / 86400000);
    if (delayDays <= 0) continue;
    for (const user of recipients) {
      const exists = await prisma.notification.findFirst({
        where: { userId: user.id, type: "DELIVERY_DELAYED", relatedEntityId: delivery.id },
      });
      if (exists) continue;
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "DELIVERY_DELAYED",
          message: `دفعة التوريد رقم ${delivery.batchNumber} متأخرة منذ ${delayDays} يومًا.`,
          priority: "HIGH",
          relatedEntityType: "ContractDelivery",
          relatedEntityId: delivery.id,
        },
      });
      created++;
    }
  }

  // ---- الأصناف تحت الحد الأدنى ----
  const lowStock = await prisma.stockLevel.findMany({ include: { item: true, warehouse: true } });
  const belowMin = lowStock.filter((l) => l.quantity <= l.item.minStock);
  for (const level of belowMin) {
    for (const user of recipients) {
      const exists = await prisma.notification.findFirst({
        where: { userId: user.id, type: "STOCK_LOW", relatedEntityId: level.id },
      });
      if (exists) continue;
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "STOCK_LOW",
          message: `الصنف ${level.item.name} وصل إلى الحد الأدنى في مستودع ${level.warehouse.name}.`,
          priority: "MEDIUM",
          relatedEntityType: "StockLevel",
          relatedEntityId: level.id,
        },
      });
      created++;
    }
  }

  return { created };
}
