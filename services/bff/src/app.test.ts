import request from "supertest";
import { createApp } from "./app.js";
import { RETRY_LATER_MESSAGE } from "./errors.js";

const API_KEY = "test-bff-key";
const silentLog = () => {};

const CREATE_QUOTE = `
  mutation CreateQuote($input: QuoteInput!) {
    createQuote(input: $input) {
      quoteId
      commissionRate
      totalCommission
    }
  }
`;

function quoteBody(input: {
  loanAmount: number;
  loanTermInMonths: number;
  riskBand: string;
}) {
  return { query: CREATE_QUOTE, variables: { input } };
}

describe("BFF", () => {
  const app = createApp({
    apiKey: API_KEY,
    mockBaseUrl: "http://mock.test",
    log: silentLog,
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("rejects requests without an API key", async () => {
    const response = await request(app)
      .post("/graphql")
      .send(quoteBody({ loanAmount: 25000, loanTermInMonths: 36, riskBand: "A" }));

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Unauthorised" });
  });

  it("rejects requests with a mismatched API key", async () => {
    const response = await request(app)
      .post("/graphql")
      .set("x-api-key", "wrong")
      .send(quoteBody({ loanAmount: 25000, loanTermInMonths: 36, riskBand: "A" }));

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Unauthorised" });
  });

  it("validates quote payload before calling the mock", async () => {
    const fetchSpy = jest.spyOn(global, "fetch");

    const response = await request(app)
      .post("/graphql")
      .set("x-api-key", API_KEY)
      .send(quoteBody({ loanAmount: -1, loanTermInMonths: 36, riskBand: "A" }));

    expect(response.status).toBe(200);
    expect(response.body.errors[0].message).toMatch(/loanAmount/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("forwards a valid quote and annualises commission from the mock rate", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          quoteId: "mock-quote",
          commissionRate: 0.015,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const response = await request(app)
      .post("/graphql")
      .set("x-api-key", API_KEY)
      .send(quoteBody({ loanAmount: 25000, loanTermInMonths: 36, riskBand: "A" }));

    expect(response.status).toBe(200);
    expect(response.body.data.createQuote).toEqual({
      quoteId: "mock-quote",
      commissionRate: 0.015,
      totalCommission: 1125,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "http://mock.test/quotes",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          loanAmount: 25000,
          loanTermInMonths: 36,
          riskBand: "A",
        }),
      }),
    );
  });

  it("returns a retry message when the mock is unreachable", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("ECONNRESET"));

    const response = await request(app)
      .post("/graphql")
      .set("x-api-key", API_KEY)
      .send(quoteBody({ loanAmount: 25000, loanTermInMonths: 36, riskBand: "A" }));

    expect(response.status).toBe(200);
    expect(response.body.errors[0].message).toBe(RETRY_LATER_MESSAGE);
  });

  it("returns a retry message when the mock simulates a network failure", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "network_error" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await request(app)
      .post("/graphql")
      .set("x-api-key", API_KEY)
      .send(quoteBody({ loanAmount: 25000, loanTermInMonths: 36, riskBand: "A" }));

    expect(response.status).toBe(200);
    expect(response.body.errors[0].message).toBe(RETRY_LATER_MESSAGE);
  });

  it("logs quote traffic without the api key or loan amount", async () => {
    const entries: Record<string, unknown>[] = [];
    const appWithLogs = createApp({
      apiKey: API_KEY,
      mockBaseUrl: "http://mock.test",
      log: (entry) => {
        entries.push(entry);
      },
    });

    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          quoteId: "mock-quote",
          commissionRate: 0.015,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    await request(appWithLogs)
      .post("/graphql")
      .set("x-api-key", API_KEY)
      .send(quoteBody({ loanAmount: 25000, loanTermInMonths: 36, riskBand: "A" }));

    const dumped = JSON.stringify(entries);
    expect(dumped).not.toContain(API_KEY);
    expect(dumped).not.toContain("25000");
    expect(dumped).toContain("****-key");
    expect(dumped).toContain("[REDACTED]");
    expect(dumped).toContain("bff.quote.ok");
  });
});
