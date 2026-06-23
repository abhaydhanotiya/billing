import { PageHeader } from "../components/Layout.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { useApi } from "../lib/useApi.js";
import { api, ApiError } from "../lib/api.js";
import { useToast } from "../lib/toast.js";
import { formatINR } from "../lib/format.js";
import type { Room, RoomStatus } from "../lib/types.js";

const STATUSES: RoomStatus[] = ["VACANT", "OCCUPIED", "RESERVED", "CLEANING", "MAINTENANCE"];

export function RoomsScreen() {
  const toast = useToast();
  const rooms = useApi(() => api.get<{ rooms: Room[] }>("/rooms"), []);

  async function setStatus(room: Room, status: RoomStatus) {
    try {
      await api.patch(`/rooms/${room.id}/status`, { status });
      toast.push("ok", `Room ${room.number} → ${status.toLowerCase()}`);
      rooms.reload();
    } catch (e) {
      toast.push("error", e instanceof ApiError ? e.message : "Update failed.");
    }
  }

  const list = rooms.data?.rooms ?? [];

  return (
    <div className="screen">
      <PageHeader title="Rooms" subtitle="Live room status — click to change" />

      <div className="card">
        {rooms.loading ? (
          <div className="card-pad muted">Loading…</div>
        ) : list.length === 0 ? (
          <div className="card-pad empty">No rooms configured.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Type</th>
                <th className="right">Base Rate</th>
                <th>Status</th>
                <th>Set status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.number}</strong>
                    {r.floor && <span className="muted"> · Floor {r.floor}</span>}
                  </td>
                  <td>{r.roomType?.name ?? "—"}</td>
                  <td className="right money">
                    {r.roomType ? formatINR(r.roomType.baseRatePaise) : "—"}
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>
                    <select
                      className="select btn-sm"
                      value={r.status}
                      onChange={(e) => setStatus(r, e.target.value as RoomStatus)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0) + s.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
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
