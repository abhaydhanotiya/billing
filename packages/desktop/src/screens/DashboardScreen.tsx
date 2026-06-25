import { PageHeader } from "../components/Layout.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { useApi } from "../lib/useApi.js";
import { useHasRole } from "../lib/auth.js";
import { api } from "../lib/api.js";
import { navigate } from "../lib/router.js";
import { formatINR } from "../lib/format.js";
import type { DayClose, Room } from "../lib/types.js";

function todayStr() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

function todayRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(from.getTime() + 86_400_000 - 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

interface SalesReport {
  invoiceCount: number;
  totals: { grandTotalPaise: number | null; totalTaxPaise: number | null };
}

export function DashboardScreen() {
  const canSeeSales = useHasRole("RECEPTION");
  const rooms = useApi(() => api.get<{ rooms: Room[] }>("/rooms"), []);
  const { from, to } = todayRange();
  const sales = useApi(
    () =>
      canSeeSales
        ? api.get<SalesReport>(`/reports/sales?from=${from}&to=${to}`)
        : Promise.resolve(null),
    [canSeeSales],
  );

  const collect = useApi(
    () => (canSeeSales ? api.get<DayClose>(`/reports/day-close?date=${todayStr()}`) : Promise.resolve(null)),
    [canSeeSales],
  );

  const roomList = rooms.data?.rooms ?? [];
  const occupied = roomList.filter((r) => r.status === "OCCUPIED").length;
  const occupancy = roomList.length ? Math.round((occupied / roomList.length) * 100) : 0;
  const collections = collect.data?.collections ?? [];

  return (
    <div className="screen">
      <PageHeader
        title="Dashboard"
        subtitle={new Date().toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        actions={
          <button className="btn btn-primary" onClick={() => navigate("/new-bill")}>
            + New Bill
          </button>
        }
      />

      <div className="stat-grid">
        <StatCard label="Occupancy" value={`${occupancy}%`} hint={`${occupied} of ${roomList.length} rooms`} />
        <StatCard
          label="Today's Bills"
          value={sales.data ? String(sales.data.invoiceCount) : canSeeSales ? "…" : "—"}
          hint="Finalized invoices"
        />
        <StatCard
          label="Today's Sales"
          value={sales.data?.totals.grandTotalPaise != null ? formatINR(sales.data.totals.grandTotalPaise) : canSeeSales ? "…" : "—"}
          hint="Gross collected"
          accent
        />
        <StatCard
          label="Today's GST"
          value={sales.data?.totals.totalTaxPaise != null ? formatINR(sales.data.totals.totalTaxPaise) : canSeeSales ? "…" : "—"}
          hint="CGST + SGST"
        />
      </div>

      {canSeeSales && collections.length > 0 && (
        <section className="card card-pad" style={{ marginTop: 22 }}>
          <div className="row spread" style={{ marginBottom: 14 }}>
            <h3>Today's Collections</h3>
            <button className="btn btn-sm" onClick={() => navigate("/day-close")}>Day close</button>
          </div>
          <div className="collect-grid">
            {collections.map((c) => (
              <div key={c.mode} className="collect-card">
                <div className="collect-mode">{c.mode}</div>
                <div className="collect-amt money">{formatINR(c.amountPaise)}</div>
                <div className="muted" style={{ fontSize: 12 }}>{c.count} payment{c.count !== 1 ? "s" : ""}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card card-pad" style={{ marginTop: 22 }}>
        <div className="row spread" style={{ marginBottom: 16 }}>
          <h3>Room Status</h3>
          <button className="btn btn-sm" onClick={() => navigate("/rooms")}>
            Manage rooms
          </button>
        </div>

        {rooms.loading ? (
          <div className="muted">Loading rooms…</div>
        ) : rooms.error ? (
          <div className="alert alert-error">{rooms.error}</div>
        ) : roomList.length === 0 ? (
          <div className="empty">No rooms set up yet.</div>
        ) : (
          <div className="room-board">
            {roomList.map((r) => (
              <div
                key={r.id}
                className={`room-tile st-${r.status.toLowerCase()} room-tile-clickable`}
                onClick={() => navigate(`/rooms/${r.id}`)}
                title={`View bookings for room ${r.number}`}
              >
                <div className="room-no">{r.number}</div>
                <div className="room-type muted">{r.roomType?.name ?? ""}</div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className={`stat-card ${accent ? "stat-accent" : ""}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value money">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}
