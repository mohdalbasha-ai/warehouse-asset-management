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

  // Security
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: [
        "https://warehouse-frontend-irof.onrender.com",
        "http://localhost:5173",
      ],
      credentials: true,
    })
  );

  // JSON body
  app.use(express.json({ limit: "5mb" }));

  // Login rate limit
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
  });

  // Authentication
  app.use("/api/auth", authLimiter, authRouter);

  // Organization
  app.use("/api/departments", departmentRouter);
  app.use("/api/centers", centerRouter);
  app.use("/api/employees", employeeRouter);

  // Contracts
  app.use("/api/contracts", contractRouter);

  // Inventory
  app.use("/api/stock", stockRouter);

  // Devices
  app.use("/api/device-assignments", deviceAssignmentRouter);
  app.use("/api/devices", deviceRouter);

  // Suppliers
  app.use("/api/suppliers", supplierRouter);

  // Warehouses
  app.use("/api/warehouses", warehouseRouter);

  // Items
  app.use("/api/items", itemRouter);

  // Warranty
  app.use("/api/warranty", warrantyRouter);

  // Maintenance
  app.use("/api/maintenance", maintenanceRouter);

  // Notifications
  app.use("/api/notifications", notificationRouter);

  // Dashboard
  app.use("/api/dashboard", dashboardRouter);

  // Users & Roles
  app.use("/api/users", userRouter);
  app.use("/api/roles", roleRouter);

  // Audit
  app.use("/api/audit-log", auditLogRouter);

  // Reports
  app.use("/api/reports", reportRouter);

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "warehouse-api",
    });
  });

  // Error handler - must be last
  app.use(errorHandler);

  return app;
}
