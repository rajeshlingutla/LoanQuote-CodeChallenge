import { calculateTotalCommission } from "./commission.js";
import { RETRY_LATER_MESSAGE } from "./errors.js";
import type { LogFn } from "./log.js";
import { maskBody } from "./mask.js";

export type Quote = {
  quoteId: string;
  commissionRate: number;
  totalCommission: number;
};

export type QuoteInput = {
  loanAmount: number;
  loanTermInMonths: number;
  riskBand: string;
};

export type QuoteFailure = {
  ok: false;
  error: string;
  retry: boolean;
};

export type QuoteSuccess = {
  ok: true;
  quote: Quote;
};

type MockQuote = {
  quoteId?: unknown;
  commissionRate?: unknown;
};

export async function createQuote(
  input: QuoteInput,
  mockBaseUrl: string,
  log: LogFn,
): Promise<QuoteSuccess | QuoteFailure> {
  const { loanAmount, loanTermInMonths, riskBand } = input;

  if (
    !Number.isFinite(loanAmount) ||
    loanAmount <= 0 ||
    !Number.isInteger(loanTermInMonths) ||
    loanTermInMonths <= 0 ||
    riskBand.length === 0
  ) {
    log({ msg: "bff.quote.invalid", body: maskBody(input) });
    return {
      ok: false,
      retry: false,
      error:
        "loanAmount, loanTermInMonths, and riskBand are required with valid values",
    };
  }

  try {
    const response = await fetch(`${mockBaseUrl}/quotes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ loanAmount, loanTermInMonths, riskBand }),
    });

    if (response.status === 400) {
      const body = (await response.json()) as { error?: string };
      log({
        msg: "bff.quote.mock_rejected",
        status: 400,
        body: maskBody(body),
      });
      return {
        ok: false,
        retry: false,
        error: body.error ?? "Invalid quote request",
      };
    }

    if (!response.ok) {
      log({
        msg: "bff.quote.mock_unavailable",
        status: response.status,
      });
      return { ok: false, retry: true, error: RETRY_LATER_MESSAGE };
    }

    const body = (await response.json()) as MockQuote;
    if (
      typeof body.quoteId !== "string" ||
      typeof body.commissionRate !== "number"
    ) {
      log({ msg: "bff.quote.bad_mock_payload" });
      return { ok: false, retry: true, error: RETRY_LATER_MESSAGE };
    }

    const totalCommission = calculateTotalCommission(
      loanAmount,
      body.commissionRate,
      loanTermInMonths,
    );

    log({
      msg: "bff.quote.ok",
      quoteId: body.quoteId,
      riskBand,
      loanTermInMonths,
      commissionRate: body.commissionRate,
      body: maskBody({ loanAmount, totalCommission }),
    });

    return {
      ok: true,
      quote: {
        quoteId: body.quoteId,
        commissionRate: body.commissionRate,
        totalCommission,
      },
    };
  } catch (error) {
    log({
      msg: "bff.quote.error",
      error: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, retry: true, error: RETRY_LATER_MESSAGE };
  }
}
