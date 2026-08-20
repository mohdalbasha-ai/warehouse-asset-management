import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { AppError } from "./errorHandler";

const SUPER_ADMIN = "Super Admin";

/**
 * requirePermission("devices", "EDIT")
 * يتحقق أولًا من أن أحد أدوار المستخدم يملك (resource, action)،
 * ثم — إن وُجد scopeExtractor — يتحقق أن نطاق السجل المطلوب ضمن نطاقات المستخدم.
 */
export function requirePermission(resource: string, action: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) throw new AppError("غير مصرح", 401);

    if (user.roles.includes(SUPER_ADMIN)) return next();

    const hasPermission = await prisma.rolePermission.findFirst({
      where: {
        role: { name: { in: user.roles } },
        permission: { resource, action: action as any },
      },
    });

    if (!hasPermission) {
      throw new AppError(`لا تملك صلاحية (${action}) على (${resource})`, 403);
    }

    next();
  };
}

/**
 * requireScope(async (req) => ({ centerId: <center of the record being accessed> }))
 * يمنع المستخدم من الوصول لسجلات مراكز/مديريات/مستودعات خارج نطاقه المصرَّح به.
 */
export function requireScope(
  scopeExtractor: (req: Request) => Promise<{ departmentId?: string | null; centerId?: string | null; warehouseId?: string | null }>
) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) throw new AppError("غير مصرح", 401);
    if (user.roles.includes(SUPER_ADMIN)) return next();

    // مستخدم بلا أي نطاقات محددة = مسموح له بكل شيء ضمن صلاحياته (سياسة افتراضية قابلة للتخصيص)
    if (!user.scopes || user.scopes.length === 0) return next();

    const target = await scopeExtractor(req);

    const allowed = user.scopes.some(
      (s) =>
        (!target.departmentId || s.departmentId === target.departmentId) &&
        (!target.centerId || s.centerId === target.centerId) &&
        (!target.warehouseId || s.warehouseId === target.warehouseId)
    );

    if (!allowed) {
      throw new AppError("لا تملك صلاحية الوصول لبيانات هذا النطاق (مركز/مديرية/مستودع)", 403);
    }

    next();
  };
}
