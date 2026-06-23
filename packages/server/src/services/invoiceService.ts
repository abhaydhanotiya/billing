import { computeBill, type BillMode, type LineItemInput } from "@sanskar/shared";
import { prisma } from "../db.js";
import { toBig } from "../lib/money.js";
import { fiscalYearSeries, formatInvoiceNumber } from "../lib/fiscalYear.js";
import { config } from "../config.js";
import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export interface BillToInput {
  guestId?: string;
  name: string;
  address?: string;
  gstin?: string;
  phone?: string;
}

export interface InvoiceDraftInput {
  mode: BillMode;
  billTo: BillToInput;
  lines: LineItemInput[];
  billDiscount?: { discountPaise?: number; discountPercent?: number };
  roundToRupee?: boolean;
  /** Optional booking this bill settles — links the stay to the invoice. */
  stayId?: string;
}

/** Map a computed bill onto the Prisma create payload for an invoice + its lines. */
function toInvoiceData(input: InvoiceDraftInput, createdById: string): Prisma.InvoiceCreateInput {
  const bill = computeBill({
    mode: input.mode,
    lines: input.lines,
    billDiscount: input.billDiscount,
    roundToRupee: input.roundToRupee,
  });

  return {
    mode: input.mode,
    status: "DRAFT",
    guest: input.billTo.guestId ? { connect: { id: input.billTo.guestId } } : undefined,
    billToName: input.billTo.name,
    billToAddress: input.billTo.address,
    billToGstin: input.billTo.gstin,
    billToPhone: input.billTo.phone,
    grossPaise: toBig(bill.grossPaise),
    totalDiscountPaise: toBig(bill.totalDiscountPaise),
    taxableValuePaise: toBig(bill.taxableValuePaise),
    totalCgstPaise: toBig(bill.totalCgstPaise),
    totalSgstPaise: toBig(bill.totalSgstPaise),
    totalTaxPaise: toBig(bill.totalTaxPaise),
    roundOffPaise: toBig(bill.roundOffPaise),
    grandTotalPaise: toBig(bill.grandTotalPaise),
    amountInWords: bill.amountInWords,
    createdBy: { connect: { id: createdById } },
    lines: {
      create: bill.lines.map((l) => ({
        category: l.category,
        description: l.description,
        hsnSac: l.hsnSac,
        qty: l.qty,
        unitPricePaise: toBig(l.unitPricePaise),
        grossPaise: toBig(l.grossPaise),
        discountPaise: toBig(l.discountPaise),
        taxableValuePaise: toBig(l.taxableValuePaise),
        gstRatePct: l.gstRatePct,
        cgstPaise: toBig(l.cgstPaise),
        sgstPaise: toBig(l.sgstPaise),
        lineTotalPaise: toBig(l.lineTotalPaise),
      })),
    },
  };
}

/** Create a DRAFT invoice (no number assigned yet); optionally link it to a stay. */
export async function createDraft(input: InvoiceDraftInput, createdById: string) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: toInvoiceData(input, createdById),
      include: { lines: true },
    });
    if (input.stayId) {
      // Point the booking at this bill (Stay.invoiceId).
      await tx.stay.update({ where: { id: input.stayId }, data: { invoiceId: invoice.id } });
    }
    return invoice;
  });
}

/** Replace the contents of a DRAFT invoice. Refuses to touch finalized/void invoices. */
export async function updateDraft(id: string, input: InvoiceDraftInput, userId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Invoice not found");
    if (existing.status !== "DRAFT") {
      throw new HttpError(409, `Cannot edit a ${existing.status} invoice`);
    }
    await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });
    const data = toInvoiceData(input, userId);
    return tx.invoice.update({
      where: { id },
      data: { ...data, createdBy: undefined }, // keep original author
      include: { lines: true },
    });
  });
}

/**
 * Finalize a DRAFT invoice: assign a gap-free FY-series number and freeze it.
 *
 * The number is drawn by atomically bumping a per-series counter row inside the
 * same transaction that flips the status. Two concurrent finalizes serialize on
 * the counter row's write lock, so sequences are unique and gap-free.
 */
export async function finalizeInvoice(id: string, userId: string, now: Date) {
  return prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.findUnique({ where: { id } });
    if (!inv) throw new HttpError(404, "Invoice not found");
    if (inv.status === "FINALIZED") throw new HttpError(409, "Invoice already finalized");
    if (inv.status === "VOID") throw new HttpError(409, "Cannot finalize a void invoice");

    // GST and NON-GST bills draw from separate, independent series (e.g. SR-1 and
    // SRE-1). One continuous counter per prefix; fySeries is recorded for reporting.
    const prefix = inv.mode === "GST" ? config.invoicePrefixGst : config.invoicePrefixNonGst;
    const fySeries = fiscalYearSeries(now);
    const counter = await tx.invoiceCounter.upsert({
      where: { fySeries: prefix },
      create: { fySeries: prefix, lastSeq: 1 },
      update: { lastSeq: { increment: 1 } },
    });
    const seq = counter.lastSeq;
    const number = formatInvoiceNumber(prefix, seq);

    const finalized = await tx.invoice.update({
      where: { id },
      data: { status: "FINALIZED", number, fySeries, seq, finalizedAt: now },
      include: { lines: true, payments: true },
    });

    await writeAudit(tx, userId, "INVOICE_FINALIZE", "Invoice", id, { number });
    return finalized;
  });
}

/** Void a finalized invoice (the number is retained — never reused — for the audit trail). */
export async function voidInvoice(id: string, userId: string, reason: string, now: Date) {
  return prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.findUnique({ where: { id } });
    if (!inv) throw new HttpError(404, "Invoice not found");
    if (inv.status === "VOID") throw new HttpError(409, "Invoice already void");

    const voided = await tx.invoice.update({
      where: { id },
      data: { status: "VOID", voidedAt: now, voidReason: reason },
    });
    await writeAudit(tx, userId, "INVOICE_VOID", "Invoice", id, { reason, number: inv.number });
    return voided;
  });
}

async function writeAudit(
  tx: Tx,
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  detail: Record<string, unknown>,
) {
  await tx.auditLog.create({
    data: { userId, action, entity, entityId, detail: JSON.stringify(detail) },
  });
}

/** Small typed error carrying an HTTP status, translated by the route error handler. */
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}
