import { describe, it, expect } from "vitest";
import { fiscalYearSeries, formatInvoiceNumber } from "./fiscalYear.js";

describe("fiscalYearSeries", () => {
  it("maps April..December to the FY starting that year", () => {
    expect(fiscalYearSeries(new Date("2026-04-01T00:00:00"))).toBe("2026-27");
    expect(fiscalYearSeries(new Date("2026-12-31T23:59:59"))).toBe("2026-27");
  });

  it("maps January..March to the FY that started the previous year", () => {
    expect(fiscalYearSeries(new Date("2027-01-15T00:00:00"))).toBe("2026-27");
    expect(fiscalYearSeries(new Date("2027-03-31T23:59:59"))).toBe("2026-27");
  });

  it("rolls over on 1 April", () => {
    expect(fiscalYearSeries(new Date("2027-03-31T00:00:00"))).toBe("2026-27");
    expect(fiscalYearSeries(new Date("2027-04-01T00:00:00"))).toBe("2027-28");
  });
});

describe("formatInvoiceNumber", () => {
  it("formats as PREFIX-seq with no zero padding", () => {
    expect(formatInvoiceNumber("SR", 1)).toBe("SR-1");
    expect(formatInvoiceNumber("SR", 25)).toBe("SR-25");
    expect(formatInvoiceNumber("SR", 1234)).toBe("SR-1234");
  });
});
