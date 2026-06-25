import { useState } from "react";
import { PageHeader } from "../components/Layout.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { Icon } from "../components/Icon.js";
import { useApi } from "../lib/useApi.js";
import { api } from "../lib/api.js";
import { navigate } from "../lib/router.js";
import { formatINR, formatDateTime } from "../lib/format.js";
import type { Invoice, InvoiceStatus } from "../lib/types.js";

const FILTERS: { key: InvoiceStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "DRAFT", label: "Drafts" },
  { key: "FINALIZED", label: "Finalized" },
  { key: "VOID", label: "Void" },
];

function paidOf(inv: Invoice): number {
  return (inv.payments ?? []).reduce((s, p) => s + p.amountPaise, 0);
}

export function InvoicesScreen() {
  const [filter, setFilter] = useState<InvoiceStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const qs = new URLSearchParams();
  if (filter !== "ALL") qs.set("status", filter);
  if (search.trim()) qs.set("search", search.trim());
  if (from) qs.set("from", new Date(`${from}T00:00:00`).toISOString());
  if (to) qs.set("to", new Date(`${to}T23:59:59`).toISOString());
  const query = qs.toString();

  const { data, loading, error } = useApi(
    () => api.get<{ invoices: Invoice[] }>(`/invoices${query ? `?${query}` : ""}`),
    [query],
  );
  const invoices = data?.invoices ?? [];

  return (
    <div className="screen">
      <PageHeader
        title="Invoices"
        subtitle="Search and manage all bills"
        actions={
          <button className="btn btn-primary" onClick={() => navigate("/new-bill")}>
            + New Bill
          </button>
        }
      />

      <div className="row" style={{ gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div className="seg">
          {FILTERS.map((f) => (
            <button key={f.key} className={`seg-btn ${filter === f.key ? "is-on" : ""}`} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="search-bar card grow" style={{ padding: "4px 12px", minWidth: 220 }}>
          <Icon name="search" size={16} />
          <input className="input" style={{ border: "none", boxShadow: "none" }} placeholder="Number, guest name, or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="field"><label>From</label><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="field"><label>To</label><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>

      <div className="card">
        {loading ? (
          <div className="card-pad muted">Loading invoices…</div>
        ) : error ? (
          <div className="card-pad alert alert-error">{error}</div>
        ) : invoices.length === 0 ? (
          <div className="card-pad empty">No invoices match.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Number</th><th>Date</th><th>Bill To</th><th>Mode</th><th>Status</th>
                <th className="right">Grand Total</th><th className="right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const balance = inv.grandTotalPaise - paidOf(inv);
                return (
                  <tr key={inv.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/invoices/${inv.id}`)}>
                    <td><strong>{inv.number ?? <span className="muted">— draft —</span>}</strong></td>
                    <td className="muted">{formatDateTime(inv.finalizedAt ?? inv.createdAt)}</td>
                    <td>{inv.billToName}</td>
                    <td><span className="tag">{inv.mode === "GST" ? "GST" : "Non-GST"}</span></td>
                    <td><StatusBadge status={inv.status} /></td>
                    <td className="right money"><strong>{formatINR(inv.grandTotalPaise)}</strong></td>
                    <td className="right money">
                      {inv.status !== "FINALIZED" ? (
                        <span className="muted">—</span>
                      ) : balance <= 0 ? (
                        <span className="badge" style={{ background: "var(--ok-soft)", color: "var(--ok)" }}>Paid</span>
                      ) : (
                        <span style={{ color: "var(--danger)" }}>{formatINR(balance)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
