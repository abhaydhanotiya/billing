import { useEffect, useState } from "react";
import { useApi } from "../lib/useApi.js";
import { api, ApiError } from "../lib/api.js";
import { useToast } from "../lib/toast.js";

interface Counter {
  prefix: string;
  label: string;
  nextNumber: number;
}

/** Admin control to set the next invoice number for each series. */
export function InvoiceNumbering() {
  const toast = useToast();
  const { data, reload } = useApi(() => api.get<{ counters: Counter[] }>("/invoice-counters"), []);
  const [edits, setEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) setEdits(Object.fromEntries(data.counters.map((c) => [c.prefix, String(c.nextNumber)])));
  }, [data]);

  async function save(c: Counter) {
    const n = Number(edits[c.prefix]);
    if (!Number.isInteger(n) || n < 1) {
      toast.push("error", "Enter a whole number (1 or more).");
      return;
    }
    try {
      await api.put(`/invoice-counters/${c.prefix}`, { nextNumber: n });
      toast.push("ok", `Next ${c.prefix} bill will be ${c.prefix}-${n}.`);
      reload();
    } catch (e) {
      toast.push("error", e instanceof ApiError ? e.message : "Could not update.");
    }
  }

  const counters = data?.counters ?? [];

  return (
    <section className="card card-pad">
      <h3 style={{ marginBottom: 6 }}>Invoice Numbering</h3>
      <p className="muted" style={{ fontSize: 12.5, marginBottom: 14 }}>
        Set the next number for each series — e.g. to continue from your existing bill book. Numbers
        already used can't be reset below.
      </p>
      <div className="stack" style={{ gap: 12 }}>
        {counters.map((c) => (
          <div key={c.prefix} className="row" style={{ gap: 12, alignItems: "flex-end" }}>
            <div className="field grow" style={{ maxWidth: 240 }}>
              <label>{c.label}</label>
              <div className="row" style={{ gap: 8 }}>
                <span className="muted" style={{ fontWeight: 600 }}>{c.prefix}-</span>
                <input
                  className="input num"
                  value={edits[c.prefix] ?? ""}
                  onChange={(e) => setEdits((s) => ({ ...s, [c.prefix]: e.target.value }))}
                />
              </div>
            </div>
            <button className="btn" onClick={() => save(c)}>Set</button>
            <span className="muted" style={{ fontSize: 12.5 }}>next: <strong>{c.prefix}-{c.nextNumber}</strong></span>
          </div>
        ))}
      </div>
    </section>
  );
}
