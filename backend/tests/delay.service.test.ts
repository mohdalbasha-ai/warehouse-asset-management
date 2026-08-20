import { describe, it, expect } from "vitest";
import { computeDeliveryDelay, contractExpiryRiskLevel } from "../src/modules/contracts/delay.service";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number): Date {
  return daysAgo(-n);
}

describe("computeDeliveryDelay", () => {
  it("غير متأخر إذا لم يُستلم والموعد لم يحن بعد", () => {
    const result = computeDeliveryDelay({ agreedDate: daysFromNow(10), actualDate: null, status: "NOT_STARTED" });
    expect(result.isDelayed).toBe(false);
    expect(result.delayDays).toBeLessThanOrEqual(0);
  });

  it("متأخر إذا لم يُستلم وتجاوز الموعد المتفق عليه", () => {
    const result = computeDeliveryDelay({ agreedDate: daysAgo(5), actualDate: null, status: "NOT_STARTED" });
    expect(result.isDelayed).toBe(true);
    expect(result.delayDays).toBe(5);
    expect(result.computedStatus).toBe("DELAYED");
  });

  it("يحسب التأخير بناءً على تاريخ الاستلام الفعلي إن وُجد", () => {
    const result = computeDeliveryDelay({ agreedDate: daysAgo(10), actualDate: daysAgo(3), status: "RECEIVED" });
    expect(result.delayDays).toBe(7); // استُلم بعد 7 أيام من الموعد المتفق عليه
    expect(result.isDelayed).toBe(true);
    expect(result.computedStatus).toBe("RECEIVED");
  });

  it("غير متأخر إذا استُلم في الموعد بالضبط", () => {
    const date = daysAgo(2);
    const result = computeDeliveryDelay({ agreedDate: date, actualDate: date, status: "RECEIVED" });
    expect(result.delayDays).toBe(0);
    expect(result.isDelayed).toBe(false);
  });
});

describe("contractExpiryRiskLevel", () => {
  it("EXPIRED عند تجاوز تاريخ الانتهاء", () => {
    expect(contractExpiryRiskLevel(-1)).toBe("EXPIRED");
  });
  it("SEVERE أقل من 7 أيام", () => {
    expect(contractExpiryRiskLevel(5)).toBe("SEVERE");
  });
  it("DANGER بين 7 و15 يوم", () => {
    expect(contractExpiryRiskLevel(10)).toBe("DANGER");
  });
  it("WARNING بين 15 و30 يوم", () => {
    expect(contractExpiryRiskLevel(25)).toBe("WARNING");
  });
  it("NORMAL أكثر من 30 يوم", () => {
    expect(contractExpiryRiskLevel(45)).toBe("NORMAL");
  });
});
