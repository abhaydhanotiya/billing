/** Convert integer paise to words in Indian English, e.g. "Rupees One Thousand Five Hundred and Fifty Paise Only". */

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o ? " " + ONES[o] : "");
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let out = "";
  if (h) out += ONES[h] + " Hundred";
  if (rest) out += (h ? " and " : "") + twoDigits(rest);
  return out;
}

/** Convert an integer rupee amount to words (no "Rupees"/"Only" wrapper). */
export function rupeesInWords(rupees: number): string {
  if (rupees === 0) return "Zero";
  let n = Math.trunc(Math.abs(rupees));
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;

  const parts: string[] = [];
  if (crore) parts.push(twoDigits(crore) + " Crore");
  if (lakh) parts.push(twoDigits(lakh) + " Lakh");
  if (thousand) parts.push(twoDigits(thousand) + " Thousand");
  if (hundred) parts.push(threeDigits(hundred));
  return parts.join(" ").trim();
}

/** Convert integer paise to a full amount-in-words string for invoices. */
export function amountInWords(paise: number): string {
  const sign = paise < 0 ? "Minus " : "";
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const ps = abs % 100;
  let out = `${sign}Rupees ${rupeesInWords(rupees)}`;
  if (ps > 0) out += ` and ${twoDigits(ps)} Paise`;
  return out + " Only";
}
