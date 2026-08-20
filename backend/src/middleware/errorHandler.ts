import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// يجب أن تكون آخر middleware في السلسلة
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: "Validation error",
      details: err.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Prisma unique constraint violation (serial number مكرر، username مكرر، إلخ)
  if (typeof err === "object" && err !== null && "code" in err && (err as any).code === "P2002") {
    return res.status(409).json({
      error: "قيمة مكررة تنتهك قيدًا فريدًا (Unique Constraint)",
      fields: (err as any).meta?.target,
    });
  }

  if (typeof err === "object" && err !== null && "code" in err && (err as any).code === "P2003") {
    return res.status(409).json({ error: "مرجع غير صالح (Foreign Key Constraint)" });
  }

  console.error(err);
  return res.status(500).json({ error: "خطأ داخلي في الخادم" });
}

// يلف async route handlers حتى تصل الأخطاء لـ errorHandler دون try/catch متكرر
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
