import { calculateTotalCommission } from "./commission.js";

describe("calculateTotalCommission", () => {
  it("applies the per-annum rate to the loan amount for the term in years", () => {
    expect(calculateTotalCommission(25000, 0.015, 36)).toBe(1125);
  });

  it("uses a one-year term when the loan is 12 months", () => {
    expect(calculateTotalCommission(25000, 0.015, 12)).toBe(375);
  });

  it("uses a half-year term for 6 months", () => {
    expect(calculateTotalCommission(10000, 0.04, 6)).toBe(200);
  });

  it("rounds to two decimal places", () => {
    expect(calculateTotalCommission(10000, 0.015, 1)).toBe(12.5);
  });
});
