import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { createHandler } from "graphql-http/lib/use/express";
import { defaultLog, requestLog, type LogFn } from "./log.js";
import { createGraphqlRoot, schema } from "./schema.js";

export type BffOptions = {
  apiKey?: string;
  mockBaseUrl?: string;
  log?: LogFn;
};

export function createApp(options: BffOptions = {}) {
  const apiKey = options.apiKey ?? process.env.API_KEY ?? "local-dev-key";
  const mockBaseUrl =
    options.mockBaseUrl ?? process.env.MOCK_BASE_URL ?? "http://localhost:4000";
  const log = options.log ?? defaultLog;

  const app = express();

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

  app.all(
    "/graphql",
    createHandler({
      schema,
      rootValue: createGraphqlRoot(mockBaseUrl, log),
    }),
  );

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
