import { useMemo, useState } from "react";
import { Icon } from "./Icon.js";
import { api, ApiError } from "../lib/api.js";
import { useApi } from "../lib/useApi.js";
import { formatINR, rupeesToPaise } from "../lib/format.js";
import type { Guest, Room } from "../lib/types.js";

/** Create a booking: pick/create guest, pick a vacant room, set rate + dates. */
export function BookingModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const rooms = useApi(() => api.get<{ rooms: Room[] }>("/rooms"), []);

  // Guest: either an existing one (guestId) or a new name+phone.
  const [guestId, setGuestId] = useState<string | undefined>();
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestSearch, setGuestSearch] = useState("");
  const guests = useApi(
    () =>
      guestSearch.trim().length >= 2
        ? api.get<{ guests: Guest[] }>(`/guests?search=${encodeURIComponent(guestSearch.trim())}`)
        : Promise.resolve({ guests: [] }),
    [guestSearch],
  );

  const [roomId, setRoomId] = useState("");
  const [rate, setRate] = useState("");
  const [gst, setGst] = useState(5);
  const nowLocal = useMemo(() => {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  }, []);
  const [checkIn, setCheckIn] = useState(nowLocal);
  const [expectedOut, setExpectedOut] = useState("");
  const [adults, setAdults] = useState("1");
  const [children, setChildren] = useState("0");
  const [notes, setNotes] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const vacantRooms = (rooms.data?.rooms ?? []).filter(
    (r) => r.status === "VACANT" || r.status === "RESERVED",
  );

  function pickRoom(id: string) {
    setRoomId(id);
    const room = rooms.data?.rooms.find((r) => r.id === id);
    if (room?.roomType) {
      setRate(String(room.roomType.baseRatePaise / 100));
      setGst(room.roomType.gstRatePct);
    }
  }

  function selectGuest(g: Guest) {
    setGuestId(g.id);
    setGuestName(g.name);
    setGuestPhone(g.phone ?? "");
    setGuestSearch("");
  }

  async function submit() {
    setError("");
    if (!guestName.trim()) return setError("Guest name is required.");
    if (!roomId) return setError("Select a room.");
    if (!rate || rupeesToPaise(rate) <= 0) return setError("Enter a nightly rate.");
    setBusy(true);
    try {
      // Create the guest first if this is a new walk-in.
      let gid = guestId;
      if (!gid) {
        const res = await api.post<{ guest: Guest }>("/guests", {
          name: guestName.trim(),
          phone: guestPhone.trim() || undefined,
        });
        gid = res.guest.id;
      }
      await api.post("/stays", {
        guestId: gid,
        roomId,
        nightlyRatePaise: rupeesToPaise(rate),
        gstRatePct: gst,
        checkIn: new Date(checkIn).toISOString(),
        expectedOut: expectedOut ? new Date(expectedOut).toISOString() : undefined,
        adults: Number(adults) || 1,
        children: Number(children) || 0,
        notes: notes.trim() || undefined,
      });
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not create booking.");
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop no-print" onClick={onClose}>
      <div className="modal modal-wide rise" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16 }}>New Booking / Check-in</h3>

        {/* Guest */}
        <div className="field" style={{ marginBottom: 12 }}>
          <label>Guest</label>
          <div className="guest-search">
            <Icon name="search" size={16} />
            <input
              className="input"
              style={{ border: "none", boxShadow: "none", paddingLeft: 6 }}
              placeholder="Search existing guest…"
              value={guestSearch}
              onChange={(e) => setGuestSearch(e.target.value)}
            />
            {guests.data && guests.data.guests.length > 0 && guestSearch && (
              <div className="guest-results">
                {guests.data.guests.map((g) => (
                  <button key={g.id} className="guest-result" onClick={() => selectGuest(g)}>
                    <strong>{g.name}</strong>
                    <span className="muted">{g.phone ?? ""}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
          <div className="field">
            <label>Name</label>
            <input className="input" value={guestName} onChange={(e) => { setGuestName(e.target.value); setGuestId(undefined); }} />
          </div>
          <div className="field">
            <label>Phone</label>
            <input className="input" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
          </div>
        </div>

        {/* Room + rate */}
        <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
          <div className="field">
            <label>Room</label>
            <select className="select" value={roomId} onChange={(e) => pickRoom(e.target.value)}>
              <option value="">Select a vacant room…</option>
              {vacantRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.number} · {r.roomType?.name ?? ""} ({r.roomType ? formatINR(r.roomType.baseRatePaise) : ""})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Nightly Rate ₹</label>
            <input className="input num" value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
        </div>

        <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
          <div className="field">
            <label>Check-in</label>
            <input type="datetime-local" className="input" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </div>
          <div className="field">
            <label>Expected check-out</label>
            <input type="date" className="input" value={expectedOut} onChange={(e) => setExpectedOut(e.target.value)} />
          </div>
        </div>

        <div className="row" style={{ gap: 12, marginBottom: 4 }}>
          <div className="field" style={{ width: 90 }}>
            <label>Adults</label>
            <input className="input num" value={adults} onChange={(e) => setAdults(e.target.value)} />
          </div>
          <div className="field" style={{ width: 90 }}>
            <label>Children</label>
            <input className="input num" value={children} onChange={(e) => setChildren(e.target.value)} />
          </div>
          <div className="field grow">
            <label>GST %</label>
            <select className="select num" value={gst} onChange={(e) => setGst(Number(e.target.value))}>
              {[0, 5, 12, 18].map((r) => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label>Notes</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <div className="alert alert-error" style={{ marginTop: 14 }}>{error}</div>}

        <div className="row spread" style={{ marginTop: 22 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Check in"}
          </button>
        </div>
      </div>
    </div>
  );
}
