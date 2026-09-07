import { useMutation } from "@apollo/client/react";
import { type FormEvent, useState } from "react";
import "./App.css";
import { quoteErrorMessage } from "./quoteErrors";
import { CREATE_QUOTE, type QuoteResponse } from "./quoteQuery";

function App() {
  const [loanAmount, setLoanAmount] = useState("25000");
  const [loanTermInMonths, setLoanTermInMonths] = useState("36");
  const [riskBand, setRiskBand] = useState("A");
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [createQuote, { loading }] = useMutation(CREATE_QUOTE);

  async function requestQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuoteError(null);
    setQuote(null);

    try {
      const { data } = await createQuote({
        variables: {
          input: {
            loanAmount: Number(loanAmount),
            loanTermInMonths: Number(loanTermInMonths),
            riskBand,
          },
        },
      });
      if (data?.createQuote) {
        setQuote(data.createQuote);
      }
    } catch (error) {
      setQuoteError(quoteErrorMessage(error));
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
        <button type="submit" disabled={loading}>
          {loading ? "Requesting quote…" : "Get quote"}
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
