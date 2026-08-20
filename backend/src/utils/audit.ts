import { Request } from "express";
import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../config/db";

interface AuditParams {
  req: Request;
  action: "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT" | "TRANSFER" | "ISSUE" | "RECEIVE";
  entity: string;
  entityId?: string;
  oldData?: unknown;
  newData?: unknown;
}

/**
 * يُستدعى داخل نفس الـ Transaction الخاصة بالعملية الأصلية عند تمرير tx،
 * بحيث لا يُسجَّل Audit Log إن فشلت العملية (Atomicity).
 */
export async function writeAuditLog(params: AuditParams, tx?: PrismaClient) {
  const client = tx ?? defaultPrisma;
  await client.auditLog.create({
    data: {
      userId: params.req.user?.id,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      screen: params.req.originalUrl,
      oldData: params.oldData as any,
      newData: params.newData as any,
      ipAddress: params.req.ip,
    },
  });
}
