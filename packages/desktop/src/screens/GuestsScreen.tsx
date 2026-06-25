import { useState } from "react";
import { PageHeader } from "../components/Layout.js";
import { Icon } from "../components/Icon.js";
import { useApi } from "../lib/useApi.js";
import { api, ApiError } from "../lib/api.js";
import { useToast } from "../lib/toast.js";
import { formatDate } from "../lib/format.js";
import type { Guest } from "../lib/types.js";

const EMPTY = { name: "", company: "", phone: "", gstin: "", address: "", email: "" };

export function GuestsScreen() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);

  const guests = useApi(
    () => api.get<{ guests: Guest[] }>(`/guests${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`),
    [search],
  );

  function openAdd() {
    setEditId(null);
    setForm(EMPTY);
    setShowForm(true);
  }
  function openEdit(g: Guest) {
    setEditId(g.id);
    setForm({ name: g.name, company: g.company ?? "", phone: g.phone ?? "", gstin: g.gstin ?? "", address: g.address ?? "", email: g.email ?? "" });
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim()) {
      toast.push("error", "Name is required.");
      return;
    }
    const body = {
      name: form.name.trim(),
      company: form.company.trim() || undefined,
      phone: form.phone.trim() || undefined,
      gstin: form.gstin.trim() || undefined,
      address: form.address.trim() || undefined,
      email: form.email.trim() || undefined,
    };
    try {
      if (editId) await api.patch(`/guests/${editId}`, body);
      else await api.post("/guests", body);
      toast.push("ok", editId ? "Guest updated." : "Guest added.");
      setForm(EMPTY);
      setEditId(null);
      setShowForm(false);
      guests.reload();
    } catch (e) {
      toast.push("error", e instanceof ApiError ? e.message : "Could not save guest.");
    }
  }

  const list = guests.data?.guests ?? [];

  return (
    <div className="screen">
      <PageHeader
        title="Guests"
        subtitle="Guest directory"
        actions={
          <button className="btn btn-primary" onClick={() => (showForm ? setShowForm(false) : openAdd())}>
            {showForm ? "Close" : "+ Add Guest"}
          </button>
        }
      />

      {showForm && (
        <section className="card card-pad rise" style={{ marginBottom: 18 }}>
          <h3 style={{ marginBottom: 12 }}>{editId ? "Edit Guest" : "Add Guest"}</h3>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="field"><label>Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field"><label>Company (for GST / B2B)</label><input className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            <div className="field"><label>Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="field"><label>GSTIN</label><input className="input" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></div>
            <div className="field"><label>Email</label><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="field" style={{ gridColumn: "1 / -1" }}><label>Address</label><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </div>
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
            <button className="btn btn-primary" onClick={save}>{editId ? "Save Changes" : "Save Guest"}</button>
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
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((g) => (
                <tr key={g.id}>
                  <td><strong>{g.name}</strong></td>
                  <td className="muted">{g.phone ?? "—"}</td>
                  <td className="muted">{g.gstin ?? "—"}</td>
                  <td className="muted">{formatDate((g as Guest & { createdAt?: string }).createdAt)}</td>
                  <td className="right">
                    <button className="btn btn-sm" onClick={() => openEdit(g)}>Edit</button>
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
