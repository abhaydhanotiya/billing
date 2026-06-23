/**
 * Money utilities. All monetary values in the system are stored and computed as
 * INTEGER PAISE (1 rupee = 100 paise) to avoid floating-point rounding errors.
 * Display/formatting converts to rupees only at the edges.
 */

/** Round a (possibly fractional) paise value to the nearest whole paise. */
export function roundPaise(value: number): number {
  // Use a half-up rounding that is stable for .5 cases.
  return Math.round(value + Number.EPSILON);
}

/** Convert a rupee amount (e.g. 1500.50) to integer paise (150050). */
export function rupeesToPaise(rupees: number): number {
  return roundPaise(rupees * 100);
}

/** Convert integer paise to a rupee number (1505 -> 15.05). */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/** Format integer paise as a rupee string with 2 decimals, e.g. "15.05" (no symbol). */
export function formatPaise(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${sign}${rupees}.${rem.toString().padStart(2, "0")}`;
}

/** Format integer paise as an Indian-grouped rupee string, e.g. "1,23,456.78". */
export function formatPaiseIndian(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const rem = (abs % 100).toString().padStart(2, "0");
  return `${sign}${groupIndian(rupees)}.${rem}`;
}

/** Group an integer with the Indian numbering system (lakh/crore). */
export function groupIndian(n: number): string {
  const s = Math.trunc(n).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
}
