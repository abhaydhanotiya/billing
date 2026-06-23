import { useState } from "react";
import { formatINR, rupeesToPaise } from "../lib/format.js";
import type { PaymentMode } from "../lib/types.js";

const MODES: PaymentMode[] = ["CASH", "UPI", "CARD", "BANK", "OTHER"];

export function PaymentModal({
  balancePaise,
  onClose,
  onSubmit,
}: {
  balancePaise: number;
  onClose: () => void;
  onSubmit: (mode: PaymentMode, amountPaise: number, reference?: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<PaymentMode>("CASH");
  const [amount, setAmount] = useState(String((balancePaise / 100).toFixed(2)));
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const paise = rupeesToPaise(amount);
    if (paise <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSubmit(mode, paise, reference.trim() || undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record payment.");
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop no-print" onClick={onClose}>
      <div className="modal rise" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 4 }}>Record Payment</h3>
        <p className="muted" style={{ marginBottom: 18 }}>
          Outstanding balance: <strong className="money">{formatINR(balancePaise)}</strong>
        </p>

        <div className="field" style={{ marginBottom: 14 }}>
          <label>Mode</label>
          <div className="seg">
            {MODES.map((m) => (
              <button key={m} className={`seg-btn ${mode === m ? "is-on" : ""}`} onClick={() => setMode(m)}>
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="grid-2" style={{ gap: 12 }}>
          <div className="field">
            <label>Amount ₹</label>
            <input className="input num" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>Reference</label>
            <input
              className="input"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="UPI ref / card last-4"
            />
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginTop: 14 }}>{error}</div>}

        <div className="row spread" style={{ marginTop: 22 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Record Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
