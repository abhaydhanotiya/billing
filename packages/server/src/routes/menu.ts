import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";

const menuItemSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["FOOD", "BEVERAGE", "OTHER"]).default("FOOD"),
  pricePaise: z.number().int().nonnegative(),
  gstRatePct: z.number().int().min(0).max(28).default(5),
  hsnSac: z.string().optional(),
});

export async function menuRoutes(app: FastifyInstance) {
  app.get("/menu", { preHandler: [app.authenticate] }, async () => ({
    items: await prisma.menuItem.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  }));

  app.post("/menu", { preHandler: [app.authorize(["ADMIN", "RESTAURANT"])] }, async (req, reply) => {
    const parsed = menuItemSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { pricePaise, ...rest } = parsed.data;
    const item = await prisma.menuItem.create({
      data: { ...rest, pricePaise: BigInt(pricePaise) },
    });
    return reply.code(201).send({ item });
  });

  app.patch("/menu/:id", { preHandler: [app.authorize(["ADMIN", "RESTAURANT"])] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = menuItemSchema.partial().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { pricePaise, ...rest } = parsed.data;
    const item = await prisma.menuItem.update({
      where: { id },
      data: { ...rest, ...(pricePaise != null ? { pricePaise: BigInt(pricePaise) } : {}) },
    });
    return { item };
  });

  app.delete("/menu/:id", { preHandler: [app.authorize(["ADMIN", "RESTAURANT"])] }, async (req) => {
    const { id } = req.params as { id: string };
    // Soft-delete so historical orders keep their reference.
    const item = await prisma.menuItem.update({ where: { id }, data: { active: false } });
    return { item };
  });
}
