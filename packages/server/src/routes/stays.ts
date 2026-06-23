import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";

const createSchema = z.object({
  guestId: z.string().min(1),
  roomId: z.string().min(1),
  nightlyRatePaise: z.number().int().nonnegative(),
  gstRatePct: z.number().int().min(0).max(28).default(12),
  checkIn: z.string().datetime(),
  expectedOut: z.string().datetime().optional(),
  adults: z.number().int().positive().default(1),
  children: z.number().int().nonnegative().default(0),
  notes: z.string().optional(),
});

export async function stayRoutes(app: FastifyInstance) {
  const desk = app.authorize(["RECEPTION"]);

  app.get("/stays", { preHandler: [app.authenticate] }, async (req) => {
    const status = (req.query as { status?: string }).status;
    const stays = await prisma.stay.findMany({
      where: { status: status as never },
      include: {
        guest: true,
        room: { include: { roomType: true } },
        // Linked bill so the history shows the invoice number + amount.
        invoice: {
          select: { id: true, number: true, status: true, grandTotalPaise: true },
        },
      },
      orderBy: { checkIn: "desc" },
      take: 200,
    });
    return { stays };
  });

  // Single stay with everything needed to bill it (guest, room, posted orders, bill).
  app.get("/stays/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const stay = await prisma.stay.findUnique({
      where: { id },
      include: {
        guest: true,
        room: { include: { roomType: true } },
        invoice: { select: { id: true, number: true, status: true, grandTotalPaise: true } },
        orders: {
          where: { status: { not: "CANCELLED" } },
          include: { items: true },
        },
      },
    });
    if (!stay) return reply.code(404).send({ error: "Stay not found" });
    return { stay };
  });

  // Create a stay and (if checking in now) flip the room to OCCUPIED atomically.
  app.post("/stays", { preHandler: [desk] }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const d = parsed.data;

    const stay = await prisma.$transaction(async (tx) => {
      const created = await tx.stay.create({
        data: {
          guestId: d.guestId,
          roomId: d.roomId,
          nightlyRatePaise: BigInt(d.nightlyRatePaise),
          gstRatePct: d.gstRatePct,
          checkIn: new Date(d.checkIn),
          expectedOut: d.expectedOut ? new Date(d.expectedOut) : undefined,
          adults: d.adults,
          children: d.children,
          notes: d.notes,
          status: "CHECKED_IN",
        },
      });
      await tx.room.update({ where: { id: d.roomId }, data: { status: "OCCUPIED" } });
      return created;
    });
    return reply.code(201).send({ stay });
  });

  app.post("/stays/:id/check-out", { preHandler: [desk] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const stay = await prisma.$transaction(async (tx) => {
      const s = await tx.stay.findUnique({ where: { id } });
      if (!s) throw Object.assign(new Error("Stay not found"), { statusCode: 404 });
      const updated = await tx.stay.update({
        where: { id },
        data: { status: "CHECKED_OUT", checkOut: new Date() },
      });
      // Room needs housekeeping before it's sellable again.
      await tx.room.update({ where: { id: s.roomId }, data: { status: "CLEANING" } });
      return updated;
    });
    return { stay };
  });
}
