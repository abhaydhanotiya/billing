import { useState } from "react";
import { PageHeader } from "../components/Layout.js";
import { StatusBadge } from "../components/StatusBadge.js";
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

export function InvoicesScreen() {
  const [filter, setFilter] = useState<InvoiceStatus | "ALL">("ALL");
  const { data, loading, error } = useApi(
    () =>
      api.get<{ invoices: Invoice[] }>(
        `/invoices${filter === "ALL" ? "" : `?status=${filter}`}`,
      ),
    [filter],
  );

  const invoices = data?.invoices ?? [];

  return (
    <div className="screen">
      <PageHeader
        title="Invoices"
        subtitle="All bills, newest first"
        actions={
          <button className="btn btn-primary" onClick={() => navigate("/new-bill")}>
            + New Bill
          </button>
        }
      />

      <div className="seg" style={{ marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`seg-btn ${filter === f.key ? "is-on" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div className="card-pad muted">Loading invoices…</div>
        ) : error ? (
          <div className="card-pad alert alert-error">{error}</div>
        ) : invoices.length === 0 ? (
          <div className="card-pad empty">No invoices yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Number</th>
                <th>Date</th>
                <th>Bill To</th>
                <th>Mode</th>
                <th>Status</th>
                <th className="right">Grand Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/invoices/${inv.id}`)}>
                  <td>
                    <strong>{inv.number ?? <span className="muted">— draft —</span>}</strong>
                  </td>
                  <td className="muted">{formatDateTime(inv.finalizedAt ?? inv.createdAt)}</td>
                  <td>{inv.billToName}</td>
                  <td>
                    <span className="tag">{inv.mode === "GST" ? "GST" : "Non-GST"}</span>
                  </td>
                  <td>
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="right money">
                    <strong>{formatINR(inv.grandTotalPaise)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
