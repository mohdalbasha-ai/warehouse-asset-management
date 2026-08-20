import { PrismaClient } from "@prisma/client";

export type CoverageResult =
  | { coverageType: "WARRANTY"; warrantyId: string }
  | { coverageType: "MAINTENANCE_CONTRACT"; contractId: string }
  | { coverageType: "OUT_OF_COVERAGE" };

/**
 * يحدد تغطية الصيانة لجهاز معيّن في تاريخ اليوم:
 * 1) هل الجهاز ضمن فترة ضمان فعالة؟
 * 2) إن لم يكن → هل هناك عقد صيانة فعال مرتبط بالجهاز (عبر contractId)؟
 * 3) وإلا → خارج التغطية، ويتطلب اعتماد قبل التنفيذ.
 */
export async function determineCoverage(prisma: PrismaClient, deviceId: string): Promise<CoverageResult> {
  const now = new Date();

  const warranty = await prisma.warranty.findUnique({ where: { deviceId } });
  if (warranty && warranty.isActive && warranty.startDate <= now && warranty.endDate >= now) {
    return { coverageType: "WARRANTY", warrantyId: warranty.id };
  }

  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (device?.contractId) {
    const maintenanceContract = await prisma.maintenanceContract.findFirst({
      where: { contractId: device.contractId, isActive: true, startDate: { lte: now }, endDate: { gte: now } },
    });
    if (maintenanceContract) {
      return { coverageType: "MAINTENANCE_CONTRACT", contractId: device.contractId };
    }
  }

  return { coverageType: "OUT_OF_COVERAGE" };
}
