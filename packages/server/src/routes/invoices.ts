import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import {
  createDraft,
  updateDraft,
  finalizeInvoice,
  voidInvoice,
  HttpError,
  type InvoiceDraftInput,
} from "../services/invoiceService.js";

const lineSchema = z.object({
  category: z.enum(["ROOM", "FOOD", "OTHER"]),
  description: z.string().min(1),
  hsnSac: z.string().optional(),
  qty: z.number().positive(),
  unitPricePaise: z.number().int().nonnegative(),
  discountPaise: z.number().int().nonnegative().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  gstRatePct: z.number().int().min(0).max(28),
});

const draftSchema = z.object({
  mode: z.enum(["GST", "NON_GST"]),
  billTo: z.object({
    guestId: z.string().optional(),
    name: z.string().min(1),
    address: z.string().optional(),
    gstin: z.string().optional(),
    phone: z.string().optional(),
  }),
  lines: z.array(lineSchema).min(1),
  billDiscount: z
    .object({
      discountPaise: z.number().int().nonnegative().optional(),
      discountPercent: z.number().min(0).max(100).optional(),
    })
    .optional(),
  roundToRupee: z.boolean().optional(),
  stayId: z.string().optional(),
});

export async function invoiceRoutes(app: FastifyInstance) {
  const billing = app.authorize(["RECEPTION", "RESTAURANT"]);
  const adminOnly = app.authorize(["ADMIN"]);

  // List invoices (filter by status / FY series, newest first).
  app.get("/invoices", { preHandler: [app.authenticate] }, async (req) => {
    const q = req.query as { status?: string; fySeries?: string; take?: string };
    const invoices = await prisma.invoice.findMany({
      where: {
        status: q.status as never,
        fySeries: q.fySeries,
      },
      orderBy: { createdAt: "desc" },
      take: q.take ? Math.min(Number(q.take), 500) : 100,
    });
    return { invoices };
  });

  app.get("/invoices/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        lines: true,
        payments: true,
        guest: true,
        // Linked booking(s) so the invoice can print check-in / check-out dates.
        stays: {
          include: { room: { include: { roomType: true } } },
          orderBy: { checkIn: "asc" },
        },
      },
    });
    if (!invoice) return reply.code(404).send({ error: "Invoice not found" });
    return { invoice };
  });

  app.post("/invoices", { preHandler: [billing] }, async (req, reply) => {
    const parsed = draftSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const invoice = await createDraft(parsed.data as InvoiceDraftInput, req.user.id);
    return reply.code(201).send({ invoice });
  });

  app.put("/invoices/:id", { preHandler: [billing] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = draftSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const invoice = await updateDraft(id, parsed.data as InvoiceDraftInput, req.user.id);
    return { invoice };
  });

  app.post("/invoices/:id/finalize", { preHandler: [billing] }, async (req) => {
    const { id } = req.params as { id: string };
    const invoice = await finalizeInvoice(id, req.user.id, new Date());
    return { invoice };
  });

  // Voiding a finalized invoice is an admin action (it's the correction path).
  app.post("/invoices/:id/void", { preHandler: [adminOnly] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({ reason: z.string().min(1) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "reason is required" });
    const invoice = await voidInvoice(id, req.user.id, body.data.reason, new Date());
    return { invoice };
  });
}

export { HttpError };
