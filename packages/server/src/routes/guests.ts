import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";

const guestSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  gstin: z.string().optional(),
  idType: z.string().optional(),
  idNumber: z.string().optional(),
});

export async function guestRoutes(app: FastifyInstance) {
  const desk = app.authorize(["RECEPTION"]);

  app.get("/guests", { preHandler: [app.authenticate] }, async (req) => {
    const q = (req.query as { search?: string }).search?.trim();
    const guests = await prisma.guest.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { guests };
  });

  app.post("/guests", { preHandler: [desk] }, async (req, reply) => {
    const parsed = guestSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const data = { ...parsed.data, email: parsed.data.email || undefined };
    const guest = await prisma.guest.create({ data });
    return reply.code(201).send({ guest });
  });

  app.patch("/guests/:id", { preHandler: [desk] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = guestSchema.partial().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const guest = await prisma.guest.update({ where: { id }, data: parsed.data });
    return { guest };
  });
}
