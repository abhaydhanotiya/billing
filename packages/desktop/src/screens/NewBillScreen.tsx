import { useEffect, useMemo, useRef, useState } from "react";
import { computeBill, type LineItemInput } from "@sanskar/shared";
import { PageHeader } from "../components/Layout.js";
import { Icon } from "../components/Icon.js";
import { useApi } from "../lib/useApi.js";
import { api, ApiError } from "../lib/api.js";
import { navigate } from "../lib/router.js";
import { useToast } from "../lib/toast.js";
import { formatAmount, formatINR, rupeesToPaise } from "../lib/format.js";
import type { BillMode, Guest, MenuItem, Room, Stay } from "../lib/types.js";

/** Whole nights between two dates, minimum 1. */
function nightsBetween(from: string, to?: string | null): number {
  const start = new Date(from).getTime();
  const end = to ? new Date(to).getTime() : Date.now();
  return Math.max(1, Math.ceil((end - start) / 86_400_000));
}

interface EditLine {
  key: string;
  category: "ROOM" | "FOOD" | "OTHER";
  description: string;
  hsnSac: string;
  qty: string;
  unitPrice: string; // rupees
  discountPercent: string;
  gstRatePct: number;
}

let lineKey = 1;
function blankLine(over: Partial<EditLine> = {}): EditLine {
  return {
    key: String(lineKey++),
    category: "OTHER",
    description: "",
    hsnSac: "",
    qty: "1",
    unitPrice: "",
    discountPercent: "",
    gstRatePct: 5,
    ...over,
  };
}

const GST_RATES = [0, 5, 12, 18, 28];

export function NewBillScreen({ stayId, initialMode }: { stayId?: string; initialMode?: string }) {
  const toast = useToast();
  const [mode, setMode] = useState<BillMode>(initialMode === "NON_GST" ? "NON_GST" : "GST");
  const [lines, setLines] = useState<EditLine[]>([blankLine({ category: "OTHER" })]);
  const [billDiscountPct, setBillDiscountPct] = useState("");
  const [roundToRupee, setRoundToRupee] = useState(true);
  const [busy, setBusy] = useState(false);
  const [bookingLabel, setBookingLabel] = useState<string | null>(null);

  // Bill-to
  const [guestId, setGuestId] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");
  const [guestSearch, setGuestSearch] = useState("");

  const rooms = useApi(() => api.get<{ rooms: Room[] }>("/rooms"), []);
  const menu = useApi(() => api.get<{ items: MenuItem[] }>("/menu"), []);
  const guests = useApi(
    () =>
      guestSearch.trim().length >= 2
        ? api.get<{ guests: Guest[] }>(`/guests?search=${encodeURIComponent(guestSearch.trim())}`)
        : Promise.resolve({ guests: [] }),
    [guestSearch],
  );

  // When opened from a booking (/new-bill/:stayId), load it once and prefill:
  // room nights + any restaurant orders posted to the stay + the guest as bill-to.
  const prefilled = useRef(false);
  useEffect(() => {
    if (!stayId || prefilled.current) return;
    prefilled.current = true;
    api
      .get<{ stay: Stay }>(`/stays/${stayId}`)
      .then(({ stay }) => {
        const nights = nightsBetween(stay.checkIn, stay.checkOut ?? stay.expectedOut);
        const roomLine = blankLine({
          category: "ROOM",
          description: `Room ${stay.room?.number ?? ""} — ${stay.room?.roomType?.name ?? ""} (${nights} night${nights > 1 ? "s" : ""})`.trim(),
          hsnSac: stay.room?.roomType?.hsnSac ?? "996311",
          qty: String(nights),
          unitPrice: String(stay.nightlyRatePaise / 100),
          gstRatePct: stay.gstRatePct,
        });
        // Restaurant orders posted to this stay become food lines.
        const foodLines: EditLine[] = (stay.orders ?? []).flatMap((o) =>
          o.items.map((it) =>
            blankLine({
              category: "FOOD",
              description: it.nameSnapshot,
              hsnSac: "996331",
              qty: String(it.qty),
              unitPrice: String(it.pricePaise / 100),
              gstRatePct: it.gstRatePct,
            }),
          ),
        );
        setLines([roomLine, ...foodLines]);
        if (stay.guest) {
          setGuestId(stay.guest.id);
          setName(stay.guest.name);
          setPhone(stay.guest.phone ?? "");
          setGstin(stay.guest.gstin ?? "");
          setAddress(stay.guest.address ?? "");
        }
        setBookingLabel(`Room ${stay.room?.number ?? ""} · ${stay.guest?.name ?? "guest"}`);
      })
      .catch((e) => toast.push("error", e instanceof ApiError ? e.message : "Could not load booking."));
  }, [stayId, toast]);

  // Convert editable lines to engine input (skips empty rows).
  const engineLines: LineItemInput[] = useMemo(
    () =>
      lines
        .filter((l) => l.description.trim() && Number(l.unitPrice) > 0)
        .map((l) => ({
          category: l.category,
          description: l.description.trim(),
          hsnSac: l.hsnSac || undefined,
          qty: Number(l.qty) || 0,
          unitPricePaise: rupeesToPaise(l.unitPrice),
          discountPercent: l.discountPercent ? Number(l.discountPercent) : undefined,
          gstRatePct: l.gstRatePct,
        })),
    [lines],
  );

  // Live computation — identical engine to the server, so the preview matches the saved bill.
  const bill = useMemo(
    () =>
      computeBill({
        mode,
        lines: engineLines,
        billDiscount: billDiscountPct ? { discountPercent: Number(billDiscountPct) } : undefined,
        roundToRupee,
      }),
    [mode, engineLines, billDiscountPct, roundToRupee],
  );

  function updateLine(key: string, patch: Partial<EditLine>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function removeLine(key: string) {
    setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : ls));
  }
  function addRoom(room: Room) {
    setLines((ls) => [
      ...ls,
      blankLine({
        category: "ROOM",
        description: `Room ${room.number} — ${room.roomType?.name ?? ""}`.trim(),
        hsnSac: room.roomType?.hsnSac ?? "996311",
        unitPrice: String((room.roomType?.baseRatePaise ?? 0) / 100),
        gstRatePct: room.roomType?.gstRatePct ?? 12,
      }),
    ]);
  }
  function addMenuItem(item: MenuItem) {
    setLines((ls) => [
      ...ls,
      blankLine({
        category: "FOOD",
        description: item.name,
        hsnSac: item.hsnSac ?? "996331",
        unitPrice: String(item.pricePaise / 100),
        gstRatePct: item.gstRatePct,
      }),
    ]);
  }

  function selectGuest(g: Guest) {
    setGuestId(g.id);
    setName(g.name);
    setPhone(g.phone ?? "");
    setGstin(g.gstin ?? "");
    setAddress(g.address ?? "");
    setGuestSearch("");
  }

  function buildPayload() {
    return {
      mode,
      billTo: {
        guestId,
        name: name.trim() || "Walk-in Guest",
        phone: phone.trim() || undefined,
        gstin: gstin.trim() || undefined,
        address: address.trim() || undefined,
      },
      lines: engineLines.map((l) => ({
        ...l,
        discountPercent: l.discountPercent,
      })),
      billDiscount: billDiscountPct ? { discountPercent: Number(billDiscountPct) } : undefined,
      roundToRupee,
      stayId, // links the bill to the booking when present
    };
  }

  async function save(finalize: boolean) {
    if (engineLines.length === 0) {
      toast.push("error", "Add at least one line with a description and amount.");
      return;
    }
    setBusy(true);
    try {
      const { invoice } = await api.post<{ invoice: { id: string } }>("/invoices", buildPayload());
      if (finalize) {
        await api.post(`/invoices/${invoice.id}/finalize`);
        toast.push("ok", "Invoice finalized.");
      } else {
        toast.push("ok", "Draft saved.");
      }
      navigate(`/invoices/${invoice.id}`);
    } catch (err) {
      toast.push("error", err instanceof ApiError ? err.message : "Could not save the bill.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <PageHeader
        title="New Bill"
        subtitle={bookingLabel ? `Billing booking · ${bookingLabel}` : "Build a room, restaurant, or mixed bill"}
        actions={
          <div className="seg">
            <button className={`seg-btn ${mode === "GST" ? "is-on" : ""}`} onClick={() => setMode("GST")}>
              GST
            </button>
            <button
              className={`seg-btn ${mode === "NON_GST" ? "is-on" : ""}`}
              onClick={() => setMode("NON_GST")}
            >
              Non-GST
            </button>
          </div>
        }
      />

      <div className="bill-layout">
        {/* LEFT: bill-to + lines */}
        <div className="stack" style={{ gap: 18 }}>
          <section className="card card-pad">
            <h3 style={{ marginBottom: 14 }}>Bill To</h3>
            <div className="guest-search">
              <Icon name="search" size={16} />
              <input
                className="input"
                placeholder="Search existing guest by name or phone…"
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
                style={{ border: "none", boxShadow: "none", paddingLeft: 6 }}
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

            <div className="grid-2" style={{ marginTop: 14 }}>
              <div className="field">
                <label>Name</label>
                <input className="input" value={name} onChange={(e) => { setName(e.target.value); setGuestId(undefined); }} placeholder="Guest / company name" />
              </div>
              <div className="field">
                <label>Phone</label>
                <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              {mode === "GST" && (
                <div className="field">
                  <label>GSTIN (for B2B)</label>
                  <input className="input" value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="Optional" />
                </div>
              )}
              <div className="field" style={{ gridColumn: mode === "GST" ? "auto" : "1 / -1" }}>
                <label>Address</label>
                <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="card card-pad">
            <div className="row spread" style={{ marginBottom: 12 }}>
              <h3>Items</h3>
              <div className="row" style={{ gap: 8 }}>
                <QuickAdd label="+ Room" items={(rooms.data?.rooms ?? []).map((r) => ({ id: r.id, label: `${r.number} · ${r.roomType?.name ?? ""}`, obj: r }))} onPick={(o) => addRoom(o as Room)} />
                <QuickAdd label="+ Menu" items={(menu.data?.items ?? []).map((m) => ({ id: m.id, label: `${m.name} · ${formatINR(m.pricePaise)}`, obj: m }))} onPick={(o) => addMenuItem(o as MenuItem)} />
              </div>
            </div>

            <div className={`line-table ${mode === "GST" ? "with-gst" : "no-gst"}`}>
              <div className="line-head">
                <span>Description</span>
                <span>HSN/SAC</span>
                <span className="right">Qty</span>
                <span className="right">Rate ₹</span>
                {mode === "GST" && <span className="right">GST%</span>}
                <span className="right">Disc%</span>
                <span className="right">Amount</span>
                <span />
              </div>

              {lines.map((l) => {
                const gross = (Number(l.qty) || 0) * rupeesToPaise(l.unitPrice || "0");
                return (
                  <div className="line-row" key={l.key}>
                    <input
                      className="input"
                      placeholder="Item description"
                      value={l.description}
                      onChange={(e) => updateLine(l.key, { description: e.target.value })}
                    />
                    <input
                      className="input"
                      value={l.hsnSac}
                      onChange={(e) => updateLine(l.key, { hsnSac: e.target.value })}
                    />
                    <input
                      className="input num"
                      value={l.qty}
                      onChange={(e) => updateLine(l.key, { qty: e.target.value })}
                    />
                    <input
                      className="input num"
                      value={l.unitPrice}
                      onChange={(e) => updateLine(l.key, { unitPrice: e.target.value })}
                    />
                    {mode === "GST" && (
                      <select
                        className="select num"
                        value={l.gstRatePct}
                        onChange={(e) => updateLine(l.key, { gstRatePct: Number(e.target.value) })}
                      >
                        {GST_RATES.map((r) => (
                          <option key={r} value={r}>
                            {r}%
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      className="input num"
                      value={l.discountPercent}
                      placeholder="0"
                      onChange={(e) => updateLine(l.key, { discountPercent: e.target.value })}
                    />
                    <div className="line-amount money">{formatAmount(gross)}</div>
                    <button className="icon-btn" onClick={() => removeLine(l.key)} title="Remove">
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                );
              })}
            </div>

            <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setLines((ls) => [...ls, blankLine()])}>
              <Icon name="plus" size={15} /> Add line
            </button>
          </section>
        </div>

        {/* RIGHT: totals */}
        <aside className="bill-summary">
          <div className="card card-pad summary-card">
            <h3 style={{ marginBottom: 14 }}>Summary</h3>

            <SummaryRow label="Gross" value={formatINR(bill.grossPaise)} />
            {bill.totalDiscountPaise > 0 && (
              <SummaryRow label="Discount" value={`– ${formatAmount(bill.totalDiscountPaise)}`} muted />
            )}
            <SummaryRow label="Taxable Value" value={formatINR(bill.taxableValuePaise)} />

            {mode === "GST" && (
              <>
                <SummaryRow label="CGST" value={formatINR(bill.totalCgstPaise)} muted />
                <SummaryRow label="SGST" value={formatINR(bill.totalSgstPaise)} muted />
              </>
            )}
            {bill.roundOffPaise !== 0 && (
              <SummaryRow
                label="Round Off"
                value={`${bill.roundOffPaise > 0 ? "+" : "–"} ${formatAmount(Math.abs(bill.roundOffPaise))}`}
                muted
              />
            )}

            <div className="hairline" style={{ margin: "12px 0" }} />
            <div className="grand-row">
              <span>Grand Total</span>
              <span className="money grand-amt">{formatINR(bill.grandTotalPaise)}</span>
            </div>
            {bill.grandTotalPaise > 0 && (
              <div className="amount-words">{bill.amountInWords}</div>
            )}

            <div className="hairline" style={{ margin: "16px 0" }} />

            <div className="grid-2" style={{ gap: 12 }}>
              <div className="field">
                <label>Bill discount %</label>
                <input
                  className="input num"
                  value={billDiscountPct}
                  placeholder="0"
                  onChange={(e) => setBillDiscountPct(e.target.value)}
                />
              </div>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={roundToRupee}
                  onChange={(e) => setRoundToRupee(e.target.checked)}
                />
                Round to nearest ₹
              </label>
            </div>

            <div className="stack" style={{ gap: 9, marginTop: 18 }}>
              <button className="btn btn-primary btn-lg" disabled={busy} onClick={() => save(true)}>
                {busy ? "Saving…" : "Finalize & Print"}
              </button>
              <button className="btn btn-lg" disabled={busy} onClick={() => save(false)}>
                Save as Draft
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`sum-row ${muted ? "muted" : ""}`}>
      <span>{label}</span>
      <span className="money">{value}</span>
    </div>
  );
}

/** Small popover-style picker driven by a native select for reliability. */
function QuickAdd({
  label,
  items,
  onPick,
}: {
  label: string;
  items: { id: string; label: string; obj: unknown }[];
  onPick: (obj: unknown) => void;
}) {
  return (
    <select
      className="select btn-sm quick-add"
      value=""
      onChange={(e) => {
        const found = items.find((i) => i.id === e.target.value);
        if (found) onPick(found.obj);
        e.target.value = "";
      }}
    >
      <option value="">{label}</option>
      {items.map((i) => (
        <option key={i.id} value={i.id}>
          {i.label}
        </option>
      ))}
    </select>
  );
}
