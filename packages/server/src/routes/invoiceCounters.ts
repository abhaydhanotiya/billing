import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { config } from "../config.js";

/**
 * View / set the next invoice number for each series (admin). Lets a hotel
 * continue numbering from an existing paper bill book. The stored counter holds
 * the LAST issued number, so nextNumber = lastSeq + 1.
 */
export async function invoiceCounterRoutes(app: FastifyInstance) {
  const admin = app.authorize(["ADMIN"]);

  const series = [
    { prefix: config.invoicePrefixGst, label: `GST (${config.invoicePrefixGst}-)` },
    { prefix: config.invoicePrefixNonGst, label: `Non-GST (${config.invoicePrefixNonGst}-)` },
  ];

  app.get("/invoice-counters", { preHandler: [admin] }, async () => {
    const rows = await prisma.invoiceCounter.findMany();
    const byPrefix = new Map(rows.map((r) => [r.fySeries, r.lastSeq]));
    return {
      counters: series.map((s) => ({
        prefix: s.prefix,
        label: s.label,
        nextNumber: (byPrefix.get(s.prefix) ?? 0) + 1,
      })),
    };
  });

  app.put("/invoice-counters/:prefix", { preHandler: [admin] }, async (req, reply) => {
    const { prefix } = req.params as { prefix: string };
    if (!series.some((s) => s.prefix === prefix)) {
      return reply.code(400).send({ error: "Unknown invoice series" });
    }
    const body = z.object({ nextNumber: z.number().int().min(1).max(1_000_000) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "nextNumber must be a positive whole number" });

    const lastSeq = body.data.nextNumber - 1;
    // Refuse to set below numbers already used (would collide on the next finalize).
    const used = await prisma.invoice.findFirst({
      where: { number: { startsWith: `${prefix}-` }, seq: { gt: lastSeq } },
      orderBy: { seq: "desc" },
      select: { number: true },
    });
    if (used) {
      return reply.code(409).send({
        error: `Cannot set below an already-used number — ${used.number} already exists.`,
      });
    }

    await prisma.invoiceCounter.upsert({
      where: { fySeries: prefix },
      create: { fySeries: prefix, lastSeq },
      update: { lastSeq },
    });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: "INVOICE_COUNTER_SET", entity: "InvoiceCounter", entityId: prefix, detail: JSON.stringify({ nextNumber: body.data.nextNumber }) },
    });
    return { ok: true, prefix, nextNumber: body.data.nextNumber };
  });
}
