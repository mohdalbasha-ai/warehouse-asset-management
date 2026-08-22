import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../../config/db";
import { env } from "../../config/env";
import { authenticate } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { asyncHandler, AppError } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../utils/audit";

export const attachmentRouter = Router();
attachmentRouter.use(authenticate);

// أنواع الملفات المسموحة فقط، كما هو مطلوب: PDF, صور, Word, Excel
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png", "image/jpeg", "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

fs.mkdirSync(env.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadDir),
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname).slice(0, 10);
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new AppError("نوع الملف غير مسموح — المسموح: PDF, صور, Word, Excel", 415) as any);
    }
    cb(null, true);
  },
});

// الكيانات المسموح ربط المرفق بها وحقل الـ FK المطابق في جدول Attachment
const LINK_FIELDS: Record<string, string> = {
  contract: "contractId",
  delivery: "deliveryId",
  device: "deviceId",
  assignment: "assignmentId",
  receipt: "receiptId",
  issue: "issueId",
  maintenanceRequest: "maintenanceRequestId",
};

const uploadSchema = z.object({
  entityType: z.enum(["contract", "delivery", "device", "assignment", "receipt", "issue", "maintenanceRequest"]),
  entityId: z.string().uuid(),
});

attachmentRouter.post(
  "/",
  requirePermission("attachments", "CREATE"),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError("لم يتم إرفاق أي ملف", 422);
    const { entityType, entityId } = uploadSchema.parse(req.body);
    const linkField = LINK_FIELDS[entityType];

    const created = await prisma.$transaction(async (tx) => {
      const attachment = await tx.attachment.create({
        data: {
          fileName: req.file!.originalname,
          fileType: req.file!.mimetype,
          filePath: req.file!.filename,
          uploadedByUserId: req.user!.id,
          [linkField]: entityId,
        } as any,
      });
      await writeAuditLog(
        { req, action: "CREATE", entity: "Attachment", entityId: attachment.id, newData: { fileName: attachment.fileName, entityType, entityId } },
        tx as any
      );
      return attachment;
    });

    res.status(201).json(created);
  })
);

attachmentRouter.get(
  "/",
  requirePermission("attachments", "VIEW"),
  asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.query as { entityType?: string; entityId?: string };
    if (!entityType || !entityId || !LINK_FIELDS[entityType]) {
      throw new AppError("يجب تحديد entityType و entityId صحيحين", 422);
    }
    const attachments = await prisma.attachment.findMany({
      where: { [LINK_FIELDS[entityType]]: entityId } as any,
      orderBy: { uploadedAt: "desc" },
    });
    res.json(attachments);
  })
);

attachmentRouter.get(
  "/:id/download",
  requirePermission("attachments", "VIEW"),
  asyncHandler(async (req, res) => {
    const attachment = await prisma.attachment.findUniqueOrThrow({ where: { id: req.params.id } });
    const fullPath = path.join(env.uploadDir, attachment.filePath);
    if (!fs.existsSync(fullPath)) throw new AppError("الملف غير موجود على الخادم", 404);
    res.download(fullPath, attachment.fileName);
  })
);

attachmentRouter.delete(
  "/:id",
  requirePermission("attachments", "DELETE"),
  asyncHandler(async (req, res) => {
    const attachment = await prisma.attachment.findUniqueOrThrow({ where: { id: req.params.id } });
    const fullPath = path.join(env.uploadDir, attachment.filePath);

    await prisma.$transaction(async (tx) => {
      await tx.attachment.delete({ where: { id: attachment.id } });
      await writeAuditLog({ req, action: "DELETE", entity: "Attachment", entityId: attachment.id, oldData: attachment }, tx as any);
    });

    fs.existsSync(fullPath) && fs.unlinkSync(fullPath);
    res.json({ ok: true });
  })
);
