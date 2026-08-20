import { Router } from "express";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";
import { generateAlerts } from "./alertGenerator.service";

export const notificationRouter = Router();
notificationRouter.use(authenticate);

notificationRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { unreadOnly } = req.query;
    res.json(
      await prisma.notification.findMany({
        where: { userId: req.user!.id, isRead: unreadOnly === "true" ? false : undefined },
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    );
  })
);

notificationRouter.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const notif = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json(notif);
  })
);

notificationRouter.patch(
  "/read-all",
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: req.user!.id, isRead: false }, data: { isRead: true } });
    res.json({ ok: true });
  })
);

/**
 * يُستدعى من Scheduled Job (cron) خارجيًا، أو يدويًا من مستخدم لديه صلاحية إدارية.
 * في الإنتاج: استبدله بـ node-cron يستدعي generateAlerts كل ساعة مثلاً.
 */
notificationRouter.post(
  "/generate",
  asyncHandler(async (_req, res) => {
    const result = await generateAlerts(prisma);
    res.json(result);
  })
);
