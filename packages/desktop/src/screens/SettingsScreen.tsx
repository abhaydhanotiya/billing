import { useEffect, useState } from "react";
import { PageHeader } from "../components/Layout.js";
import { Icon } from "../components/Icon.js";
import { useApi } from "../lib/useApi.js";
import { api, ApiError, getServerUrl, setServerUrl } from "../lib/api.js";
import { useToast } from "../lib/toast.js";
import { useHasRole } from "../lib/auth.js";
import type { BusinessProfile } from "../lib/types.js";

const EMPTY: BusinessProfile = {
  id: 1,
  legalName: "",
  tradeName: "",
  gstin: "",
  address: "",
  city: "",
  stateName: "",
  stateCode: "",
  pincode: "",
  phone: "",
  email: "",
  invoiceNote: "",
  jurisdiction: "",
};

export function SettingsScreen() {
  const toast = useToast();
  const isAdmin = useHasRole();
  const [server, setServer] = useState(getServerUrl());
  const biz = useApi(() => api.get<{ profile: BusinessProfile | null }>("/business-profile"), []);
  const [form, setForm] = useState<BusinessProfile>(EMPTY);

  useEffect(() => {
    if (biz.data?.profile) setForm({ ...EMPTY, ...biz.data.profile });
  }, [biz.data]);

  function field<K extends keyof BusinessProfile>(key: K, label: string, opts?: { wide?: boolean }) {
    return (
      <div className="field" style={opts?.wide ? { gridColumn: "1 / -1" } : undefined}>
        <label>{label}</label>
        <input
          className="input"
          value={(form[key] as string) ?? ""}
          disabled={!isAdmin}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
      </div>
    );
  }

  async function saveProfile() {
    try {
      await api.put("/business-profile", {
        legalName: form.legalName,
        tradeName: form.tradeName || undefined,
        gstin: form.gstin || undefined,
        address: form.address,
        city: form.city,
        stateName: form.stateName,
        stateCode: form.stateCode,
        pincode: form.pincode || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        invoiceNote: form.invoiceNote || undefined,
        jurisdiction: form.jurisdiction || undefined,
        logo: form.logo || undefined,
      });
      toast.push("ok", "Business profile saved.");
      biz.reload();
    } catch (e) {
      toast.push("error", e instanceof ApiError ? e.message : "Could not save.");
    }
  }

  function onLogoFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.push("error", "Please choose an image file (PNG/JPG/SVG).");
      return;
    }
    if (file.size > 2_000_000) {
      toast.push("error", "Logo is too large — please use an image under 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      setForm((f) => ({ ...f, logo: dataUrl })); // optimistic preview
      try {
        // Server stores it in Supabase Storage (or inline if not configured) and
        // returns the URL it saved on the profile.
        const res = await api.post<{ url: string; storage: string }>("/business-profile/logo", {
          dataUrl,
        });
        setForm((f) => ({ ...f, logo: res.url }));
        toast.push(
          "ok",
          res.storage === "supabase" ? "Logo uploaded to Supabase Storage." : "Logo saved.",
        );
        biz.reload();
      } catch (e) {
        toast.push("error", e instanceof ApiError ? e.message : "Logo upload failed.");
      }
    };
    reader.readAsDataURL(file);
  }

  function saveServer() {
    setServerUrl(server);
    toast.push("ok", "Server address saved. It will be used for new requests.");
  }

  return (
    <div className="screen">
      <PageHeader title="Settings" subtitle="Server connection & business profile" />

      <section className="card card-pad" style={{ marginBottom: 18 }}>
        <h3 style={{ marginBottom: 14 }}>Server Connection</h3>
        <div className="row" style={{ gap: 12, alignItems: "flex-end" }}>
          <div className="field grow">
            <label>API server address</label>
            <input className="input" value={server} onChange={(e) => setServer(e.target.value)} placeholder="http://192.168.1.10:4000" />
          </div>
          <button className="btn" onClick={saveServer}>Save</button>
        </div>
        <p className="muted" style={{ marginTop: 10, fontSize: 12.5 }}>
          On each client PC, set this to the server PC's LAN address.
        </p>
      </section>

      <section className="card card-pad">
        <h3 style={{ marginBottom: 14 }}>Business Profile</h3>
        {!isAdmin && (
          <div className="alert alert-warn" style={{ marginBottom: 14 }}>
            Only an administrator can edit the business profile.
          </div>
        )}

        <div className="logo-field">
          <div className="logo-preview">
            {form.logo ? (
              <img src={form.logo} alt="Business logo" />
            ) : (
              <span className="logo-placeholder">No logo</span>
            )}
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <label className="field-label">Invoice Logo</label>
            <div className="row" style={{ gap: 8 }}>
              <label className={`btn btn-sm ${!isAdmin ? "is-disabled" : ""}`}>
                <Icon name="upload" size={15} /> Upload image
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  hidden
                  disabled={!isAdmin}
                  onChange={(e) => onLogoFile(e.target.files?.[0])}
                />
              </label>
              {form.logo && isAdmin && (
                <button className="btn btn-sm btn-danger" onClick={() => setForm((f) => ({ ...f, logo: "" }))}>
                  Remove
                </button>
              )}
            </div>
            <span className="muted" style={{ fontSize: 12 }}>PNG/JPG/SVG, under 600 KB. Appears on every printed invoice.</span>
          </div>
        </div>

        <div className="grid-2" style={{ gap: 12 }}>
          {field("legalName", "Legal Name")}
          {field("tradeName", "Trade Name")}
          {field("gstin", "GSTIN")}
          {field("phone", "Phone")}
          {field("address", "Address", { wide: true })}
          {field("city", "City")}
          {field("stateName", "State")}
          {field("stateCode", "State Code")}
          {field("pincode", "PIN Code")}
          {field("email", "Email")}
          {field("jurisdiction", "Jurisdiction (footer)")}
          {field("invoiceNote", "Terms & Instructions", { wide: true })}
        </div>
        {isAdmin && (
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
            <button className="btn btn-primary" onClick={saveProfile}>Save Profile</button>
          </div>
        )}
      </section>
    </div>
  );
}
