import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password.js";

const prisma = new PrismaClient();

async function main() {
  // Business profile (single row, id = 1) — details from the current SR-25 bill.
  const businessProfile = {
    legalName: "Sanskar Palace",
    tradeName: "Sanskar Palace",
    gstin: "23AEXPD6729C2ZG",
    address: "649/2, Garoth Road",
    city: "Shamgarh",
    stateName: "Madhya Pradesh",
    stateCode: "23",
    phone: "9425924420",
    email: "sanskarpalace2024@gmail.com",
    jurisdiction: "Garoth",
    invoiceNote: "Thank you for staying with us.",
  };
  await prisma.businessProfile.upsert({
    where: { id: 1 },
    create: { id: 1, ...businessProfile },
    update: businessProfile,
  });

  // Admin user (default PIN: 1234 — change on first login).
  const adminHash = await hashPassword("1234");
  await prisma.user.upsert({
    where: { username: "admin" },
    create: {
      username: "admin",
      displayName: "Administrator",
      role: "ADMIN",
      passwordHash: adminHash,
    },
    update: {},
  });

  // A couple of room types + rooms.
  const deluxe = await prisma.roomType.upsert({
    where: { name: "Deluxe" },
    create: { name: "Deluxe", baseRatePaise: 150000n, gstRatePct: 5 },
    update: {},
  });
  const suite = await prisma.roomType.upsert({
    where: { name: "Suite" },
    create: { name: "Suite", baseRatePaise: 200000n, gstRatePct: 5 },
    update: {},
  });

  for (const [number, typeId] of [
    ["101", deluxe.id],
    ["102", deluxe.id],
    ["103", deluxe.id],
    ["104", deluxe.id],
    ["105", deluxe.id],
    ["106", deluxe.id],
    ["107", deluxe.id],
    ["108", suite.id],
    ["109", suite.id],
    ["110", deluxe.id],
    ["111", deluxe.id],
    ["112", deluxe.id],
    ["113", deluxe.id],
    ["114", deluxe.id],
    ["115", deluxe.id],
    ["201", deluxe.id],
    ["202", deluxe.id],
    ["203", deluxe.id],
    ["204", deluxe.id],
    ["205", deluxe.id],
    ["206", deluxe.id],
    ["207", deluxe.id],
    ["208", deluxe.id],
    ["209", deluxe.id],
    ["210", deluxe.id],
    ["211", deluxe.id],
    ["212", deluxe.id],
    ["213", deluxe.id],
    ["214", deluxe.id],
    ["215", deluxe.id],
    ["216", deluxe.id],
    ["217", deluxe.id],
    ["218", deluxe.id],
    ["219", suite.id],
    ["220", deluxe.id],

  ] as const) {
    await prisma.room.upsert({
      where: { number },
      create: { number, roomTypeId: typeId },
      update: {},
    });
  }

  // A few menu items.
  const menu = [
    { name: "Masala Chai", pricePaise: 2000n, gstRatePct: 0, category: "BEVERAGE" as const },
    { name: "Coffee", pricePaise: 2000n, gstRatePct: 0, category: "BEVERAGE" as const },
    { name: "Water Bottle", pricePaise: 2000n, gstRatePct: 0, category: "BEVERAGE" as const },
  ];
  for (const m of menu) {
    const existing = await prisma.menuItem.findFirst({ where: { name: m.name } });
    if (!existing) await prisma.menuItem.create({ data: m });
  }

  console.log("Seed complete. Login: admin / 1234");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
