import { useState } from "react";
import { PageHeader } from "../components/Layout.js";
import { Icon } from "../components/Icon.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { BookingModal } from "../components/BookingModal.js";
import { useApi } from "../lib/useApi.js";
import { api, ApiError } from "../lib/api.js";
import { navigate } from "../lib/router.js";
import { useToast } from "../lib/toast.js";
import { useHasRole } from "../lib/auth.js";
import { formatINR, formatDate, formatDateTime } from "../lib/format.js";
import type { Room, RoomStatus, RoomType, Stay } from "../lib/types.js";

const STATUSES: RoomStatus[] = ["VACANT", "OCCUPIED", "RESERVED", "CLEANING", "MAINTENANCE"];

interface RoomDetail extends Room {
  stays?: Stay[];
}

export function RoomDetailScreen({ id }: { id: string }) {
  const toast = useToast();
  const isAdmin = useHasRole();
  const [showBooking, setShowBooking] = useState(false);

  const room = useApi(() => api.get<{ room: RoomDetail }>(`/rooms/${id}`), [id]);
  const types = useApi(() => api.get<{ roomTypes: RoomType[] }>("/room-types"), []);
  const r = room.data?.room;

  async function setStatus(status: RoomStatus) {
    try {
      await api.patch(`/rooms/${id}/status`, { status });
      room.reload();
    } catch (e) {
      toast.push("error", e instanceof ApiError ? e.message : "Update failed.");
    }
  }
  async function changeType(roomTypeId: string) {
    try {
      await api.patch(`/rooms/${id}`, { roomTypeId });
      toast.push("ok", "Room type updated.");
      room.reload();
    } catch (e) {
      toast.push("error", e instanceof ApiError ? e.message : "Update failed.");
    }
  }
  async function rename() {
    const number = window.prompt("Room number:", r?.number);
    if (!number || number === r?.number) return;
    try {
      await api.patch(`/rooms/${id}`, { number });
      toast.push("ok", "Room renamed.");
      room.reload();
    } catch (e) {
      toast.push("error", e instanceof ApiError ? e.message : "Rename failed.");
    }
  }
  async function remove() {
    if (!window.confirm(`Remove room ${r?.number}? It will be hidden but past bills are kept.`)) return;
    try {
      await api.del(`/rooms/${id}`);
      toast.push("ok", "Room removed.");
      navigate("/rooms");
    } catch (e) {
      toast.push("error", e instanceof ApiError ? e.message : "Could not remove.");
    }
  }
  async function checkOut(stayId: string) {
    try {
      await api.post(`/stays/${stayId}/check-out`);
      toast.push("ok", "Checked out.");
      room.reload();
    } catch (e) {
      toast.push("error", e instanceof ApiError ? e.message : "Check-out failed.");
    }
  }

  if (room.loading) return <div className="screen muted" style={{ padding: 40 }}>Loading…</div>;
  if (room.error || !r) return <div className="screen alert alert-error" style={{ margin: 40 }}>{room.error ?? "Room not found"}</div>;

  const stays = r.stays ?? [];
  const canBook = r.status === "VACANT" || r.status === "RESERVED";

  return (
    <div className="screen">
      <PageHeader
        title={`Room ${r.number}`}
        subtitle={`${r.roomType?.name ?? ""}${r.floor ? ` · Floor ${r.floor}` : ""}`}
        actions={
          <button className="btn btn-ghost" onClick={() => navigate("/rooms")}>
            <Icon name="back" size={16} /> Rooms
          </button>
        }
      />

      <section className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="row spread" style={{ flexWrap: "wrap", gap: 14 }}>
          <div className="row" style={{ gap: 18 }}>
            <div>
              <div className="stat-label">Status</div>
              <select className="select" value={r.status} onChange={(e) => setStatus(e.target.value as RoomStatus)} style={{ marginTop: 4 }}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <div className="stat-label">Type / Rate</div>
              {isAdmin ? (
                <select className="select" value={r.roomTypeId} onChange={(e) => changeType(e.target.value)} style={{ marginTop: 4 }}>
                  {(types.data?.roomTypes ?? []).map((t) => (
                    <option key={t.id} value={t.id}>{t.name} · {formatINR(t.baseRatePaise)}</option>
                  ))}
                </select>
              ) : (
                <div className="stat-value money" style={{ fontSize: 18 }}>{r.roomType ? formatINR(r.roomType.baseRatePaise) : "—"}</div>
              )}
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {canBook && <button className="btn btn-primary" onClick={() => setShowBooking(true)}>+ New Booking</button>}
            {isAdmin && <button className="btn btn-sm" onClick={rename}>Rename</button>}
            {isAdmin && <button className="btn btn-sm btn-danger" onClick={remove}>Delete</button>}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-pad" style={{ paddingBottom: 0 }}><h3>Booking History</h3></div>
        {stays.length === 0 ? (
          <div className="card-pad empty">No bookings yet for this room.</div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Guest</th><th>Check-in</th><th>Check-out</th><th>Status</th><th>Bill</th><th className="right">Actions</th></tr>
            </thead>
            <tbody>
              {stays.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.guest?.name ?? "—"}</strong>{s.guest?.phone && <div className="muted" style={{ fontSize: 12 }}>{s.guest.phone}</div>}</td>
                  <td className="muted">{formatDateTime(s.checkIn)}</td>
                  <td className="muted">{s.checkOut ? formatDateTime(s.checkOut) : s.expectedOut ? `exp. ${formatDate(s.expectedOut)}` : "—"}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td>
                    {s.invoice ? (
                      <button className="linklike money" onClick={() => navigate(`/invoices/${s.invoice!.id}`)}>{s.invoice.number ?? "draft"} · {formatINR(s.invoice.grandTotalPaise)}</button>
                    ) : <span className="muted">Not billed</span>}
                  </td>
                  <td className="right">
                    <div className="row" style={{ justifyContent: "flex-end", gap: 6 }}>
                      {!s.invoice && (
                        <select className="select btn-sm quick-add bill-pick" value="" onChange={(e) => { if (e.target.value) navigate(`/new-bill/${s.id}/${e.target.value}`); }}>
                          <option value="">Bill ▾</option>
                          <option value="GST">GST Bill</option>
                          <option value="NON_GST">Non-GST Bill</option>
                        </select>
                      )}
                      {s.status === "CHECKED_IN" && <button className="btn btn-sm" onClick={() => checkOut(s.id)}>Check out</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {showBooking && (
        <BookingModal
          roomId={r.id}
          onClose={() => setShowBooking(false)}
          onCreated={() => { setShowBooking(false); toast.push("ok", "Booking created."); room.reload(); }}
        />
      )}
    </div>
  );
}
