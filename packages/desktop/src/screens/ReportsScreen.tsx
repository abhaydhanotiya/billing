import { useState } from "react";
import { PageHeader } from "../components/Layout.js";
import { useApi } from "../lib/useApi.js";
import { api } from "../lib/api.js";
import { formatINR } from "../lib/format.js";

interface GstReport {
  breakup: { gstRatePct: number; taxableValuePaise: number; cgstPaise: number; sgstPaise: number }[];
  totals: { taxableValuePaise: number; cgstPaise: number; sgstPaise: number };
}
interface SalesReport {
  invoiceCount: number;
  totals: {
    taxableValuePaise: number | null;
    totalTaxPaise: number | null;
    totalDiscountPaise: number | null;
    grandTotalPaise: number | null;
  };
}

function isoStart(d: string) {
  return new Date(`${d}T00:00:00`).toISOString();
}
function isoEnd(d: string) {
  return new Date(`${d}T23:59:59.999`).toISOString();
}
function monthStart() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-01`;
}
function today() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

export function ReportsScreen() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());

  const q = `from=${isoStart(from)}&to=${isoEnd(to)}`;
  const gst = useApi(() => api.get<GstReport>(`/reports/gst?${q}`), [q]);
  const sales = useApi(() => api.get<SalesReport>(`/reports/sales?${q}`), [q]);

  return (
    <div className="screen">
      <PageHeader title="Reports" subtitle="GST summary & sales for the accountant" />

      <section className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="row" style={{ gap: 16, alignItems: "flex-end" }}>
          <div className="field"><label>From</label><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="field"><label>To</label><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
      </section>

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <SCard label="Invoices" value={sales.data ? String(sales.data.invoiceCount) : "…"} />
        <SCard label="Taxable Value" value={fmt(sales.data?.totals.taxableValuePaise)} />
        <SCard label="Total GST" value={fmt(sales.data?.totals.totalTaxPaise)} />
        <SCard label="Grand Total" value={fmt(sales.data?.totals.grandTotalPaise)} accent />
      </div>

      <section className="card">
        <div className="card-pad" style={{ paddingBottom: 0 }}>
          <h3>GST Summary by Rate</h3>
        </div>
        {gst.loading ? (
          <div className="card-pad muted">Loading…</div>
        ) : gst.error ? (
          <div className="card-pad alert alert-error">{gst.error}</div>
        ) : (gst.data?.breakup.length ?? 0) === 0 ? (
          <div className="card-pad empty">No GST invoices in this period.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>GST Rate</th>
                <th className="right">Taxable Value</th>
                <th className="right">CGST</th>
                <th className="right">SGST</th>
                <th className="right">Total Tax</th>
              </tr>
            </thead>
            <tbody>
              {gst.data!.breakup.map((r) => (
                <tr key={r.gstRatePct}>
                  <td><strong>{r.gstRatePct}%</strong></td>
                  <td className="right money">{formatINR(r.taxableValuePaise)}</td>
                  <td className="right money">{formatINR(r.cgstPaise)}</td>
                  <td className="right money">{formatINR(r.sgstPaise)}</td>
                  <td className="right money">{formatINR(r.cgstPaise + r.sgstPaise)}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td><strong>Total</strong></td>
                <td className="right money"><strong>{formatINR(gst.data!.totals.taxableValuePaise)}</strong></td>
                <td className="right money"><strong>{formatINR(gst.data!.totals.cgstPaise)}</strong></td>
                <td className="right money"><strong>{formatINR(gst.data!.totals.sgstPaise)}</strong></td>
                <td className="right money"><strong>{formatINR(gst.data!.totals.cgstPaise + gst.data!.totals.sgstPaise)}</strong></td>
              </tr>
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function fmt(p: number | null | undefined): string {
  return p != null ? formatINR(p) : "…";
}

function SCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`stat-card ${accent ? "stat-accent" : ""}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value money">{value}</div>
    </div>
  );
}
