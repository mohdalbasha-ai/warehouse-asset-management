import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../../config/db";
import { authenticate } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { asyncHandler } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../utils/audit";

export const userRouter = Router();
userRouter.use(authenticate);

const userSchema = z.object({
  fullName: z.string().min(1),
  employeeNumber: z.string().optional(),
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  centerId: z.string().uuid().optional(),
  jobTitle: z.string().optional(),
  roleIds: z.array(z.string().uuid()).default([]),
  scopes: z.array(z.object({
    departmentId: z.string().uuid().optional(),
    centerId: z.string().uuid().optional(),
    warehouseId: z.string().uuid().optional(),
  })).default([]),
});

userRouter.get(
  "/",
  requirePermission("users", "VIEW"),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      include: { roles: { include: { role: true } }, department: true, center: true },
      orderBy: { fullName: "asc" },
    });
    res.json(users.map(({ passwordHash, ...u }) => u));
  })
);

userRouter.post(
  "/",
  requirePermission("users", "CREATE"),
  asyncHandler(async (req, res) => {
    const data = userSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 10);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: data.fullName,
          employeeNumber: data.employeeNumber,
          username: data.username,
          email: data.email,
          passwordHash,
          phone: data.phone,
          departmentId: data.departmentId,
          centerId: data.centerId,
          jobTitle: data.jobTitle,
          roles: { create: data.roleIds.map((roleId) => ({ roleId })) },
          scopes: { create: data.scopes },
        },
      });
      await writeAuditLog({ req, action: "CREATE", entity: "User", entityId: user.id, newData: { ...user, passwordHash: undefined } }, tx as any);
      return user;
    });

    const { passwordHash: _omit, ...safe } = created;
    res.status(201).json(safe);
  })
);

const updateUserSchema = userSchema.omit({ password: true }).partial().extend({
  password: z.string().min(8).optional(),
});

userRouter.put(
  "/:id",
  requirePermission("users", "EDIT"),
  asyncHandler(async (req, res) => {
    const data = updateUserSchema.parse(req.body);
    const before = await prisma.user.findUniqueOrThrow({ where: { id: req.params.id } });

    const updated = await prisma.$transaction(async (tx) => {
      const updateData: any = {
        fullName: data.fullName,
        employeeNumber: data.employeeNumber,
        username: data.username,
        email: data.email,
        phone: data.phone,
        departmentId: data.departmentId,
        centerId: data.centerId,
        jobTitle: data.jobTitle,
      };
      if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 10);

      const user = await tx.user.update({ where: { id: req.params.id }, data: updateData });

      if (data.roleIds) {
        await tx.userRole.deleteMany({ where: { userId: user.id } });
        await tx.userRole.createMany({ data: data.roleIds.map((roleId) => ({ userId: user.id, roleId })) });
      }
      if (data.scopes) {
        await tx.userScope.deleteMany({ where: { userId: user.id } });
        await tx.userScope.createMany({ data: data.scopes.map((s) => ({ userId: user.id, ...s })) });
      }

      await writeAuditLog(
        { req, action: "UPDATE", entity: "User", entityId: user.id, oldData: { ...before, passwordHash: undefined }, newData: { ...user, passwordHash: undefined } },
        tx as any
      );

      return user;
    });

    const { passwordHash: _omit, ...safe } = updated;
    res.json(safe);
  })
);

userRouter.delete(
  "/:id",
  requirePermission("users", "DELETE"),
  asyncHandler(async (req, res) => {
    const before = await prisma.user.findUniqueOrThrow({ where: { id: req.params.id } });
    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id: req.params.id }, data: { status: "INACTIVE" } });
      await writeAuditLog({ req, action: "DELETE", entity: "User", entityId: user.id, oldData: { ...before, passwordHash: undefined }, newData: { ...user, passwordHash: undefined } }, tx as any);
      return user;
    });
    const { passwordHash: _omit, ...safe } = updated;
    res.json(safe);
  })
);

// -------------------- الأدوار والصلاحيات --------------------
export const roleRouter = Router();
roleRouter.use(authenticate);

roleRouter.get(
  "/",
  requirePermission("roles", "VIEW"),
  asyncHandler(async (_req, res) => {
    res.json(await prisma.role.findMany({ include: { permissions: { include: { permission: true } } } }));
  })
);

const roleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissionIds: z.array(z.string().uuid()).default([]),
});

roleRouter.post(
  "/",
  requirePermission("roles", "CREATE"),
  asyncHandler(async (req, res) => {
    const data = roleSchema.parse(req.body);
    const created = await prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          name: data.name,
          description: data.description,
          permissions: { create: data.permissionIds.map((permissionId) => ({ permissionId })) },
        },
      });
      await writeAuditLog({ req, action: "CREATE", entity: "Role", entityId: role.id, newData: role }, tx as any);
      return role;
    });
    res.status(201).json(created);
  })
);

roleRouter.put(
  "/:id",
  requirePermission("roles", "EDIT"),
  asyncHandler(async (req, res) => {
    const data = roleSchema.partial().parse(req.body);
    const updated = await prisma.$transaction(async (tx) => {
      const role = await tx.role.update({ where: { id: req.params.id }, data: { name: data.name, description: data.description } });
      if (data.permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
        await tx.rolePermission.createMany({ data: data.permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })) });
      }
      await writeAuditLog({ req, action: "UPDATE", entity: "Role", entityId: role.id, newData: role }, tx as any);
      return role;
    });
    res.json(updated);
  })
);

roleRouter.get(
  "/permissions/all",
  requirePermission("roles", "VIEW"),
  asyncHandler(async (_req, res) => {
    res.json(await prisma.permission.findMany({ orderBy: [{ resource: "asc" }, { action: "asc" }] }));
  })
);
