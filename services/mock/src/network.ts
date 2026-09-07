export const DEFAULT_QUOTE_FAILURE_RATE = 0.3;

export function shouldSimulateNetworkIssue(
  rate = DEFAULT_QUOTE_FAILURE_RATE,
  random = Math.random,
): boolean {
  return random() < rate;
}
