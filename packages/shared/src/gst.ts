/**
 * GST calculation engine for Sanskar Palace bills.
 *
 * Design rules:
 *  - All money is integer paise. No floats stored.
 *  - GST rate is per line item (never hard-coded); for intra-state supply the rate splits
 *    evenly into CGST + SGST (e.g. 18% -> 9% CGST + 9% SGST).
 *  - Bill-level discount is distributed across lines proportionally to taxable value so that
 *    per-line tax stays correct, with the rounding remainder absorbed by the last line.
 *  - NON_GST bills carry no tax: cgst/sgst are zero and rate is treated as 0.
 */

import { roundPaise } from "./money.js";
import { amountInWords } from "./words.js";
import type {
  ComputeBillInput,
  ComputedBill,
  ComputedLine,
  LineItemInput,
  TaxBreakupRow,
} from "./types.js";

function lineGross(line: LineItemInput): number {
  return roundPaise(line.qty * line.unitPricePaise);
}

function lineDiscount(line: LineItemInput, gross: number): number {
  if (line.discountPaise != null) return Math.min(Math.max(line.discountPaise, 0), gross);
  if (line.discountPercent != null) {
    const pct = Math.min(Math.max(line.discountPercent, 0), 100);
    return Math.min(roundPaise((gross * pct) / 100), gross);
  }
  return 0;
}

function billDiscountAmount(base: number, input?: ComputeBillInput["billDiscount"]): number {
  if (!input) return 0;
  if (input.discountPaise != null) return Math.min(Math.max(input.discountPaise, 0), base);
  if (input.discountPercent != null) {
    const pct = Math.min(Math.max(input.discountPercent, 0), 100);
    return Math.min(roundPaise((base * pct) / 100), base);
  }
  return 0;
}

/**
 * Compute a full bill from raw line inputs. Pure function — no side effects.
 */
export function computeBill(input: ComputeBillInput): ComputedBill {
  const isGst = input.mode === "GST";

  // Step 1: per-line gross and line-level discount -> pre-bill-discount taxable.
  const grossArr = input.lines.map(lineGross);
  const lineDiscArr = input.lines.map((l, i) => lineDiscount(l, grossArr[i]));
  const preTaxableArr = grossArr.map((g, i) => g - lineDiscArr[i]);

  // Step 2: distribute the bill-level discount across lines proportionally to pre-taxable.
  const preTaxableBase = preTaxableArr.reduce((a, b) => a + b, 0);
  const billDisc = billDiscountAmount(preTaxableBase, input.billDiscount);
  const billDiscShare = new Array(input.lines.length).fill(0);
  if (billDisc > 0 && preTaxableBase > 0) {
    let allocated = 0;
    for (let i = 0; i < input.lines.length; i++) {
      if (i === input.lines.length - 1) {
        billDiscShare[i] = billDisc - allocated; // last line absorbs the remainder
      } else {
        const share = roundPaise((billDisc * preTaxableArr[i]) / preTaxableBase);
        billDiscShare[i] = share;
        allocated += share;
      }
    }
  }

  // Step 3: build computed lines with tax.
  const lines: ComputedLine[] = input.lines.map((l, i) => {
    const gross = grossArr[i];
    const discount = lineDiscArr[i] + billDiscShare[i];
    const taxable = gross - discount;
    const rate = isGst ? l.gstRatePct : 0;
    // CGST and SGST each carry half the rate. They are equal for intra-state supply.
    const halfRate = rate / 2;
    const cgst = isGst ? roundPaise((taxable * halfRate) / 100) : 0;
    const sgst = cgst;
    return {
      category: l.category,
      description: l.description,
      hsnSac: l.hsnSac,
      qty: l.qty,
      unitPricePaise: l.unitPricePaise,
      grossPaise: gross,
      discountPaise: discount,
      taxableValuePaise: taxable,
      gstRatePct: rate,
      cgstPaise: cgst,
      sgstPaise: sgst,
      lineTotalPaise: taxable + cgst + sgst,
    };
  });

  // Step 4: totals.
  const grossTotal = grossArr.reduce((a, b) => a + b, 0);
  const totalDiscount = lineDiscArr.reduce((a, b) => a + b, 0) + billDisc;
  const taxableValue = lines.reduce((a, l) => a + l.taxableValuePaise, 0);
  const totalCgst = lines.reduce((a, l) => a + l.cgstPaise, 0);
  const totalSgst = lines.reduce((a, l) => a + l.sgstPaise, 0);
  const totalTax = totalCgst + totalSgst;
  const subTotal = taxableValue + totalTax;

  // Step 5: round-off to nearest rupee if requested.
  let roundOff = 0;
  let grandTotal = subTotal;
  if (input.roundToRupee) {
    grandTotal = Math.round(subTotal / 100) * 100;
    roundOff = grandTotal - subTotal;
  }

  // Step 6: tax breakup grouped by rate (for invoice + GST report).
  const breakupMap = new Map<number, TaxBreakupRow>();
  for (const l of lines) {
    const key = l.gstRatePct;
    const row = breakupMap.get(key) ?? {
      gstRatePct: key,
      taxableValuePaise: 0,
      cgstPaise: 0,
      sgstPaise: 0,
    };
    row.taxableValuePaise += l.taxableValuePaise;
    row.cgstPaise += l.cgstPaise;
    row.sgstPaise += l.sgstPaise;
    breakupMap.set(key, row);
  }
  const taxBreakup = [...breakupMap.values()].sort((a, b) => a.gstRatePct - b.gstRatePct);

  return {
    mode: input.mode,
    lines,
    grossPaise: grossTotal,
    totalDiscountPaise: totalDiscount,
    taxableValuePaise: taxableValue,
    totalCgstPaise: totalCgst,
    totalSgstPaise: totalSgst,
    totalTaxPaise: totalTax,
    subTotalPaise: subTotal,
    roundOffPaise: roundOff,
    grandTotalPaise: grandTotal,
    taxBreakup,
    amountInWords: amountInWords(grandTotal),
  };
}
