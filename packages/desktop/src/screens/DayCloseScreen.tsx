import { useState } from "react";
import { PageHeader } from "../components/Layout.js";
import { useApi } from "../lib/useApi.js";
import { api } from "../lib/api.js";
import { formatINR, formatDate } from "../lib/format.js";
import type { DayClose } from "../lib/types.js";

function today() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

export function DayCloseScreen() {
  const [date, setDate] = useState(today());
  const { data, loading } = useApi(() => api.get<DayClose>(`/reports/day-close?date=${date}`), [date]);

  return (
    <div className="screen">
      <PageHeader
        title="Day Close"
        subtitle="End-of-day reconciliation"
        actions={
          <div className="field"><label>Date</label><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        }
      />

      {loading || !data ? (
        <div className="card card-pad muted">Loading…</div>
      ) : (
        <>
          <div className="stat-grid" style={{ marginBottom: 18 }}>
            <Stat label="Bills Finalized" value={String(data.invoiceCount)} />
            <Stat label="Total Collected" value={formatINR(data.collectedPaise)} accent />
            <Stat label="Sales (Grand Total)" value={formatINR(data.totals.grandTotalPaise ?? 0)} />
            <Stat label="Voids" value={String(data.voidCount)} />
          </div>

          <section className="card card-pad" style={{ marginBottom: 18 }}>
            <h3 style={{ marginBottom: 14 }}>Collections by Mode</h3>
            {data.collections.length === 0 ? (
              <div className="empty">No payments recorded for this day.</div>
            ) : (
              <div className="collect-grid">
                {data.collections.map((c) => (
                  <div key={c.mode} className="collect-card">
                    <div className="collect-mode">{c.mode}</div>
                    <div className="collect-amt money">{formatINR(c.amountPaise)}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{c.count} payment{c.count !== 1 ? "s" : ""}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card card-pad">
            <h3 style={{ marginBottom: 12 }}>Totals — {formatDate(date)}</h3>
            <Row label="Taxable value" value={formatINR(data.totals.taxableValuePaise ?? 0)} />
            <Row label="GST collected" value={formatINR(data.totals.totalTaxPaise ?? 0)} />
            <Row label="Discounts given" value={formatINR(data.totals.totalDiscountPaise ?? 0)} />
            <div className="hairline" style={{ margin: "10px 0" }} />
            <Row label="Grand total (sales)" value={formatINR(data.totals.grandTotalPaise ?? 0)} strong />
            <Row label="Collected" value={formatINR(data.collectedPaise)} strong />
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`stat-card ${accent ? "stat-accent" : ""}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value money">{value}</div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="row spread" style={{ padding: "5px 0", fontWeight: strong ? 600 : 400 }}>
      <span className={strong ? "" : "muted"}>{label}</span>
      <span className="money">{value}</span>
    </div>
  );
}
