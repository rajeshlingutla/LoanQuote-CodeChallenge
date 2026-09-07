import { type FormEvent, useState } from "react";
import "./App.css";
import { API_KEY } from "./config";
import { RETRY_LATER_MESSAGE } from "./errors";
import { CREATE_QUOTE } from "./quoteQuery";

type QuoteResponse = {
  quoteId: string;
  commissionRate: number;
  totalCommission: number;
};

function apiHeaders(): HeadersInit {
  return {
    "content-type": "application/json",
    "x-api-key": API_KEY,
  };
}

function App() {
  const [loanAmount, setLoanAmount] = useState("25000");
  const [loanTermInMonths, setLoanTermInMonths] = useState("36");
  const [riskBand, setRiskBand] = useState("A");
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);

  async function requestQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuoting(true);
    setQuoteError(null);
    setQuote(null);

    try {
      const response = await fetch("/api/graphql", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          query: CREATE_QUOTE,
          variables: {
            input: {
              loanAmount: Number(loanAmount),
              loanTermInMonths: Number(loanTermInMonths),
              riskBand,
            },
          },
        }),
      });

      let payload: {
        data?: { createQuote?: QuoteResponse };
        errors?: { message?: string }[];
        error?: string;
      };
      try {
        payload = (await response.json()) as typeof payload;
      } catch {
        setQuoteError(RETRY_LATER_MESSAGE);
        return;
      }

      if (response.status === 401) {
        setQuoteError(payload.error ?? "Unauthorised");
        return;
      }
      if (!response.ok) {
        setQuoteError(RETRY_LATER_MESSAGE);
        return;
      }

      const graphqlError = payload.errors?.[0]?.message;
      if (graphqlError) {
        setQuoteError(
          graphqlError.includes("retry") ? RETRY_LATER_MESSAGE : graphqlError,
        );
        return;
      }

      const nextQuote = payload.data?.createQuote;
      if (!nextQuote) {
        setQuoteError(RETRY_LATER_MESSAGE);
        return;
      }
      setQuote(nextQuote);
    } catch {
      setQuoteError(RETRY_LATER_MESSAGE);
    } finally {
      setQuoting(false);
    }
  }

  return (
    <main>
      <h1>Loan quote</h1>
      <p className="lede">
        Find out what it would cost to arrange a loan. Enter how much you want
        to borrow, how many months you need to repay it, and your risk band. We
        use the annual commission rate for that band and apply it across the
        full term, so you can see the total commission before you proceed.
      </p>

      <form className="quote-form" onSubmit={(event) => void requestQuote(event)}>
        <label>
          Loan amount
          <input
            name="loanAmount"
            type="number"
            min="1"
            step="0.01"
            required
            value={loanAmount}
            onChange={(event) => setLoanAmount(event.target.value)}
          />
        </label>
        <label>
          Loan term (months)
          <input
            name="loanTermInMonths"
            type="number"
            min="1"
            step="1"
            required
            value={loanTermInMonths}
            onChange={(event) => setLoanTermInMonths(event.target.value)}
          />
        </label>
        <label>
          Risk band
          <select
            name="riskBand"
            value={riskBand}
            onChange={(event) => setRiskBand(event.target.value)}
          >
            <option value="A">A — lower risk</option>
            <option value="B">B — medium risk</option>
            <option value="C">C — higher risk</option>
          </select>
        </label>
        <button type="submit" disabled={quoting}>
          {quoting ? "Requesting quote…" : "Get quote"}
        </button>
      </form>

      {quoteError && (
        <p className="error" role="alert">
          {quoteError}
        </p>
      )}
      {quote && (
        <section className="quote-result">
          <h2>Your quote</h2>
          <dl>
            <dt>Reference</dt>
            <dd>{quote.quoteId}</dd>
            <dt>Annual commission rate</dt>
            <dd>{(quote.commissionRate * 100).toFixed(2)}%</dd>
            <dt>Total commission</dt>
            <dd>{quote.totalCommission.toFixed(2)}</dd>
          </dl>
        </section>
      )}
    </main>
  );
}

export default App;
