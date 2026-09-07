import { calculateTotalCommission } from "./commission.js";

describe("calculateTotalCommission", () => {
  it("multiplies loan amount by the annual rate and term in years", () => {
    expect(calculateTotalCommission(25000, 0.025, 24)).toBe(1250);
  });
});
