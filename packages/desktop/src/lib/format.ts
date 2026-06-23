/** Formatting helpers. All monetary values arrive from the API as integer paise. */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrPlain = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/** "₹1,23,456.00" (Indian grouping). */
export function formatINR(paise: number): string {
  return inr.format(paiseToRupees(paise));
}

/** "1,23,456.00" — no symbol, for right-aligned amount columns. */
export function formatAmount(paise: number): string {
  return inrPlain.format(paiseToRupees(paise));
}

/** Parse a rupee string (e.g. "1234.50") into integer paise. */
export function rupeesToPaise(value: string | number): number {
  const n = typeof value === "string" ? Number(value.replace(/,/g, "")) : value;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return dateFmt.format(new Date(d));
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return dateTimeFmt.format(new Date(d));
}
