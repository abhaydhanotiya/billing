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
    company: z.string().optional(),
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
  invoiceDate: z.string().optional(),
  checkInDate: z.string().optional(),
  checkOutDate: z.string().optional(),
  manualNumber: z.number().int().min(1).max(1_000_000).optional(),
});

export async function invoiceRoutes(app: FastifyInstance) {
  const billing = app.authorize(["RECEPTION", "RESTAURANT"]);
  const adminOnly = app.authorize(["ADMIN"]);

  // List/search invoices: status, FY series, free-text (number or bill-to), date range.
  app.get("/invoices", { preHandler: [app.authenticate] }, async (req) => {
    const q = req.query as {
      status?: string;
      fySeries?: string;
      take?: string;
      search?: string;
      from?: string;
      to?: string;
    };
    const search = q.search?.trim();
    const createdAt =
      q.from || q.to
        ? { gte: q.from ? new Date(q.from) : undefined, lte: q.to ? new Date(q.to) : undefined }
        : undefined;

    const invoices = await prisma.invoice.findMany({
      where: {
        status: q.status as never,
        fySeries: q.fySeries,
        createdAt,
        ...(search
          ? {
              OR: [
                { number: { contains: search, mode: "insensitive" } },
                { billToName: { contains: search, mode: "insensitive" } },
                { billToPhone: { contains: search } },
              ],
            }
          : {}),
      },
      include: { payments: { select: { amountPaise: true } } },
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

  // Correct the bill-to details (name, company, address, GSTIN, phone) on any
  // invoice — these are descriptive labels, not GST figures, so they're safe to
  // fix even after finalizing. Admin only; recorded in the audit log.
  app.patch("/invoices/:id/bill-to", { preHandler: [adminOnly] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z
      .object({
        name: z.string().min(1).optional(),
        company: z.string().optional(),
        address: z.string().optional(),
        gstin: z.string().optional(),
        phone: z.string().optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    const d = body.data;
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { billToName: d.name } : {}),
        ...(d.company !== undefined ? { billToCompany: d.company || null } : {}),
        ...(d.address !== undefined ? { billToAddress: d.address || null } : {}),
        ...(d.gstin !== undefined ? { billToGstin: d.gstin || null } : {}),
        ...(d.phone !== undefined ? { billToPhone: d.phone || null } : {}),
      },
    });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: "INVOICE_BILLTO_EDIT", entity: "Invoice", entityId: id },
    });
    return { invoice };
  });

  // Delete an invoice. Drafts: anyone billing. Voided: admin only (leaves a gap in
  // the number series). Finalized: never — it must be voided first.
  app.delete("/invoices/:id", { preHandler: [billing] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const inv = await prisma.invoice.findUnique({ where: { id } });
    if (!inv) return reply.code(404).send({ error: "Invoice not found" });
    if (inv.status === "FINALIZED") {
      return reply.code(409).send({ error: "A finalized invoice must be voided before it can be deleted." });
    }
    if (inv.status === "VOID" && req.user.role !== "ADMIN") {
      return reply.code(403).send({ error: "Only an admin can delete a voided invoice." });
    }
    await prisma.$transaction(async (tx) => {
      await tx.payment.deleteMany({ where: { invoiceId: id } });
      await tx.stay.updateMany({ where: { invoiceId: id }, data: { invoiceId: null } });
      await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });
      if (inv.status === "VOID") {
        await tx.auditLog.create({
          data: { userId: req.user.id, action: "INVOICE_DELETE", entity: "Invoice", entityId: id, detail: JSON.stringify({ number: inv.number }) },
        });
      }
      await tx.invoice.delete({ where: { id } });
    });
    return { ok: true };
  });
}

export { HttpError };
