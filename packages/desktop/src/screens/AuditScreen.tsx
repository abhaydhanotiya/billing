import { PageHeader } from "../components/Layout.js";
import { useApi } from "../lib/useApi.js";
import { api } from "../lib/api.js";
import { formatDateTime } from "../lib/format.js";
import type { AuditEntry } from "../lib/types.js";

const LABEL: Record<string, string> = {
  LOGIN: "Signed in",
  INVOICE_FINALIZE: "Finalized invoice",
  INVOICE_VOID: "Voided invoice",
  USER_CREATE: "Added staff",
  USER_RESET_PIN: "Reset a PIN",
  DISCOUNT_APPLIED: "Applied discount",
};

function detailText(e: AuditEntry): string {
  if (!e.detail) return "";
  try {
    const d = JSON.parse(e.detail);
    return Object.entries(d).map(([k, v]) => `${k}: ${v}`).join("  ·  ");
  } catch {
    return e.detail;
  }
}

export function AuditScreen() {
  const { data, loading, error } = useApi(() => api.get<{ logs: AuditEntry[] }>("/audit"), []);
  const logs = data?.logs ?? [];

  return (
    <div className="screen">
      <PageHeader title="Audit Log" subtitle="A record of sensitive actions — who did what, and when" />
      <div className="card">
        {loading ? (
          <div className="card-pad muted">Loading…</div>
        ) : error ? (
          <div className="card-pad alert alert-error">{error}</div>
        ) : logs.length === 0 ? (
          <div className="card-pad empty">No activity recorded yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>When</th><th>Action</th><th>By</th><th>Details</th></tr>
            </thead>
            <tbody>
              {logs.map((e) => (
                <tr key={e.id}>
                  <td className="muted" style={{ whiteSpace: "nowrap" }}>{formatDateTime(e.createdAt)}</td>
                  <td><strong>{LABEL[e.action] ?? e.action}</strong></td>
                  <td>{e.user?.displayName ?? "—"}</td>
                  <td className="muted">{detailText(e)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
