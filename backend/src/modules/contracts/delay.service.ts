import { ContractDelivery } from "@prisma/client";

export interface DeliveryDelayInfo {
  delayDays: number;
  isDelayed: boolean;
  computedStatus: "NOT_STARTED" | "DUE_SOON" | "DELAYED" | "RECEIVED" | "PARTIALLY_RECEIVED";
}

/**
 * حساب التأخير حسب القاعدة المطلوبة تمامًا:
 * - لم يُستلم بعد: delayDays = today - agreedDate
 * - استُلم: delayDays = actualDate - agreedDate
 * - delayDays <= 0  → غير متأخر
 * - delayDays > 0   → متأخر
 * القيمة مُشتقة دائمًا (لا تُخزَّن) لتبقى صحيحة عند تغيّر التاريخ الحالي.
 */
export function computeDeliveryDelay(delivery: Pick<ContractDelivery, "agreedDate" | "actualDate" | "status">): DeliveryDelayInfo {
  const agreed = new Date(delivery.agreedDate);
  agreed.setHours(0, 0, 0, 0);

  const reference = delivery.actualDate ? new Date(delivery.actualDate) : new Date();
  reference.setHours(0, 0, 0, 0);

  const diffMs = reference.getTime() - agreed.getTime();
  const delayDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const isDelayed = delayDays > 0;

  let computedStatus: DeliveryDelayInfo["computedStatus"];
  if (delivery.status === "CANCELLED") {
    computedStatus = delivery.status as any;
  } else if (delivery.actualDate) {
    computedStatus = delivery.status === "PARTIALLY_RECEIVED" ? "PARTIALLY_RECEIVED" : "RECEIVED";
  } else if (isDelayed) {
    computedStatus = "DELAYED";
  } else {
    const daysUntilDue = Math.round((agreed.getTime() - reference.getTime()) / (1000 * 60 * 60 * 24));
    computedStatus = daysUntilDue <= 7 ? "DUE_SOON" : "NOT_STARTED";
  }

  return { delayDays, isDelayed, computedStatus };
}

/** مستوى الخطورة لعقد على وشك الانتهاء — يُستخدم في الـ Dashboard والتنبيهات والـ API */
export function contractExpiryRiskLevel(daysRemaining: number): "NORMAL" | "WARNING" | "DANGER" | "SEVERE" | "EXPIRED" {
  if (daysRemaining < 0) return "EXPIRED";
  if (daysRemaining < 7) return "SEVERE";
  if (daysRemaining < 15) return "DANGER";
  if (daysRemaining <= 30) return "WARNING";
  return "NORMAL";
}
