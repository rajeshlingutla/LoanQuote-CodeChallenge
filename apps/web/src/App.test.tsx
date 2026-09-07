import { GraphQLError } from "graphql";
import { MockedProvider } from "@apollo/client/testing/react";
import type { MockedResponse } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { RETRY_LATER_MESSAGE } from "./errors";
import { CREATE_QUOTE } from "./quoteQuery";

jest.mock("./config", () => ({
  API_KEY: "local-dev-key",
}));

const defaultInput = {
  loanAmount: 25000,
  loanTermInMonths: 36,
  riskBand: "A",
};

function renderApp(mocks: MockedResponse[]) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <App />
    </MockedProvider>,
  );
}

function quoteMock(
  input: typeof defaultInput,
  mock: Pick<MockedResponse, "result" | "error">,
): MockedResponse {
  return {
    request: {
      query: CREATE_QUOTE,
      variables: { input },
    },
    ...mock,
  };
}

describe("Loan quote form", () => {
  it("explains the quote in customer language", () => {
    renderApp([]);
    expect(
      screen.getByText(/Find out what it would cost to arrange a loan/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/BFF/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Service status/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/x-api-key/i)).not.toBeInTheDocument();
  });

  it("posts loan details with an API key and shows annualised commission", async () => {
    const user = userEvent.setup();
    renderApp([
      quoteMock(defaultInput, {
        result: {
          data: {
            createQuote: {
              quoteId: "quote-123",
              commissionRate: 0.015,
              totalCommission: 1125,
            },
          },
        },
      }),
    ]);

    await user.click(screen.getByRole("button", { name: "Get quote" }));

    expect(await screen.findByText("quote-123")).toBeInTheDocument();
    expect(screen.getByText("1.50%")).toBeInTheDocument();
    expect(screen.getByText("1125.00")).toBeInTheDocument();
    expect(screen.getByText("Annual commission rate")).toBeInTheDocument();
  });

  it("shows Unauthorised when the BFF rejects a missing API key", async () => {
    const user = userEvent.setup();
    const unauthorised = Object.assign(new Error("Unauthorised"), {
      statusCode: 401,
    });
    renderApp([quoteMock(defaultInput, { error: unauthorised })]);

    await user.click(screen.getByRole("button", { name: "Get quote" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unauthorised");
  });

  it("shows a retry message when the quote request fails like a network issue", async () => {
    const user = userEvent.setup();
    renderApp([
      quoteMock(defaultInput, {
        result: {
          errors: [new GraphQLError(RETRY_LATER_MESSAGE)],
        },
      }),
    ]);

    await user.click(screen.getByRole("button", { name: "Get quote" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      RETRY_LATER_MESSAGE,
    );
  });

  it("shows a retry message when the quote request cannot reach the BFF", async () => {
    const user = userEvent.setup();
    renderApp([
      quoteMock(defaultInput, {
        error: new TypeError("Failed to fetch"),
      }),
    ]);

    await user.click(screen.getByRole("button", { name: "Get quote" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      RETRY_LATER_MESSAGE,
    );
  });

  it("sends the selected risk band to the BFF", async () => {
    const user = userEvent.setup();
    renderApp([
      quoteMock(
        { ...defaultInput, riskBand: "B" },
        {
          result: {
            data: {
              createQuote: {
                quoteId: "quote-123",
                commissionRate: 0.025,
                totalCommission: 1875,
              },
            },
          },
        },
      ),
    ]);

    await user.selectOptions(screen.getByLabelText("Risk band"), "B");
    await user.click(screen.getByRole("button", { name: "Get quote" }));

    expect(await screen.findByText("1875.00")).toBeInTheDocument();
    expect(screen.getByText("2.50%")).toBeInTheDocument();
  });
});
