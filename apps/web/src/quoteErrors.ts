import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";
import { RETRY_LATER_MESSAGE } from "./errors";

export function quoteErrorMessage(error: unknown): string {
  if (ServerError.is(error) && error.statusCode === 401) {
    return "Unauthorised";
  }
  if (
    error &&
    typeof error === "object" &&
    "statusCode" in error &&
    error.statusCode === 401
  ) {
    return "Unauthorised";
  }

  if (CombinedGraphQLErrors.is(error)) {
    const message = error.errors[0]?.message;
    if (message) {
      return message.includes("retry") ? RETRY_LATER_MESSAGE : message;
    }
  }

  return RETRY_LATER_MESSAGE;
}
