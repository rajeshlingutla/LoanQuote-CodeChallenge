const SENSITIVE_HEADERS = new Set([
  "x-api-key",
  "authorization",
  "cookie",
  "set-cookie",
]);

const SENSITIVE_BODY_KEYS = new Set([
  "loanamount",
  "totalcommission",
  "apikey",
  "api_key",
  "x-api-key",
]);

export function maskSecret(value: string | undefined): string {
  if (!value) {
    return "[missing]";
  }
  if (value.length <= 4) {
    return "****";
  }
  return `****${value.slice(-4)}`;
}

export function maskHeaders(
  headers: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
      out[key] = typeof value === "string" ? maskSecret(value) : "****";
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function maskBody(body: unknown): unknown {
  if (Array.isArray(body)) {
    return body.map((item) => maskBody(item));
  }
  if (body == null || typeof body !== "object") {
    return body;
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (SENSITIVE_BODY_KEYS.has(key.toLowerCase())) {
      out[key] = "[REDACTED]";
    } else {
      out[key] = maskBody(value);
    }
  }
  return out;
}
