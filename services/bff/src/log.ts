import { maskBody, maskHeaders } from "./mask.js";
import type { NextFunction, Request, Response } from "express";

export type LogFn = (entry: Record<string, unknown>) => void;

export function defaultLog(entry: Record<string, unknown>): void {
  console.log(JSON.stringify(entry));
}

export function requestLog(log: LogFn) {
  return (req: Request, res: Response, next: NextFunction) => {
    log({
      msg: "bff.request",
      method: req.method,
      path: req.path,
      headers: maskHeaders(req.headers as Record<string, unknown>),
      body: maskBody(req.body),
    });

    const started = Date.now();
    res.on("finish", () => {
      log({
        msg: "bff.response",
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Date.now() - started,
      });
    });

    next();
  };
}
