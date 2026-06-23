/**
 * Indian fiscal year runs 1 April → 31 March.
 * A date in Apr 2026..Mar 2027 belongs to FY series "2026-27".
 */
export function fiscalYearSeries(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Jan
  const startYear = month >= 3 ? year : year - 1; // April is month index 3
  const endYear = (startYear + 1) % 100;
  return `${startYear}-${String(endYear).padStart(2, "0")}`;
}

/** "SR-1" — prefix and a continuous running sequence (no zero padding). */
export function formatInvoiceNumber(prefix: string, seq: number): string {
  return `${prefix}-${seq}`;
}
