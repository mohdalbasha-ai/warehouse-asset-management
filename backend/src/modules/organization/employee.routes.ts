import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { asyncHandler } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../utils/audit";

export const employeeRouter = Router();
employeeRouter.use(authenticate);

const employeeSchema = z.object({
  fullName: z.string().min(1),
  employeeNumber: z.string().min(1),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  departmentId: z.string().uuid(),
  centerId: z.string().uuid(),
  notes: z.string().optional(),
});

employeeRouter.get(
  "/",
  requirePermission("employees", "VIEW"),
  asyncHandler(async (req, res) => {
    const { departmentId, centerId } = req.query;
    const employees = await prisma.employee.findMany({
      where: {
        departmentId: departmentId as string | undefined,
        centerId: centerId as string | undefined,
      },
      include: { department: true, center: true },
      orderBy: { fullName: "asc" },
    });
    res.json(employees);
  })
);

employeeRouter.get(
  "/:id/transfer-history",
  requirePermission("employees", "VIEW"),
  asyncHandler(async (req, res) => {
    const history = await prisma.employeeTransferHistory.findMany({
      where: { employeeId: req.params.id },
      orderBy: { transferDate: "desc" },
    });
    res.json(history);
  })
);

employeeRouter.post(
  "/",
  requirePermission("employees", "CREATE"),
  asyncHandler(async (req, res) => {
    const data = employeeSchema.parse(req.body);
    const created = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.create({ data });
      await writeAuditLog({ req, action: "CREATE", entity: "Employee", entityId: emp.id, newData: emp }, tx as any);
      return emp;
    });
    res.status(201).json(created);
  })
);

const transferSchema = z.object({
  toDepartmentId: z.string().uuid(),
  toCenterId: z.string().uuid(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * نقل موظف بين مركز/مديرية:
 * 1) يُحفظ سجل في EmployeeTransferHistory (لا يُفقد أي تاريخ سابق).
 * 2) يُحدَّث departmentId/centerId الحاليان في Employee.
 * كل ذلك ضمن Transaction واحدة.
 */
employeeRouter.post(
  "/:id/transfer",
  requirePermission("employees", "TRANSFER"),
  asyncHandler(async (req, res) => {
    const data = transferSchema.parse(req.body);
    const employee = await prisma.employee.findUniqueOrThrow({ where: { id: req.params.id } });

    const result = await prisma.$transaction(async (tx) => {
      const history = await tx.employeeTransferHistory.create({
        data: {
          employeeId: employee.id,
          fromDepartmentId: employee.departmentId,
          fromCenterId: employee.centerId,
          toDepartmentId: data.toDepartmentId,
          toCenterId: data.toCenterId,
          transferredBy: req.user!.id,
          reason: data.reason,
          notes: data.notes,
        },
      });

      const updatedEmployee = await tx.employee.update({
        where: { id: employee.id },
        data: { departmentId: data.toDepartmentId, centerId: data.toCenterId },
      });

      await writeAuditLog(
        {
          req,
          action: "TRANSFER",
          entity: "Employee",
          entityId: employee.id,
          oldData: { departmentId: employee.departmentId, centerId: employee.centerId },
          newData: { departmentId: data.toDepartmentId, centerId: data.toCenterId },
        },
        tx as any
      );

      return { employee: updatedEmployee, history };
    });

    res.json(result);
  })
);
