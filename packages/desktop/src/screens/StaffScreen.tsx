import { useState } from "react";
import { PageHeader } from "../components/Layout.js";
import { useApi } from "../lib/useApi.js";
import { api, ApiError } from "../lib/api.js";
import { useToast } from "../lib/toast.js";
import { formatDate } from "../lib/format.js";
import type { Role, StaffUser } from "../lib/types.js";

const ROLES: Role[] = ["ADMIN", "RECEPTION", "RESTAURANT"];

export function StaffScreen() {
  const toast = useToast();
  const users = useApi(() => api.get<{ users: StaffUser[] }>("/users"), []);
  const [form, setForm] = useState({ username: "", displayName: "", role: "RECEPTION" as Role, pin: "" });

  async function add() {
    if (!form.username.trim() || !form.displayName.trim() || form.pin.length < 4) {
      toast.push("error", "Username, name, and a 4+ digit PIN are required.");
      return;
    }
    try {
      await api.post("/users", {
        username: form.username.trim().toLowerCase(),
        displayName: form.displayName.trim(),
        role: form.role,
        pin: form.pin,
      });
      toast.push("ok", "Staff member added.");
      setForm({ username: "", displayName: "", role: "RECEPTION", pin: "" });
      users.reload();
    } catch (e) {
      toast.push("error", e instanceof ApiError ? e.message : "Could not add user.");
    }
  }

  async function toggleActive(u: StaffUser) {
    try {
      await api.patch(`/users/${u.id}`, { active: !u.active });
      users.reload();
    } catch (e) {
      toast.push("error", e instanceof ApiError ? e.message : "Update failed.");
    }
  }

  async function changeRole(u: StaffUser, role: Role) {
    try {
      await api.patch(`/users/${u.id}`, { role });
      toast.push("ok", `${u.displayName} is now ${role}.`);
      users.reload();
    } catch (e) {
      toast.push("error", e instanceof ApiError ? e.message : "Update failed.");
    }
  }

  async function resetPin(u: StaffUser) {
    const pin = window.prompt(`New PIN for ${u.displayName} (4+ characters):`);
    if (!pin) return;
    try {
      await api.post(`/users/${u.id}/reset-pin`, { pin });
      toast.push("ok", "PIN reset.");
    } catch (e) {
      toast.push("error", e instanceof ApiError ? e.message : "Reset failed.");
    }
  }

  const list = users.data?.users ?? [];

  return (
    <div className="screen">
      <PageHeader title="Staff" subtitle="Manage who can sign in and what they can do" />

      <section className="card card-pad" style={{ marginBottom: 18 }}>
        <h3 style={{ marginBottom: 14 }}>Add Staff</h3>
        <div className="row" style={{ gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field"><label>Username</label><input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
          <div className="field grow" style={{ minWidth: 160 }}><label>Display name</label><input className="input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></div>
          <div className="field"><label>Role</label>
            <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="field" style={{ width: 120 }}><label>PIN</label><input className="input" type="password" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} /></div>
          <button className="btn btn-primary" onClick={add}>Add</button>
        </div>
      </section>

      <div className="card">
        {users.loading ? (
          <div className="card-pad muted">Loading…</div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Username</th><th>Name</th><th>Role</th><th>Status</th><th>Added</th><th className="right">Actions</th></tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.username}</strong></td>
                  <td>{u.displayName}</td>
                  <td>
                    <select className="select btn-sm" value={u.role} onChange={(e) => changeRole(u, e.target.value as Role)}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td>
                    <span className="badge" style={{ background: u.active ? "var(--ok-soft)" : "var(--paper-sunk)", color: u.active ? "var(--ok)" : "var(--muted)" }}>
                      {u.active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="muted">{formatDate(u.createdAt)}</td>
                  <td className="right">
                    <div className="row" style={{ justifyContent: "flex-end", gap: 6 }}>
                      <button className="btn btn-sm" onClick={() => resetPin(u)}>Reset PIN</button>
                      <button className="btn btn-sm" onClick={() => toggleActive(u)}>{u.active ? "Disable" : "Enable"}</button>
                    </div>
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
