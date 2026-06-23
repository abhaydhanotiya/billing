import { useState } from "react";
import { PageHeader } from "../components/Layout.js";
import { Icon } from "../components/Icon.js";
import { useApi } from "../lib/useApi.js";
import { api, ApiError } from "../lib/api.js";
import { useToast } from "../lib/toast.js";
import { formatDate } from "../lib/format.js";
import type { Guest } from "../lib/types.js";

export function GuestsScreen() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const guests = useApi(
    () => api.get<{ guests: Guest[] }>(`/guests${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`),
    [search],
  );

  const [form, setForm] = useState({ name: "", phone: "", gstin: "", address: "", email: "" });

  async function add() {
    if (!form.name.trim()) {
      toast.push("error", "Name is required.");
      return;
    }
    try {
      await api.post("/guests", {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        gstin: form.gstin.trim() || undefined,
        address: form.address.trim() || undefined,
        email: form.email.trim() || undefined,
      });
      toast.push("ok", "Guest added.");
      setForm({ name: "", phone: "", gstin: "", address: "", email: "" });
      setShowAdd(false);
      guests.reload();
    } catch (e) {
      toast.push("error", e instanceof ApiError ? e.message : "Could not add guest.");
    }
  }

  const list = guests.data?.guests ?? [];

  return (
    <div className="screen">
      <PageHeader
        title="Guests"
        subtitle="Guest directory"
        actions={
          <button className="btn btn-primary" onClick={() => setShowAdd((s) => !s)}>
            {showAdd ? "Close" : "+ Add Guest"}
          </button>
        }
      />

      {showAdd && (
        <section className="card card-pad rise" style={{ marginBottom: 18 }}>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="field"><label>Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field"><label>Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="field"><label>GSTIN</label><input className="input" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></div>
            <div className="field"><label>Email</label><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="field" style={{ gridColumn: "1 / -1" }}><label>Address</label><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </div>
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
            <button className="btn btn-primary" onClick={add}>Save Guest</button>
          </div>
        </section>
      )}

      <div className="search-bar card" style={{ marginBottom: 16, padding: "4px 12px" }}>
        <Icon name="search" size={16} />
        <input
          className="input"
          style={{ border: "none", boxShadow: "none" }}
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        {guests.loading ? (
          <div className="card-pad muted">Loading…</div>
        ) : list.length === 0 ? (
          <div className="card-pad empty">No guests found.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>GSTIN</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {list.map((g) => (
                <tr key={g.id}>
                  <td><strong>{g.name}</strong></td>
                  <td className="muted">{g.phone ?? "—"}</td>
                  <td className="muted">{g.gstin ?? "—"}</td>
                  <td className="muted">{formatDate((g as Guest & { createdAt?: string }).createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
