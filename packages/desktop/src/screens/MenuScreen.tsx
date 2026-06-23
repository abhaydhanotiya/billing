import { useState } from "react";
import { PageHeader } from "../components/Layout.js";
import { Icon } from "../components/Icon.js";
import { useApi } from "../lib/useApi.js";
import { api, ApiError } from "../lib/api.js";
import { useToast } from "../lib/toast.js";
import { useHasRole } from "../lib/auth.js";
import { formatINR, rupeesToPaise } from "../lib/format.js";
import type { MenuItem } from "../lib/types.js";

export function MenuScreen() {
  const toast = useToast();
  const canEdit = useHasRole("RESTAURANT");
  const menu = useApi(() => api.get<{ items: MenuItem[] }>("/menu"), []);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [gst, setGst] = useState(5);
  const [category, setCategory] = useState<MenuItem["category"]>("FOOD");

  async function add() {
    if (!name.trim() || !price) {
      toast.push("error", "Name and price are required.");
      return;
    }
    try {
      await api.post("/menu", {
        name: name.trim(),
        category,
        pricePaise: rupeesToPaise(price),
        gstRatePct: gst,
      });
      toast.push("ok", "Item added.");
      setName("");
      setPrice("");
      menu.reload();
    } catch (e) {
      toast.push("error", e instanceof ApiError ? e.message : "Could not add item.");
    }
  }

  async function remove(item: MenuItem) {
    if (!window.confirm(`Remove "${item.name}" from the menu?`)) return;
    try {
      await api.del(`/menu/${item.id}`);
      menu.reload();
    } catch (e) {
      toast.push("error", e instanceof ApiError ? e.message : "Could not remove item.");
    }
  }

  const items = menu.data?.items ?? [];

  return (
    <div className="screen">
      <PageHeader title="Menu" subtitle="Restaurant items for quick billing" />

      {canEdit && (
        <section className="card card-pad" style={{ marginBottom: 18 }}>
          <h3 style={{ marginBottom: 14 }}>Add Item</h3>
          <div className="row" style={{ gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="field grow" style={{ minWidth: 200 }}>
              <label>Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label>Category</label>
              <select className="select" value={category} onChange={(e) => setCategory(e.target.value as MenuItem["category"])}>
                <option value="FOOD">Food</option>
                <option value="BEVERAGE">Beverage</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="field" style={{ width: 120 }}>
              <label>Price ₹</label>
              <input className="input num" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="field" style={{ width: 90 }}>
              <label>GST %</label>
              <select className="select num" value={gst} onChange={(e) => setGst(Number(e.target.value))}>
                {[0, 5, 12, 18, 28].map((r) => (
                  <option key={r} value={r}>{r}%</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={add}>Add</button>
          </div>
        </section>
      )}

      <div className="card">
        {menu.loading ? (
          <div className="card-pad muted">Loading…</div>
        ) : items.length === 0 ? (
          <div className="card-pad empty">No menu items yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th className="right">Price</th>
                <th className="right">GST</th>
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.name}</strong></td>
                  <td className="muted">{m.category.toLowerCase()}</td>
                  <td className="right money">{formatINR(m.pricePaise)}</td>
                  <td className="right money">{m.gstRatePct}%</td>
                  {canEdit && (
                    <td className="right">
                      <button className="icon-btn" onClick={() => remove(m)} title="Remove">
                        <Icon name="trash" size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
