import { PrismaClient, PermissionAction } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const RESOURCES = [
  "departments", "centers", "warehouses", "employees", "items", "devices",
  "device-assignments", "stock", "contracts", "contract-deliveries",
  "maintenance", "warranty", "suppliers", "users", "roles", "reports",
  "audit-log", "notifications", "dashboard",
];

const ACTIONS: PermissionAction[] = [
  "VIEW", "CREATE", "EDIT", "DELETE", "APPROVE", "REJECT",
  "EXPORT", "PRINT", "RECEIVE", "ISSUE", "TRANSFER", "MAINTENANCE", "CONTRACTS",
];

async function main() {
  console.log("🌱 Seeding permissions...");
  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      await prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        create: { resource, action },
        update: {},
      });
    }
  }

  console.log("🌱 Seeding roles...");
  const superAdmin = await prisma.role.upsert({
    where: { name: "Super Admin" },
    create: { name: "Super Admin", description: "صلاحية كاملة على كامل النظام" },
    update: {},
  });

  const warehouseKeeper = await prisma.role.upsert({
    where: { name: "أمين مستودع" },
    create: { name: "أمين مستودع", description: "إدارة حركات المستودع والأصناف" },
    update: {},
  });

  const contractsManager = await prisma.role.upsert({
    where: { name: "مدير العقود" },
    create: { name: "مدير العقود", description: "إدارة العقود والدفعات والموردين" },
    update: {},
  });

  // منح كل الصلاحيات لـ Super Admin
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdmin.id, permissionId: perm.id } },
      create: { roleId: superAdmin.id, permissionId: perm.id },
      update: {},
    });
  }

  // صلاحيات أمين المستودع
  const warehousePerms = await prisma.permission.findMany({
    where: { resource: { in: ["warehouses", "items", "devices", "device-assignments", "stock"] } },
  });
  for (const perm of warehousePerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: warehouseKeeper.id, permissionId: perm.id } },
      create: { roleId: warehouseKeeper.id, permissionId: perm.id },
      update: {},
    });
  }

  // صلاحيات مدير العقود
  const contractPerms = await prisma.permission.findMany({
    where: { resource: { in: ["contracts", "contract-deliveries", "suppliers"] } },
  });
  for (const perm of contractPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: contractsManager.id, permissionId: perm.id } },
      create: { roleId: contractsManager.id, permissionId: perm.id },
      update: {},
    });
  }

  console.log("🌱 Seeding initial Super Admin user...");
  const passwordHash = await bcrypt.hash("ChangeMe@123", 10);
  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    create: {
      fullName: "مدير النظام",
      username: "admin",
      email: "admin@example.com",
      passwordHash,
      status: "ACTIVE",
    },
    update: {},
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: superAdmin.id } },
    create: { userId: adminUser.id, roleId: superAdmin.id },
    update: {},
  });

  console.log("✅ Seed completed. Login: admin / ChangeMe@123 (يجب تغييرها فورًا في بيئة الإنتاج)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
