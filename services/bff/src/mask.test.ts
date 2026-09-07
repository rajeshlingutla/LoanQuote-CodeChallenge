import { maskBody, maskHeaders, maskSecret } from "./mask.js";

describe("maskSecret", () => {
  it("hides short secrets completely", () => {
    expect(maskSecret("ab")).toBe("****");
  });

  it("keeps only the last four characters of a longer secret", () => {
    expect(maskSecret("local-dev-key")).toBe("****-key");
  });

  it("marks a missing secret", () => {
    expect(maskSecret(undefined)).toBe("[missing]");
  });
});

describe("maskHeaders", () => {
  it("masks api keys and leaves other headers alone", () => {
    expect(
      maskHeaders({
        "x-api-key": "test-bff-key",
        "content-type": "application/json",
      }),
    ).toEqual({
      "x-api-key": "****-key",
      "content-type": "application/json",
    });
  });
});

describe("maskBody", () => {
  it("redacts loan amount and total commission", () => {
    expect(
      maskBody({
        query: "mutation",
        variables: {
          input: {
            loanAmount: 25000,
            loanTermInMonths: 36,
            riskBand: "A",
            totalCommission: 1125,
          },
        },
      }),
    ).toEqual({
      query: "mutation",
      variables: {
        input: {
          loanAmount: "[REDACTED]",
          loanTermInMonths: 36,
          riskBand: "A",
          totalCommission: "[REDACTED]",
        },
      },
    });
  });
});
