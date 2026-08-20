import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "./errorHandler";

export interface AuthUser {
  id: string;
  roles: string[];        // أسماء الأدوار
  scopes: {                // النطاقات المسموحة (فارغ = بلا قيود إن كان Super Admin)
    departmentId?: string | null;
    centerId?: string | null;
    warehouseId?: string | null;
  }[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError("غير مصرح — الرجاء تسجيل الدخول", 401);
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, env.jwtAccessSecret) as AuthUser;
    req.user = payload;
    next();
  } catch {
    throw new AppError("رمز الدخول غير صالح أو منتهي", 401);
  }
}
