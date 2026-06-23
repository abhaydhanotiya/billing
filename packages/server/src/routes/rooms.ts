import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";

const roomTypeSchema = z.object({
  name: z.string().min(1),
  baseRatePaise: z.number().int().nonnegative(),
  gstRatePct: z.number().int().min(0).max(28).default(12),
  hsnSac: z.string().optional(),
});

const roomSchema = z.object({
  number: z.string().min(1),
  floor: z.string().optional(),
  roomTypeId: z.string().min(1),
});

const statusSchema = z.object({
  status: z.enum(["VACANT", "OCCUPIED", "RESERVED", "CLEANING", "MAINTENANCE"]),
});

export async function roomRoutes(app: FastifyInstance) {
  const manage = app.authorize(["RECEPTION"]);

  app.get("/room-types", { preHandler: [app.authenticate] }, async () => ({
    roomTypes: await prisma.roomType.findMany({ orderBy: { name: "asc" } }),
  }));

  app.post("/room-types", { preHandler: [app.authorize(["ADMIN"])] }, async (req, reply) => {
    const parsed = roomTypeSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { baseRatePaise, ...rest } = parsed.data;
    const roomType = await prisma.roomType.create({
      data: { ...rest, baseRatePaise: BigInt(baseRatePaise) },
    });
    return reply.code(201).send({ roomType });
  });

  app.get("/rooms", { preHandler: [app.authenticate] }, async () => ({
    rooms: await prisma.room.findMany({
      where: { active: true },
      include: { roomType: true },
      orderBy: { number: "asc" },
    }),
  }));

  app.post("/rooms", { preHandler: [app.authorize(["ADMIN"])] }, async (req, reply) => {
    const parsed = roomSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const room = await prisma.room.create({ data: parsed.data });
    return reply.code(201).send({ room });
  });

  app.patch("/rooms/:id/status", { preHandler: [manage] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const room = await prisma.room.update({ where: { id }, data: { status: parsed.data.status } });
    return { room };
  });
}
