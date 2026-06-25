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

const roomUpdateSchema = z.object({
  number: z.string().min(1).optional(),
  floor: z.string().optional(),
  roomTypeId: z.string().min(1).optional(),
  active: z.boolean().optional(),
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

  // Edit a room type's rate / GST / name.
  app.patch("/room-types/:id", { preHandler: [app.authorize(["ADMIN"])] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = roomTypeSchema.partial().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { baseRatePaise, ...rest } = parsed.data;
    const roomType = await prisma.roomType.update({
      where: { id },
      data: { ...rest, ...(baseRatePaise != null ? { baseRatePaise: BigInt(baseRatePaise) } : {}) },
    });
    return { roomType };
  });

  app.get("/rooms", { preHandler: [app.authenticate] }, async () => ({
    rooms: await prisma.room.findMany({
      where: { active: true },
      include: { roomType: true },
      orderBy: { number: "asc" },
    }),
  }));

  // One room with its full booking history (guest + linked bill).
  app.get("/rooms/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        roomType: true,
        stays: {
          include: {
            guest: true,
            invoice: { select: { id: true, number: true, status: true, grandTotalPaise: true } },
          },
          orderBy: { checkIn: "desc" },
        },
      },
    });
    if (!room) return reply.code(404).send({ error: "Room not found" });
    return { room };
  });

  app.post("/rooms", { preHandler: [app.authorize(["ADMIN"])] }, async (req, reply) => {
    const parsed = roomSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const exists = await prisma.room.findUnique({ where: { number: parsed.data.number } });
    if (exists) return reply.code(409).send({ error: `Room ${parsed.data.number} already exists` });
    const room = await prisma.room.create({ data: parsed.data, include: { roomType: true } });
    return reply.code(201).send({ room });
  });

  app.patch("/rooms/:id", { preHandler: [app.authorize(["ADMIN"])] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = roomUpdateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const room = await prisma.room.update({ where: { id }, data: parsed.data, include: { roomType: true } });
    return { room };
  });

  // Soft-delete: deactivate so historical stays/invoices keep their reference.
  app.delete("/rooms/:id", { preHandler: [app.authorize(["ADMIN"])] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const active = await prisma.stay.count({ where: { roomId: id, status: "CHECKED_IN" } });
    if (active > 0) return reply.code(409).send({ error: "Room has a checked-in guest. Check out first." });
    const room = await prisma.room.update({ where: { id }, data: { active: false } });
    return { room };
  });

  app.patch("/rooms/:id/status", { preHandler: [manage] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const room = await prisma.room.update({ where: { id }, data: { status: parsed.data.status } });
    return { room };
  });
}
