import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";

const createSchema = z.object({
  tableNo: z.string().optional(),
  stayId: z.string().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        qty: z.number().int().positive(),
      }),
    )
    .min(1),
});

export async function orderRoutes(app: FastifyInstance) {
  const restaurant = app.authorize(["RESTAURANT", "RECEPTION"]);

  app.get("/orders", { preHandler: [app.authenticate] }, async (req) => {
    const status = (req.query as { status?: string }).status ?? "OPEN";
    const orders = await prisma.order.findMany({
      where: { status: status as never },
      include: { items: true, stay: { include: { guest: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return { orders };
  });

  // Create an order, snapshotting each menu item's current name/price/rate.
  app.post("/orders", { preHandler: [restaurant] }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const d = parsed.data;

    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: d.items.map((i) => i.menuItemId) } },
    });
    const byId = new Map(menuItems.map((m) => [m.id, m]));
    for (const item of d.items) {
      if (!byId.has(item.menuItemId)) {
        return reply.code(400).send({ error: `Unknown menu item: ${item.menuItemId}` });
      }
    }

    const order = await prisma.order.create({
      data: {
        tableNo: d.tableNo,
        stayId: d.stayId,
        items: {
          create: d.items.map((i) => {
            const m = byId.get(i.menuItemId)!;
            return {
              menuItemId: m.id,
              nameSnapshot: m.name,
              pricePaise: m.pricePaise,
              gstRatePct: m.gstRatePct,
              qty: i.qty,
            };
          }),
        },
      },
      include: { items: true },
    });
    return reply.code(201).send({ order });
  });

  app.post("/orders/:id/cancel", { preHandler: [restaurant] }, async (req) => {
    const { id } = req.params as { id: string };
    const order = await prisma.order.update({ where: { id }, data: { status: "CANCELLED" } });
    return { order };
  });
}
