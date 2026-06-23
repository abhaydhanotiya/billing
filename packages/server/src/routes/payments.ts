import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";

const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  mode: z.enum(["CASH", "UPI", "CARD", "BANK", "OTHER"]),
  amountPaise: z.number().int().positive(),
  reference: z.string().optional(),
});

export async function paymentRoutes(app: FastifyInstance) {
  const billing = app.authorize(["RECEPTION", "RESTAURANT"]);

  app.post("/payments", { preHandler: [billing] }, async (req, reply) => {
    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { invoiceId, mode, amountPaise, reference } = parsed.data;

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return reply.code(404).send({ error: "Invoice not found" });
    if (invoice.status === "VOID") {
      return reply.code(409).send({ error: "Cannot record payment against a void invoice" });
    }

    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        mode,
        amountPaise: BigInt(amountPaise),
        reference,
        receivedById: req.user.id,
      },
    });
    return reply.code(201).send({ payment });
  });

  // Outstanding balance = grand total - sum(payments). Useful for reception.
  app.get("/invoices/:id/balance", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { payments: true },
    });
    if (!invoice) return reply.code(404).send({ error: "Invoice not found" });
    const paid = invoice.payments.reduce((sum, p) => sum + p.amountPaise, 0n);
    const balance = invoice.grandTotalPaise - paid;
    return {
      grandTotalPaise: invoice.grandTotalPaise,
      paidPaise: paid,
      balancePaise: balance,
    };
  });
}
