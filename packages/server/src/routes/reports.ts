import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";

function parseRange(q: { from?: string; to?: string }) {
  const from = q.from ? new Date(q.from) : new Date(0);
  const to = q.to ? new Date(q.to) : new Date();
  return { from, to };
}

/** Start/end of a single local calendar day from a YYYY-MM-DD string. */
function dayRange(dateStr?: string) {
  const base = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  const from = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const to = new Date(from.getTime() + 86_400_000 - 1);
  return { from, to };
}

export async function reportRoutes(app: FastifyInstance) {
  const reports = app.authorize(["ADMIN", "RECEPTION"]);

  // Day-close: end-of-day reconciliation — bills, collections by payment mode, totals, voids.
  app.get("/reports/day-close", { preHandler: [reports] }, async (req) => {
    const { from, to } = dayRange((req.query as { date?: string }).date);

    const [agg, voids, payments] = await Promise.all([
      prisma.invoice.aggregate({
        // Sales are attributed to the bill's invoice date (not when it was finalized).
        where: { status: "FINALIZED", invoiceDate: { gte: from, lte: to } },
        _count: true,
        _sum: { taxableValuePaise: true, totalTaxPaise: true, totalDiscountPaise: true, grandTotalPaise: true },
      }),
      prisma.invoice.count({ where: { status: "VOID", voidedAt: { gte: from, lte: to } } }),
      prisma.payment.groupBy({
        by: ["mode"],
        where: { receivedAt: { gte: from, lte: to } },
        _sum: { amountPaise: true },
        _count: true,
      }),
    ]);

    const collections = payments.map((p) => ({
      mode: p.mode,
      amountPaise: p._sum.amountPaise ?? 0n,
      count: p._count,
    }));
    const collectedPaise = collections.reduce((s, c) => s + Number(c.amountPaise), 0);

    return {
      date: from,
      invoiceCount: agg._count,
      voidCount: voids,
      totals: agg._sum,
      collections,
      collectedPaise,
    };
  });

  // GST summary grouped by rate over a date range — the figure the accountant files.
  app.get("/reports/gst", { preHandler: [reports] }, async (req) => {
    const { from, to } = parseRange(req.query as { from?: string; to?: string });
    const lines = await prisma.invoiceLine.findMany({
      where: {
        invoice: { status: "FINALIZED", mode: "GST", invoiceDate: { gte: from, lte: to } },
      },
      select: { gstRatePct: true, taxableValuePaise: true, cgstPaise: true, sgstPaise: true },
    });

    const byRate = new Map<
      number,
      { taxableValuePaise: bigint; cgstPaise: bigint; sgstPaise: bigint }
    >();
    for (const l of lines) {
      const row = byRate.get(l.gstRatePct) ?? {
        taxableValuePaise: 0n,
        cgstPaise: 0n,
        sgstPaise: 0n,
      };
      row.taxableValuePaise += l.taxableValuePaise;
      row.cgstPaise += l.cgstPaise;
      row.sgstPaise += l.sgstPaise;
      byRate.set(l.gstRatePct, row);
    }

    const breakup = [...byRate.entries()]
      .map(([gstRatePct, v]) => ({ gstRatePct, ...v }))
      .sort((a, b) => a.gstRatePct - b.gstRatePct);

    return {
      from,
      to,
      breakup,
      totals: breakup.reduce(
        (acc, r) => ({
          taxableValuePaise: acc.taxableValuePaise + r.taxableValuePaise,
          cgstPaise: acc.cgstPaise + r.cgstPaise,
          sgstPaise: acc.sgstPaise + r.sgstPaise,
        }),
        { taxableValuePaise: 0n, cgstPaise: 0n, sgstPaise: 0n },
      ),
    };
  });

  // Sales report: finalized invoice count + gross/tax/grand totals over a range.
  app.get("/reports/sales", { preHandler: [reports] }, async (req) => {
    const { from, to } = parseRange(req.query as { from?: string; to?: string });
    const agg = await prisma.invoice.aggregate({
      // By invoice date, so backdated bills count on their date, not when finalized.
      where: { status: "FINALIZED", invoiceDate: { gte: from, lte: to } },
      _count: true,
      _sum: {
        taxableValuePaise: true,
        totalTaxPaise: true,
        totalDiscountPaise: true,
        grandTotalPaise: true,
      },
    });
    return { from, to, invoiceCount: agg._count, totals: agg._sum };
  });
}
