import { useState } from "react";
import { PageHeader } from "../components/Layout.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { BookingModal } from "../components/BookingModal.js";
import { useApi } from "../lib/useApi.js";
import { api, ApiError } from "../lib/api.js";
import { navigate } from "../lib/router.js";
import { useToast } from "../lib/toast.js";
import { formatINR, formatDate, formatDateTime } from "../lib/format.js";
import type { Stay, StayStatus } from "../lib/types.js";

const FILTERS: { key: StayStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "CHECKED_IN", label: "In-house" },
  { key: "CHECKED_OUT", label: "Checked out" },
  { key: "RESERVED", label: "Reserved" },
];

export function BookingsScreen() {
  const toast = useToast();
  const [filter, setFilter] = useState<StayStatus | "ALL">("ALL");
  const [showNew, setShowNew] = useState(false);

  const { data, loading, error, reload } = useApi(
    () => api.get<{ stays: Stay[] }>(`/stays${filter === "ALL" ? "" : `?status=${filter}`}`),
    [filter],
  );

  async function checkOut(stay: Stay) {
    if (!window.confirm(`Check out ${stay.guest?.name ?? "guest"} from room ${stay.room?.number ?? ""}?`))
      return;
    try {
      await api.post(`/stays/${stay.id}/check-out`);
      toast.push("ok", "Checked out. Room set to cleaning.");
      reload();
    } catch (e) {
      toast.push("error", e instanceof ApiError ? e.message : "Check-out failed.");
    }
  }

  const stays = data?.stays ?? [];

  return (
    <div className="screen">
      <PageHeader
        title="Bookings"
        subtitle="Who is in which room, since when, and the bill"
        actions={
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            + New Booking
          </button>
        }
      />

      <div className="seg" style={{ marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <button key={f.key} className={`seg-btn ${filter === f.key ? "is-on" : ""}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div className="card-pad muted">Loading bookings…</div>
        ) : error ? (
          <div className="card-pad alert alert-error">{error}</div>
        ) : stays.length === 0 ? (
          <div className="card-pad empty">No bookings yet. Click “New Booking” to check a guest in.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Guest</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Status</th>
                <th>Bill</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stays.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.room?.number ?? "—"}</strong>
                    <span className="muted"> · {s.room?.roomType?.name ?? ""}</span>
                  </td>
                  <td>
                    <strong>{s.guest?.name ?? "—"}</strong>
                    {s.guest?.phone && <div className="muted" style={{ fontSize: 12 }}>{s.guest.phone}</div>}
                  </td>
                  <td className="muted">{formatDateTime(s.checkIn)}</td>
                  <td className="muted">
                    {s.checkOut ? formatDateTime(s.checkOut) : s.expectedOut ? `exp. ${formatDate(s.expectedOut)}` : "—"}
                  </td>
                  <td><StatusBadge status={s.status} /></td>
                  <td>
                    {s.invoice ? (
                      <button className="linklike money" onClick={() => navigate(`/invoices/${s.invoice!.id}`)}>
                        {s.invoice.number ?? "draft"} · {formatINR(s.invoice.grandTotalPaise)}
                      </button>
                    ) : (
                      <span className="muted">Not billed</span>
                    )}
                  </td>
                  <td className="right">
                    <div className="row" style={{ justifyContent: "flex-end", gap: 6 }}>
                      {!s.invoice && (
                        <select
                          className="select btn-sm quick-add bill-pick"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) navigate(`/new-bill/${s.id}/${e.target.value}`);
                          }}
                          title="Generate a bill for this booking"
                        >
                          <option value="">Generate Bill ▾</option>
                          <option value="GST">GST Bill</option>
                          <option value="NON_GST">Non-GST Bill</option>
                        </select>
                      )}
                      {s.status === "CHECKED_IN" && (
                        <button className="btn btn-sm" onClick={() => checkOut(s)}>
                          Check out
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showNew && (
        <BookingModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            toast.push("ok", "Booking created.");
            reload();
          }}
        />
      )}
    </div>
  );
}
