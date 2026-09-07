import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { RETRY_LATER_MESSAGE } from "./errors";

jest.mock("./config", () => ({
  API_KEY: "local-dev-key",
}));

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe("Loan quote form", () => {
  beforeEach(() => {
    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/quotes" && init?.method === "POST") {
        expect(init.headers).toEqual(
          expect.objectContaining({ "x-api-key": "local-dev-key" }),
        );
        const body = JSON.parse(String(init.body)) as {
          loanAmount: number;
          loanTermInMonths: number;
          riskBand: string;
        };
        const rate = body.riskBand === "B" ? 0.025 : 0.015;
        const years = body.loanTermInMonths / 12;
        return jsonResponse(200, {
          quoteId: "quote-123",
          commissionRate: rate,
          totalCommission:
            Math.round(body.loanAmount * rate * years * 100) / 100,
        });
      }
      return jsonResponse(404, { error: "not found" });
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("explains the quote in customer language", () => {
    render(<App />);
    expect(
      screen.getByText(/Find out what it would cost to arrange a loan/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/BFF/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Service status/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/x-api-key/i)).not.toBeInTheDocument();
  });

  it("posts loan details with an API key and shows annualised commission", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Get quote" }));

    expect(await screen.findByText("quote-123")).toBeInTheDocument();
    expect(screen.getByText("1.50%")).toBeInTheDocument();
    expect(screen.getByText("1125.00")).toBeInTheDocument();
    expect(screen.getByText("Annual commission rate")).toBeInTheDocument();
  });

  it("shows Unauthorised when the BFF rejects a missing API key", async () => {
    (global.fetch as jest.Mock).mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === "/api/quotes") {
          expect(init?.headers).toEqual(
            expect.objectContaining({ "x-api-key": "local-dev-key" }),
          );
          return jsonResponse(401, { error: "Unauthorised" });
        }
        return jsonResponse(404, {});
      },
    );

    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Get quote" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unauthorised");
  });

  it("shows a retry message when the quote request fails like a network issue", async () => {
    (global.fetch as jest.Mock).mockImplementation((input: RequestInfo | URL) => {
      if (String(input) === "/api/quotes") {
        return jsonResponse(503, { error: RETRY_LATER_MESSAGE });
      }
      return jsonResponse(404, {});
    });

    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Get quote" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      RETRY_LATER_MESSAGE,
    );
  });

  it("shows a retry message when the quote request cannot reach the BFF", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(
      new TypeError("Failed to fetch"),
    );

    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Get quote" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      RETRY_LATER_MESSAGE,
    );
  });

  it("sends the selected risk band to the BFF", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText("Risk band"), "B");
    await user.click(screen.getByRole("button", { name: "Get quote" }));

    expect(await screen.findByText("1875.00")).toBeInTheDocument();
    expect(screen.getByText("2.50%")).toBeInTheDocument();
  });
});
