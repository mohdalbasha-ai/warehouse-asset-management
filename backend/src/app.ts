import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { authRouter } from "./modules/auth/auth.routes";
import { departmentRouter } from "./modules/organization/department.routes";
import { centerRouter } from "./modules/organization/center.routes";
import { employeeRouter } from "./modules/organization/employee.routes";
import { contractRouter } from "./modules/contracts/contract.routes";
import { stockRouter } from "./modules/inventory/stock.routes";
import { deviceAssignmentRouter } from "./modules/devices/deviceAssignment.routes";
import { deviceRouter } from "./modules/devices/device.routes";
import { supplierRouter } from "./modules/suppliers/supplier.routes";
import { warehouseRouter } from "./modules/warehouses/warehouse.routes";
import { itemRouter } from "./modules/items/item.routes";
import { warrantyRouter } from "./modules/warranty/warranty.routes";
import { maintenanceRouter } from "./modules/maintenance/maintenance.routes";
import { notificationRouter } from "./modules/notifications/notification.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { userRouter, roleRouter } from "./modules/users/user.routes";
import { auditLogRouter } from "./modules/audit/auditLog.routes";
import { reportRouter } from "./modules/reports/report.routes";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(",").map((v) => v.trim()) : true, credentials: true }));
  app.use(express.json({ limit: "5mb" }));

  // حماية أساسية من هجمات القوة الغاشمة على تسجيل الدخول
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
  app.use("/api/auth", authLimiter, authRouter);

  app.use("/api/departments", departmentRouter);
  app.use("/api/centers", centerRouter);
  app.use("/api/employees", employeeRouter);
  app.use("/api/contracts", contractRouter);
  app.use("/api/stock", stockRouter);
  app.use("/api/device-assignments", deviceAssignmentRouter);
  app.use("/api/devices", deviceRouter);
  app.use("/api/suppliers", supplierRouter);
  app.use("/api/warehouses", warehouseRouter);
  app.use("/api/items", itemRouter);
  app.use("/api/warranty", warrantyRouter);
  app.use("/api/maintenance", maintenanceRouter);
  app.use("/api/notifications", notificationRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/users", userRouter);
  app.use("/api/roles", roleRouter);
  app.use("/api/audit-log", auditLogRouter);
  app.use("/api/reports", reportRouter);

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  // يجب أن يكون آخر middleware
  app.use(errorHandler);

  return app;
}
