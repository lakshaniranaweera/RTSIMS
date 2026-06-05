import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { SIDEBAR_ITEMS, EXTRA_PERMISSIONS } from "../lib/sidebar-config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  // ─── Bootstrap role ─────────────────────────────────────────────────────────
  // Start fresh: a single system "Administrator" role with every permission.
  // Build out additional roles via the UI (Manage Permissions → Roles).
  const adminRole = await prisma.role.upsert({
    where: { name: "Administrator" },
    update: { isSystem: true, landingPath: "/admin" },
    create: {
      name: "Administrator",
      description: "Full access. Seeded bootstrap role.",
      landingPath: "/admin",
      isSystem: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { roleId: adminRole.id },
    create: { email: "admin@example.com", name: "Admin User", passwordHash, roleId: adminRole.id },
  });

  // ─── Permissions ────────────────────────────────────────────────────────────
  const ALL_PERMISSIONS = [
    ...SIDEBAR_ITEMS.map((i) => ({
      key: i.key,
      label: i.label,
      group: i.group as string,
      description: i.description ?? null,
    })),
    ...EXTRA_PERMISSIONS.map((p) => ({
      key: p.key,
      label: p.label,
      group: p.group,
      description: p.description,
    })),
  ];
  const permissions = await Promise.all(
    ALL_PERMISSIONS.map((item) =>
      prisma.permission.upsert({
        where: { key: item.key },
        update: { label: item.label, group: item.group, description: item.description },
        create: {
          key: item.key,
          label: item.label,
          group: item.group,
          description: item.description,
        },
      }),
    ),
  );
  // Grant every permission to the Administrator role.
  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  // ─── Catalogue (categories, suppliers, products) ────────────────────────────
  const categories = await Promise.all(
    [
      { name: "Stationery", slug: "stationery" },
      { name: "Electronics", slug: "electronics" },
      { name: "Cleaning", slug: "cleaning" },
      { name: "Pantry", slug: "pantry" },
      { name: "Safety", slug: "safety" },
    ].map((c) =>
      prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c }),
    ),
  );

  const [acme, globex] = await Promise.all([
    prisma.supplier.upsert({
      where: { id: "seed-supplier-acme" },
      update: {},
      create: {
        id: "seed-supplier-acme",
        name: "Acme Supplies",
        contactName: "Jane Doe",
        email: "jane@acme.test",
        phone: "+1-555-0100",
      },
    }),
    prisma.supplier.upsert({
      where: { id: "seed-supplier-globex" },
      update: {},
      create: {
        id: "seed-supplier-globex",
        name: "Globex Trading",
        contactName: "John Smith",
        email: "john@globex.test",
        phone: "+1-555-0200",
      },
    }),
  ]);

  const byName = (name: string) => categories.find((c) => c.name === name)!;

  const today = new Date();
  const addDays = (d: number) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + d);
    return dt;
  };

  const products = [
    { name: "A4 Paper Ream", categoryId: byName("Stationery").id, qty: 120, minStock: 30, supplierId: acme.id, expiryDate: addDays(720) },
    { name: "Ballpoint Pens (Box of 50)", categoryId: byName("Stationery").id, qty: 18, minStock: 25, supplierId: acme.id, expiryDate: addDays(900) },
    { name: "USB-C Cable 2m", categoryId: byName("Electronics").id, qty: 60, minStock: 15, supplierId: globex.id },
    { name: "Wireless Mouse", categoryId: byName("Electronics").id, qty: 8, minStock: 10, supplierId: globex.id },
    { name: "Disinfectant Spray 1L", categoryId: byName("Cleaning").id, qty: 40, minStock: 20, supplierId: acme.id, expiryDate: addDays(45) },
    { name: "Microfiber Cloths (10pk)", categoryId: byName("Cleaning").id, qty: 75, minStock: 30, supplierId: acme.id },
    { name: "Coffee Beans 1kg", categoryId: byName("Pantry").id, qty: 22, minStock: 12, supplierId: globex.id, expiryDate: addDays(120) },
    { name: "Granola Bars (Box of 24)", categoryId: byName("Pantry").id, qty: 14, minStock: 20, supplierId: globex.id, expiryDate: addDays(60) },
    { name: "First Aid Kit", categoryId: byName("Safety").id, qty: 5, minStock: 8, supplierId: acme.id, expiryDate: addDays(365) },
    { name: "Safety Goggles", categoryId: byName("Safety").id, qty: 30, minStock: 10, supplierId: acme.id },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: `seed-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` },
      update: {},
      create: {
        id: `seed-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        ...p,
      },
    });
  }

  console.log(
    `Seeded: roles=1 (Administrator), users=1, permissions=${permissions.length}, categories=${categories.length}, suppliers=2, products=${products.length}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
