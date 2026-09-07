import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
} from "express";
import { randomUUID } from "node:crypto";
import { calculateTotalCommission } from "./commission.js";
import { shouldSimulateNetworkIssue } from "./network.js";

const PORT = Number(process.env.PORT ?? 4000);
const QUOTE_FAILURE_RATE = Number(process.env.QUOTE_FAILURE_RATE ?? 0.3);

const COMMISSION_RATES: Record<string, number> = {
  A: 0.015,
  B: 0.025,
  C: 0.04,
};

const app = express();

app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "mock" });
});

app.post("/quotes", (req: Request, res: Response) => {
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
    typeof riskBand !== "string"
  ) {
    res.status(400).json({ error: "Invalid quote request" });
    return;
  }

  const band = riskBand.toUpperCase();
  const commissionRate = COMMISSION_RATES[band];
  if (commissionRate == null) {
    res.status(400).json({ error: "Unknown riskBand. Use A, B, or C." });
    return;
  }

  if (shouldSimulateNetworkIssue(QUOTE_FAILURE_RATE)) {
    res.status(503).json({ error: "network_error" });
    return;
  }

  res.status(200).json({
    quoteId: randomUUID(),
    commissionRate,
    totalCommission: calculateTotalCommission(
      loanAmount,
      commissionRate,
      loanTermInMonths,
    ),
    loanTermInMonths,
  });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ status: "error", service: "mock" });
};

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Mock listening on http://localhost:${PORT}`);
});
