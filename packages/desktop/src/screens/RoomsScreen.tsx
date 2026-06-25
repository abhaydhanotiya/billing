import { useState } from "react";
import { PageHeader } from "../components/Layout.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { useApi } from "../lib/useApi.js";
import { api, ApiError } from "../lib/api.js";
import { navigate } from "../lib/router.js";
import { useToast } from "../lib/toast.js";
import { useHasRole } from "../lib/auth.js";
import { formatINR, rupeesToPaise } from "../lib/format.js";
import type { Room, RoomStatus, RoomType } from "../lib/types.js";

const STATUSES: RoomStatus[] = ["VACANT", "OCCUPIED", "RESERVED", "CLEANING", "MAINTENANCE"];

export function RoomsScreen() {
  const toast = useToast();
  const isAdmin = useHasRole();
  const rooms = useApi(() => api.get<{ rooms: Room[] }>("/rooms"), []);
  const types = useApi(() => api.get<{ roomTypes: RoomType[] }>("/room-types"), []);
  const [showAdd, setShowAdd] = useState(false);

  const [room, setRoom] = useState({ number: "", floor: "", roomTypeId: "" });
  const [rt, setRt] = useState({ name: "", rate: "", gst: 5 });

  async function addRoom() {
    if (!room.number.trim() || !room.roomTypeId) {
      toast.push("error", "Room number and type are required.");
      return;
    }
    try {
      await api.post("/rooms", { number: room.number.trim(), floor: room.floor.trim() || undefined, roomTypeId: room.roomTypeId });
      toast.push("ok", `Room ${room.number} added.`);
      setRoom({ number: "", floor: "", roomTypeId: "" });
      rooms.reload();
    } catch (e) {
      toast.push("error", e instanceof ApiError ? e.message : "Could not add room.");
    }
  }

  async function addType() {
    if (!rt.name.trim() || !rt.rate) {
      toast.push("error", "Type name and rate are required.");
      return;
    }
    try {
      await api.post("/room-types", { name: rt.name.trim(), baseRatePaise: rupeesToPaise(rt.rate), gstRatePct: rt.gst });
      toast.push("ok", "Room type added.");
      setRt({ name: "", rate: "", gst: 5 });
      types.reload();
    } catch (e) {
      toast.push("error", e instanceof ApiError ? e.message : "Could not add type.");
    }
  }

  async function setStatus(id: string, status: RoomStatus) {
    try {
      await api.patch(`/rooms/${id}/status`, { status });
      rooms.reload();
    } catch (e) {
      toast.push("error", e instanceof ApiError ? e.message : "Update failed.");
    }
  }

  const list = rooms.data?.rooms ?? [];
  const roomTypes = types.data?.roomTypes ?? [];

  return (
    <div className="screen">
      <PageHeader
        title="Rooms"
        subtitle="Click a room to see its bookings"
        actions={isAdmin ? <button className="btn btn-primary" onClick={() => setShowAdd((s) => !s)}>{showAdd ? "Close" : "+ Add Room"}</button> : undefined}
      />

      {isAdmin && showAdd && (
        <section className="card card-pad rise" style={{ marginBottom: 18 }}>
          <h3 style={{ marginBottom: 12 }}>Add Room</h3>
          <div className="row" style={{ gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="field" style={{ width: 110 }}><label>Number</label><input className="input" value={room.number} onChange={(e) => setRoom({ ...room, number: e.target.value })} /></div>
            <div className="field" style={{ width: 100 }}><label>Floor</label><input className="input" value={room.floor} onChange={(e) => setRoom({ ...room, floor: e.target.value })} /></div>
            <div className="field grow" style={{ minWidth: 180 }}>
              <label>Type</label>
              <select className="select" value={room.roomTypeId} onChange={(e) => setRoom({ ...room, roomTypeId: e.target.value })}>
                <option value="">Select type…</option>
                {roomTypes.map((t) => <option key={t.id} value={t.id}>{t.name} · {formatINR(t.baseRatePaise)}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" onClick={addRoom}>Add Room</button>
          </div>

          <div className="hairline" style={{ margin: "16px 0" }} />
          <h3 style={{ marginBottom: 12 }}>Add Room Type</h3>
          <div className="row" style={{ gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="field grow" style={{ minWidth: 160 }}><label>Name</label><input className="input" value={rt.name} onChange={(e) => setRt({ ...rt, name: e.target.value })} placeholder="Deluxe, Suite…" /></div>
            <div className="field" style={{ width: 120 }}><label>Base rate ₹</label><input className="input num" value={rt.rate} onChange={(e) => setRt({ ...rt, rate: e.target.value })} /></div>
            <div className="field" style={{ width: 90 }}><label>GST %</label>
              <select className="select num" value={rt.gst} onChange={(e) => setRt({ ...rt, gst: Number(e.target.value) })}>
                {[0, 5, 12, 18].map((g) => <option key={g} value={g}>{g}%</option>)}
              </select>
            </div>
            <button className="btn" onClick={addType}>Add Type</button>
          </div>
        </section>
      )}

      <div className="card">
        {rooms.loading ? (
          <div className="card-pad muted">Loading…</div>
        ) : list.length === 0 ? (
          <div className="card-pad empty">No rooms configured.</div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Room</th><th>Type</th><th className="right">Base Rate</th><th>Status</th><th>Set status</th></tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/rooms/${r.id}`)}>
                  <td><strong>{r.number}</strong>{r.floor && <span className="muted"> · Floor {r.floor}</span>}</td>
                  <td>{r.roomType?.name ?? "—"}</td>
                  <td className="right money">{r.roomType ? formatINR(r.roomType.baseRatePaise) : "—"}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select className="select btn-sm" value={r.status} onChange={(e) => setStatus(r.id, e.target.value as RoomStatus)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
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
