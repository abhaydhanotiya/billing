import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";

function parseRange(q: { from?: string; to?: string }) {
  const from = q.from ? new Date(q.from) : new Date(0);
  const to = q.to ? new Date(q.to) : new Date();
  return { from, to };
}

export async function reportRoutes(app: FastifyInstance) {
  const reports = app.authorize(["ADMIN", "RECEPTION"]);

  // GST summary grouped by rate over a date range — the figure the accountant files.
  app.get("/reports/gst", { preHandler: [reports] }, async (req) => {
    const { from, to } = parseRange(req.query as { from?: string; to?: string });
    const lines = await prisma.invoiceLine.findMany({
      where: {
        invoice: { status: "FINALIZED", mode: "GST", finalizedAt: { gte: from, lte: to } },
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
      where: { status: "FINALIZED", finalizedAt: { gte: from, lte: to } },
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
