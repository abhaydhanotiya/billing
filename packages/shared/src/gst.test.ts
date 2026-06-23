import { describe, it, expect } from "vitest";
import { computeBill } from "./gst.js";
import { amountInWords } from "./words.js";
import { formatPaiseIndian, rupeesToPaise } from "./money.js";
import type { LineItemInput } from "./types.js";

const room = (priceRupees: number, nights: number, rate: number): LineItemInput => ({
  category: "ROOM",
  description: "Deluxe Room",
  hsnSac: "9963",
  qty: nights,
  unitPricePaise: rupeesToPaise(priceRupees),
  gstRatePct: rate,
});

const food = (priceRupees: number, qty: number, rate: number): LineItemInput => ({
  category: "FOOD",
  description: "Thali",
  hsnSac: "9963",
  qty,
  unitPricePaise: rupeesToPaise(priceRupees),
  gstRatePct: rate,
});

describe("GST bill computation", () => {
  it("computes a simple single-line GST bill with 12% split into 6+6", () => {
    const bill = computeBill({ mode: "GST", lines: [room(2000, 2, 12)] });
    expect(bill.taxableValuePaise).toBe(rupeesToPaise(4000)); // 2000 x 2
    expect(bill.totalCgstPaise).toBe(rupeesToPaise(240)); // 6% of 4000
    expect(bill.totalSgstPaise).toBe(rupeesToPaise(240));
    expect(bill.totalTaxPaise).toBe(rupeesToPaise(480));
    expect(bill.grandTotalPaise).toBe(rupeesToPaise(4480));
  });

  it("CGST and SGST are always equal and sum to total tax", () => {
    const bill = computeBill({ mode: "GST", lines: [food(235, 3, 5), room(1799, 1, 12)] });
    expect(bill.totalCgstPaise).toBe(bill.totalSgstPaise);
    expect(bill.totalCgstPaise + bill.totalSgstPaise).toBe(bill.totalTaxPaise);
  });

  it("groups the tax breakup by rate", () => {
    const bill = computeBill({
      mode: "GST",
      lines: [room(1000, 1, 12), food(100, 2, 5), food(50, 1, 5)],
    });
    expect(bill.taxBreakup).toHaveLength(2);
    const five = bill.taxBreakup.find((r) => r.gstRatePct === 5)!;
    const twelve = bill.taxBreakup.find((r) => r.gstRatePct === 12)!;
    expect(five.taxableValuePaise).toBe(rupeesToPaise(250)); // 100x2 + 50
    expect(twelve.taxableValuePaise).toBe(rupeesToPaise(1000));
  });

  it("applies a per-line percent discount before tax", () => {
    const bill = computeBill({
      mode: "GST",
      lines: [{ ...room(2000, 1, 12), discountPercent: 10 }],
    });
    expect(bill.totalDiscountPaise).toBe(rupeesToPaise(200));
    expect(bill.taxableValuePaise).toBe(rupeesToPaise(1800));
    expect(bill.totalTaxPaise).toBe(rupeesToPaise(216)); // 12% of 1800
  });

  it("distributes a bill-level discount across lines and conserves the total", () => {
    const bill = computeBill({
      mode: "GST",
      lines: [room(1000, 1, 12), food(500, 1, 5)],
      billDiscount: { discountPaise: rupeesToPaise(150) },
    });
    // discount fully applied
    expect(bill.totalDiscountPaise).toBe(rupeesToPaise(150));
    // taxable = 1500 - 150 = 1350 across both lines, no paise lost
    const sumLineTaxable = bill.lines.reduce((a, l) => a + l.taxableValuePaise, 0);
    expect(sumLineTaxable).toBe(bill.taxableValuePaise);
    expect(bill.taxableValuePaise).toBe(rupeesToPaise(1350));
  });

  it("rounds the grand total to the nearest rupee and records the round-off", () => {
    // 235 x 1 @ 5%: CGST/SGST each = 2.5% of 235 = 5.875 -> 5.88 each (per-component
    // rounding) -> tax 11.76 -> subtotal 246.76 -> rounds to 247.00, round-off +0.24.
    const bill = computeBill({ mode: "GST", lines: [food(235, 1, 5)], roundToRupee: true });
    expect(bill.totalCgstPaise).toBe(588);
    expect(bill.subTotalPaise).toBe(24676);
    expect(bill.grandTotalPaise).toBe(rupeesToPaise(247));
    expect(bill.roundOffPaise).toBe(24);
  });

  it("produces a NON_GST bill with zero tax", () => {
    const bill = computeBill({ mode: "NON_GST", lines: [room(2000, 2, 12)] });
    expect(bill.totalTaxPaise).toBe(0);
    expect(bill.totalCgstPaise).toBe(0);
    expect(bill.grandTotalPaise).toBe(rupeesToPaise(4000));
  });

  it("handles fractional quantity (half-day / partial) without losing paise", () => {
    const bill = computeBill({ mode: "GST", lines: [food(99.5, 3, 5)] });
    expect(bill.taxableValuePaise).toBe(rupeesToPaise(298.5)); // 99.50 x 3
  });
});

describe("amount in words", () => {
  it("formats rupees and paise", () => {
    expect(amountInWords(rupeesToPaise(4480))).toBe("Rupees Four Thousand Four Hundred and Eighty Only");
    expect(amountInWords(rupeesToPaise(247.5))).toBe("Rupees Two Hundred and Forty Seven and Fifty Paise Only");
    expect(amountInWords(rupeesToPaise(100000))).toBe("Rupees One Lakh Only");
    expect(amountInWords(0)).toBe("Rupees Zero Only");
  });
});

describe("Indian number formatting", () => {
  it("groups with lakh/crore separators", () => {
    expect(formatPaiseIndian(rupeesToPaise(123456.78))).toBe("1,23,456.78");
    expect(formatPaiseIndian(rupeesToPaise(1500))).toBe("1,500.00");
  });
});
