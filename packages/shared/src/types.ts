/** Shared domain types used by both the server and the desktop client. */

export type BillMode = "GST" | "NON_GST";

export type ItemCategory = "ROOM" | "FOOD" | "OTHER";

export type PaymentMode = "CASH" | "UPI" | "CARD" | "BANK" | "OTHER";

export type UserRole = "ADMIN" | "RECEPTION" | "RESTAURANT";

export type RoomStatus = "VACANT" | "OCCUPIED" | "RESERVED" | "CLEANING" | "MAINTENANCE";

/** A single line as entered by the user, before tax computation. */
export interface LineItemInput {
  category: ItemCategory;
  description: string;
  hsnSac?: string;
  /** Quantity (nights for room, count for food). May be fractional. */
  qty: number;
  /** Unit price in integer paise. */
  unitPricePaise: number;
  /** Optional flat per-line discount in paise. Takes precedence over discountPercent. */
  discountPaise?: number;
  /** Optional per-line discount percent (0-100). */
  discountPercent?: number;
  /** GST rate percent for this line (e.g. 5, 12, 18). Ignored for NON_GST bills. */
  gstRatePct: number;
}

/** A computed line, with tax broken out. All money in integer paise. */
export interface ComputedLine {
  category: ItemCategory;
  description: string;
  hsnSac?: string;
  qty: number;
  unitPricePaise: number;
  /** qty * unitPrice, rounded to paise. */
  grossPaise: number;
  /** Effective discount applied to this line (line discount + share of bill discount). */
  discountPaise: number;
  /** Value on which tax is charged = gross - discount. */
  taxableValuePaise: number;
  gstRatePct: number;
  cgstPaise: number;
  sgstPaise: number;
  /** taxable + cgst + sgst. */
  lineTotalPaise: number;
}

export interface BillDiscountInput {
  discountPaise?: number;
  discountPercent?: number;
}

export interface ComputeBillInput {
  mode: BillMode;
  lines: LineItemInput[];
  /** Optional whole-bill discount, distributed across lines proportionally to taxable value. */
  billDiscount?: BillDiscountInput;
  /** If true, round the grand total to the nearest rupee and emit a round-off line. */
  roundToRupee?: boolean;
}

/** Tax summary grouped by GST rate — needed for the invoice footer and GST reports. */
export interface TaxBreakupRow {
  gstRatePct: number;
  taxableValuePaise: number;
  cgstPaise: number;
  sgstPaise: number;
}

export interface ComputedBill {
  mode: BillMode;
  lines: ComputedLine[];
  /** Sum of gross before any discount. */
  grossPaise: number;
  /** Total discount (line + bill level). */
  totalDiscountPaise: number;
  /** Sum of taxable values. */
  taxableValuePaise: number;
  totalCgstPaise: number;
  totalSgstPaise: number;
  totalTaxPaise: number;
  /** taxable + tax, before round-off. */
  subTotalPaise: number;
  /** Round-off adjustment (can be negative). */
  roundOffPaise: number;
  /** Final payable amount. */
  grandTotalPaise: number;
  /** Per-rate breakup for the invoice and GST report. */
  taxBreakup: TaxBreakupRow[];
  amountInWords: string;
}
