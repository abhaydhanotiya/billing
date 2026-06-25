import { useState } from "react";
import { Icon } from "../components/Icon.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { useApi } from "../lib/useApi.js";
import { api, ApiError } from "../lib/api.js";
import { navigate } from "../lib/router.js";
import { useToast } from "../lib/toast.js";
import { useHasRole } from "../lib/auth.js";
import { formatAmount, formatINR, formatDate } from "../lib/format.js";
import type { BusinessProfile, Invoice, InvoiceLine, PaymentMode } from "../lib/types.js";
import { PaymentModal } from "../components/PaymentModal.js";
import { PromptModal } from "../components/PromptModal.js";

export function InvoiceDetailScreen({ id }: { id: string }) {
  const toast = useToast();
  const isAdmin = useHasRole();
  const [busy, setBusy] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [showVoid, setShowVoid] = useState(false);

  const inv = useApi(() => api.get<{ invoice: Invoice }>(`/invoices/${id}`), [id]);
  const biz = useApi(() => api.get<{ profile: BusinessProfile | null }>("/business-profile"), []);

  const invoice = inv.data?.invoice;
  const profile = biz.data?.profile;

  async function finalize() {
    setBusy(true);
    try {
      await api.post(`/invoices/${id}/finalize`);
      toast.push("ok", "Invoice finalized.");
      inv.reload();
    } catch (e) {
      toast.push("error", e instanceof ApiError ? e.message : "Finalize failed.");
    } finally {
      setBusy(false);
    }
  }

  async function voidInvoice(reason: string) {
    setShowVoid(false);
    setBusy(true);
    try {
      await api.post(`/invoices/${id}/void`, { reason });
      toast.push("ok", "Invoice voided.");
      inv.reload();
    } catch (e) {
      toast.push("error", e instanceof ApiError ? e.message : "Void failed.");
    } finally {
      setBusy(false);
    }
  }

  async function recordPayment(mode: PaymentMode, amountPaise: number, reference?: string) {
    await api.post("/payments", { invoiceId: id, mode, amountPaise, reference });
    toast.push("ok", "Payment recorded.");
    setShowPay(false);
    inv.reload();
  }

  async function deleteInvoice() {
    const isVoid = inv.data?.invoice?.status === "VOID";
    const msg = isVoid
      ? `Permanently delete voided invoice ${inv.data?.invoice?.number ?? ""}?\n\nThis removes it entirely and leaves a GAP in your invoice numbering. (Voiding already cancels it — deleting is optional.)`
      : "Delete this draft? This cannot be undone.";
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      await api.del(`/invoices/${id}`);
      toast.push("ok", isVoid ? "Invoice deleted." : "Draft deleted.");
      navigate("/invoices");
    } catch (e) {
      toast.push("error", e instanceof ApiError ? e.message : "Delete failed.");
      setBusy(false);
    }
  }

  if (inv.loading) return <div className="screen muted" style={{ padding: 40 }}>Loading invoice…</div>;
  if (inv.error || !invoice)
    return <div className="screen alert alert-error" style={{ margin: 40 }}>{inv.error ?? "Not found"}</div>;

  const lines: InvoiceLine[] = invoice.lines ?? [];
  const payments = invoice.payments ?? [];
  const paid = payments.reduce((s, p) => s + p.amountPaise, 0);
  const balance = invoice.grandTotalPaise - paid;
  const isGst = invoice.mode === "GST";

  const stay = invoice.stays?.[0];
  // Dates: prefer the ones set on the invoice, fall back to the linked booking.
  const checkIn = invoice.checkInDate ?? stay?.checkIn;
  const checkOut = invoice.checkOutDate ?? stay?.checkOut ?? stay?.expectedOut;
  const paymentMode = payments[payments.length - 1]?.mode;
  const sellerName = profile?.tradeName ?? profile?.legalName ?? "Sanskar Palace";
  const jurisdiction = profile?.jurisdiction;

  const sellerBits = [
    [profile?.address, profile?.city].filter(Boolean).join(", "),
    profile?.phone,
    profile?.email,
  ].filter(Boolean);

  const shareMessage = () =>
    `${sellerName}\nInvoice ${invoice.number ?? ""} — Total ${formatINR(invoice.grandTotalPaise)}.\nThank you for staying with us.`;

  const savePdf = async () => {
    if (!window.desktop) return window.print();
    const path = await window.desktop.savePdf(`${(invoice.number ?? "invoice").replace(/\//g, "-")}.pdf`);
    if (path) toast.push("ok", "PDF saved.");
  };
  const shareWhatsApp = () => {
    const phone = (invoice.billToPhone ?? "").replace(/\D/g, "");
    const num = phone.length === 10 ? `91${phone}` : phone; // default India code
    const url = `https://wa.me/${num}?text=${encodeURIComponent(shareMessage())}`;
    if (window.desktop) window.desktop.openExternal(url);
    else window.open(url, "_blank");
  };
  const shareEmail = () => {
    const to = invoice.guest?.email ?? "";
    const url = `mailto:${to}?subject=${encodeURIComponent(`Invoice ${invoice.number ?? ""} — ${sellerName}`)}&body=${encodeURIComponent(shareMessage())}`;
    if (window.desktop) window.desktop.openExternal(url);
    else window.open(url);
  };
  const printReceipt = () => {
    // Swap to the 80mm receipt layout for this print only.
    document.body.classList.add("printing-receipt");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-receipt"), 300);
  };

  return (
    <div className="screen">
      {/* Toolbar (hidden on print) */}
      <div className="invoice-toolbar no-print">
        <button className="btn btn-ghost" onClick={() => navigate("/invoices")}>
          <Icon name="back" size={16} /> Invoices
        </button>
        <div className="row" style={{ gap: 8 }}>
          <StatusBadge status={invoice.status} />
          {invoice.status === "DRAFT" && (
            <>
              <button className="btn" disabled={busy} onClick={() => navigate(`/new-bill/edit/${id}`)}>
                Edit
              </button>
              <button className="btn btn-danger" disabled={busy} onClick={deleteInvoice}>
                Delete
              </button>
              <button className="btn btn-primary" disabled={busy} onClick={finalize}>
                <Icon name="check" size={16} /> Finalize
              </button>
            </>
          )}
          {invoice.status === "VOID" && isAdmin && (
            <button className="btn btn-danger" disabled={busy} onClick={deleteInvoice} title="Permanently delete this voided invoice">
              <Icon name="trash" size={16} /> Delete
            </button>
          )}
          {invoice.status === "FINALIZED" && (
            <>
              <button className="btn" onClick={() => setShowPay(true)}>Record Payment</button>
              <button className="btn" onClick={savePdf} title="Save as PDF"><Icon name="bill" size={16} /> PDF</button>
              <button className="btn" onClick={shareWhatsApp} title="Send on WhatsApp"><Icon name="share" size={16} /> WhatsApp</button>
              <button className="btn" onClick={shareEmail} title="Email the bill"><Icon name="share" size={16} /> Email</button>
              {isAdmin && (
                <button className="btn btn-danger" disabled={busy} onClick={() => setShowVoid(true)}>Void</button>
              )}
            </>
          )}
          <button className="btn" onClick={printReceipt} disabled={invoice.status === "DRAFT"} title="Print 80mm thermal receipt">
            <Icon name="print" size={16} /> Receipt
          </button>
          <button className="btn btn-accent" onClick={() => window.print()} disabled={invoice.status === "DRAFT"}>
            <Icon name="print" size={16} /> A4 Print
          </button>
        </div>
      </div>

      {invoice.status === "DRAFT" && (
        <div className="alert alert-warn no-print" style={{ marginBottom: 16 }}>
          This is a <strong>draft</strong> — finalize it to assign an invoice number and enable printing.
        </div>
      )}

      {/* ----- Premium printable invoice ----- */}
      <div className="pinv">
        <div className="pinv-body">
          <header className="pinv-head">
            <div className="pinv-brand">
              {profile?.logo ? (
                <img className="pinv-logo" src={profile.logo} alt="Logo" />
              ) : (
                <div className="pinv-logo-ph">{sellerName.slice(0, 2).toUpperCase()}</div>
              )}
              <div>
                <div className="pinv-name">{sellerName}</div>
                <div className="pinv-tag">Hotel &amp; Resort</div>
              </div>
            </div>
            <div className="pinv-docmeta">
              <div className="pinv-doctype">{isGst ? "Tax Invoice" : "Invoice"}</div>
              <div className="pinv-number">{invoice.number ?? "Draft"}</div>
            </div>
          </header>

          <div className="pinv-rule" />

          <div className="pinv-sellerline">
            {sellerBits.join("  ·  ")}
            {profile?.gstin && <> &nbsp;·&nbsp; GSTIN <b>{profile.gstin}</b></>}
          </div>

          <section className="pinv-parties">
            <div>
              <div className="pinv-label">Billed To</div>
              <div className="pinv-party-name">{invoice.billToName}</div>
              {invoice.billToCompany && <div className="pinv-party-line" style={{ fontWeight: 600, color: "var(--pi-ink)" }}>{invoice.billToCompany}</div>}
              {invoice.billToAddress && <div className="pinv-party-line">{invoice.billToAddress}</div>}
              {invoice.billToPhone && <div className="pinv-party-line">{invoice.billToPhone}</div>}
              {invoice.billToGstin && <div className="pinv-party-line">GSTIN {invoice.billToGstin}</div>}
            </div>
            <div className="pinv-stay">
              <div className="pinv-kv">
                <span>Invoice Date</span>
                <b>{formatDate(invoice.invoiceDate ?? invoice.finalizedAt ?? invoice.createdAt)}</b>
              </div>
              {stay?.room && (
                <div className="pinv-kv">
                  <span>Room</span>
                  <b>{stay.room.number}{stay.room.roomType ? ` · ${stay.room.roomType.name}` : ""}</b>
                </div>
              )}
              {checkIn && (
                <div className="pinv-kv">
                  <span>Check-In</span>
                  <b>{formatDate(checkIn)}</b>
                </div>
              )}
              {checkOut && (
                <div className="pinv-kv">
                  <span>Check-Out</span>
                  <b>{formatDate(checkOut)}</b>
                </div>
              )}
            </div>
          </section>

          <table className="pinv-table">
            <thead>
              <tr>
                <th className="l">Description</th>
                <th>Qty</th>
                <th>Rate</th>
                {isGst && <th>GST</th>}
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id}>
                  <td className="l">
                    <div className="pinv-desc-main">{l.description}</div>
                    {l.hsnSac && <div className="pinv-desc-sub">HSN/SAC {l.hsnSac}</div>}
                  </td>
                  <td className="money">{l.qty}</td>
                  <td className="money">{formatAmount(l.unitPricePaise)}</td>
                  {isGst && (
                    <td>{l.gstRatePct > 0 ? <span className="pinv-pill">{l.gstRatePct}%</span> : "—"}</td>
                  )}
                  <td className="money">{formatAmount(l.grossPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <section className="pinv-summary">
            <div>
              <div className="pinv-label">Amount in Words</div>
              <div className="pinv-words-text">{invoice.amountInWords}</div>
            </div>
            <div className="pinv-totals">
              <div className="pinv-trow"><span>Subtotal</span><b className="money">{formatAmount(invoice.grossPaise)}</b></div>
              {invoice.totalDiscountPaise > 0 && (
                <div className="pinv-trow"><span>Discount</span><b className="money">– {formatAmount(invoice.totalDiscountPaise)}</b></div>
              )}
              {(isGst || invoice.totalDiscountPaise > 0) && (
                <div className="pinv-trow"><span>Taxable Value</span><b className="money">{formatAmount(invoice.taxableValuePaise)}</b></div>
              )}
              {isGst && (
                <>
                  <div className="pinv-trow"><span>CGST</span><b className="money">{formatAmount(invoice.totalCgstPaise)}</b></div>
                  <div className="pinv-trow"><span>SGST</span><b className="money">{formatAmount(invoice.totalSgstPaise)}</b></div>
                </>
              )}
              {invoice.roundOffPaise !== 0 && (
                <div className="pinv-trow">
                  <span>Round Off</span>
                  <b className="money">{invoice.roundOffPaise > 0 ? "+" : "–"} {formatAmount(Math.abs(invoice.roundOffPaise))}</b>
                </div>
              )}
              <div className="pinv-grand">
                <span className="pinv-grand-label">Grand Total</span>
                <span className="pinv-grand-amt money">{formatINR(invoice.grandTotalPaise)}</span>
              </div>
              {paid > 0 && (
                <>
                  <div className="pinv-trow pinv-strong" style={{ marginTop: 8 }}><span>Received</span><b className="money">{formatAmount(paid)}</b></div>
                  {balance > 0 && <div className="pinv-trow"><span>Balance Due</span><b className="money">{formatAmount(balance)}</b></div>}
                </>
              )}
            </div>
          </section>

          <section className="pinv-foot">
            <div>
              <div className="pinv-paychips">
                <span className="pinv-chip">Payment&nbsp; <b>{paymentMode ?? "Pending"}</b></span>
                <span className="pinv-chip">Mode&nbsp; <b>{invoice.mode === "GST" ? "GST" : "Non-GST"}</b></span>
              </div>
              {profile?.invoiceNote && (
                <>
                  <div className="pinv-terms-label">Terms &amp; Instructions</div>
                  <div className="pinv-terms">{profile.invoiceNote}</div>
                </>
              )}
            </div>
            <div className="pinv-sign">
              <div className="pinv-sign-space" />
              <div className="pinv-sign-line">For {sellerName}</div>
              <div className="pinv-sign-sub">Authorised Signatory</div>
            </div>
          </section>

          <div className="pinv-bottom">
            <span className="pinv-juris">
              {jurisdiction ? `Subject to ${jurisdiction} jurisdiction` : ""}
            </span>
            <span>This is a computer-generated invoice</span>
          </div>
        </div>
      </div>

      {/* Compact 80mm thermal receipt — hidden on screen, shown only when printing a receipt */}
      <div className="receipt-doc">
        <div className="rcpt-head">
          <div className="rcpt-name">{sellerName}</div>
          <div className="rcpt-sub">Hotel &amp; Resort</div>
          {profile?.address && <div className="rcpt-line">{profile.address}{profile.city ? `, ${profile.city}` : ""}</div>}
          {profile?.phone && <div className="rcpt-line">Ph: {profile.phone}</div>}
          {profile?.gstin && <div className="rcpt-line">GSTIN: {profile.gstin}</div>}
        </div>
        <div className="rcpt-rule" />
        <div className="rcpt-row"><span>{isGst ? "Tax Invoice" : "Invoice"}</span><span>{invoice.number ?? "—"}</span></div>
        <div className="rcpt-row"><span>Date</span><span>{formatDate(invoice.invoiceDate ?? invoice.finalizedAt ?? invoice.createdAt)}</span></div>
        <div className="rcpt-row"><span>To</span><span>{invoice.billToName}</span></div>
        <div className="rcpt-rule dashed" />
        {lines.map((l) => (
          <div className="rcpt-item" key={l.id}>
            <div className="rcpt-item-name">{l.description}</div>
            <div className="rcpt-item-line">
              <span>{l.qty} × {formatAmount(l.unitPricePaise)}</span>
              <span>{formatAmount(l.grossPaise)}</span>
            </div>
          </div>
        ))}
        <div className="rcpt-rule dashed" />
        <div className="rcpt-row"><span>Subtotal</span><span>{formatAmount(invoice.grossPaise)}</span></div>
        {invoice.totalDiscountPaise > 0 && (
          <div className="rcpt-row"><span>Discount</span><span>– {formatAmount(invoice.totalDiscountPaise)}</span></div>
        )}
        {isGst && <div className="rcpt-row"><span>GST (CGST+SGST)</span><span>{formatAmount(invoice.totalTaxPaise)}</span></div>}
        {invoice.roundOffPaise !== 0 && (
          <div className="rcpt-row"><span>Round off</span><span>{invoice.roundOffPaise > 0 ? "+" : "–"} {formatAmount(Math.abs(invoice.roundOffPaise))}</span></div>
        )}
        <div className="rcpt-grand"><span>TOTAL</span><span>{formatINR(invoice.grandTotalPaise)}</span></div>
        {paid > 0 && <div className="rcpt-row"><span>Paid ({paymentMode ?? "—"})</span><span>{formatAmount(paid)}</span></div>}
        <div className="rcpt-rule dashed" />
        <div className="rcpt-foot">Thank you for visiting!</div>
        {jurisdiction && <div className="rcpt-foot rcpt-small">Subject to {jurisdiction} jurisdiction</div>}
        <div className="rcpt-foot rcpt-small">Computer-generated receipt</div>
      </div>

      {showPay && (
        <PaymentModal
          balancePaise={balance > 0 ? balance : invoice.grandTotalPaise}
          onClose={() => setShowPay(false)}
          onSubmit={recordPayment}
        />
      )}

      {showVoid && (
        <PromptModal
          title="Void this invoice?"
          label="Reason (kept for the audit trail)"
          placeholder="e.g. wrong guest, cancelled booking…"
          confirmText="Void invoice"
          danger
          onCancel={() => setShowVoid(false)}
          onSubmit={voidInvoice}
        />
      )}
    </div>
  );
}
