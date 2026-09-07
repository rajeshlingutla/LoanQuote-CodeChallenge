import cors from "cors";
import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { calculateTotalCommission } from "./commission.js";
import { RETRY_LATER_MESSAGE } from "./errors.js";
import { defaultLog, requestLog, type LogFn } from "./log.js";
import { maskBody } from "./mask.js";

export type BffOptions = {
  apiKey?: string;
  mockBaseUrl?: string;
  log?: LogFn;
};

type MockQuote = {
  quoteId?: unknown;
  commissionRate?: unknown;
};

export function createApp(options: BffOptions = {}) {
  const apiKey = options.apiKey ?? process.env.API_KEY ?? "local-dev-key";
  const mockBaseUrl =
    options.mockBaseUrl ?? process.env.MOCK_BASE_URL ?? "http://localhost:4000";
  const log = options.log ?? defaultLog;

  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(requestLog(log));

  function requireApiKey(req: Request, res: Response, next: NextFunction) {
    const key = req.header("x-api-key");
    if (!key || key !== apiKey) {
      res.status(401).json({ error: "Unauthorised" });
      return;
    }
    next();
  }

  app.use(requireApiKey);

  app.get("/health", async (_req: Request, res: Response) => {
    const started = Date.now();

    try {
      const response = await fetch(`${mockBaseUrl}/health`);
      const latencyMs = Date.now() - started;
      const body = (await response.json()) as unknown;

      res.status(200).json({
        status: response.ok ? "ok" : "degraded",
        bff: { ok: true },
        mock: {
          ok: response.ok,
          status: response.status,
          latencyMs,
          body,
        },
      });
    } catch (error) {
      const latencyMs = Date.now() - started;
      const message =
        error instanceof Error ? error.message : "Unknown mock error";

      res.status(200).json({
        status: "degraded",
        bff: { ok: true },
        mock: {
          ok: false,
          status: 0,
          latencyMs,
          error: message,
        },
      });
    }
  });

  app.post("/quotes", async (req: Request, res: Response) => {
    const { loanAmount, loanTermInMonths, riskBand } = req.body as {
      loanAmount?: unknown;
      loanTermInMonths?: unknown;
      riskBand?: unknown;
    };

    if (
      typeof loanAmount !== "number" ||
      !Number.isFinite(loanAmount) ||
      loanAmount <= 0 ||
      typeof loanTermInMonths !== "number" ||
      !Number.isInteger(loanTermInMonths) ||
      loanTermInMonths <= 0 ||
      typeof riskBand !== "string" ||
      riskBand.length === 0
    ) {
      log({
        msg: "bff.quote.invalid",
        body: maskBody(req.body),
      });
      res.status(400).json({
        error:
          "loanAmount, loanTermInMonths, and riskBand are required with valid values",
      });
      return;
    }

    try {
      const response = await fetch(`${mockBaseUrl}/quotes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ loanAmount, loanTermInMonths, riskBand }),
      });

      if (response.status === 400) {
        const body = (await response.json()) as unknown;
        log({
          msg: "bff.quote.mock_rejected",
          status: 400,
          body: maskBody(body),
        });
        res.status(400).json(body);
        return;
      }

      if (!response.ok) {
        log({
          msg: "bff.quote.mock_unavailable",
          status: response.status,
        });
        res.status(503).json({ error: RETRY_LATER_MESSAGE });
        return;
      }

      const body = (await response.json()) as MockQuote;
      if (
        typeof body.quoteId !== "string" ||
        typeof body.commissionRate !== "number"
      ) {
        log({ msg: "bff.quote.bad_mock_payload" });
        res.status(503).json({ error: RETRY_LATER_MESSAGE });
        return;
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

      res.status(200).json({
        quoteId: body.quoteId,
        commissionRate: body.commissionRate,
        totalCommission,
      });
    } catch (error) {
      log({
        msg: "bff.quote.error",
        error: error instanceof Error ? error.message : "unknown",
      });
      res.status(503).json({ error: RETRY_LATER_MESSAGE });
    }
  });

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    log({
      msg: "bff.error",
      error: err instanceof Error ? err.message : "unknown",
    });
    res.status(500).json({ status: "error", bff: { ok: false } });
  };

  app.use(errorHandler);

  return app;
}
