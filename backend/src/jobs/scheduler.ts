import cron from "node-cron";
import { prisma } from "../config/db";
import { generateAlerts } from "../modules/notifications/alertGenerator.service";

/**
 * يشغّل محرك التنبيهات تلقائيًا كل ساعة (بدل استدعائه يدويًا فقط عبر
 * POST /api/notifications/generate). يُستدعى مرة واحدة من server.ts عند إقلاع الخادم.
 */
export function startScheduledJobs() {
  // كل ساعة في الدقيقة صفر
  cron.schedule("0 * * * *", async () => {
    try {
      const result = await generateAlerts(prisma);
      if (result.created > 0) {
        console.log(`🔔 تم إنشاء ${result.created} إشعارًا جديدًا (تشغيل مجدول)`);
      }
    } catch (err) {
      console.error("فشل تشغيل محرك التنبيهات المجدول:", err);
    }
  });

  console.log("⏰ جدولة محرك التنبيهات: يعمل كل ساعة");
}
