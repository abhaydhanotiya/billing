import { useState } from "react";
import { api, ApiError } from "../lib/api.js";
import type { Invoice } from "../lib/types.js";

/** Correct the bill-to details (name, company, address, GSTIN, phone) on an invoice. */
export function EditBillToModal({
  invoice,
  onClose,
  onSaved,
}: {
  invoice: Invoice;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: invoice.billToName ?? "",
    company: invoice.billToCompany ?? "",
    address: invoice.billToAddress ?? "",
    gstin: invoice.billToGstin ?? "",
    phone: invoice.billToPhone ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.patch(`/invoices/${invoice.id}/bill-to`, {
        name: form.name.trim(),
        company: form.company.trim(),
        address: form.address.trim(),
        gstin: form.gstin.trim(),
        phone: form.phone.trim(),
      });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save.");
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop no-print" onClick={onClose}>
      <div className="modal modal-wide rise" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 14 }}>Edit Bill To</h3>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="field"><label>Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>Company (GST / B2B)</label><input className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          <div className="field"><label>Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="field"><label>GSTIN</label><input className="input" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></div>
          <div className="field" style={{ gridColumn: "1 / -1" }}><label>Address</label><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        </div>
        {error && <div className="alert alert-error" style={{ marginTop: 14 }}>{error}</div>}
        <div className="row spread" style={{ marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
