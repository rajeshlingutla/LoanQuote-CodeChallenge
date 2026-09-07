import { DEFAULT_QUOTE_FAILURE_RATE, shouldSimulateNetworkIssue } from "./network.js";

describe("shouldSimulateNetworkIssue", () => {
  it("fails when the random draw is below the configured rate", () => {
    expect(shouldSimulateNetworkIssue(0.3, () => 0.29)).toBe(true);
  });

  it("succeeds when the random draw is at or above the configured rate", () => {
    expect(shouldSimulateNetworkIssue(0.3, () => 0.3)).toBe(false);
  });

  it("defaults to a 30 percent failure rate", () => {
    expect(DEFAULT_QUOTE_FAILURE_RATE).toBe(0.3);
  });
});
