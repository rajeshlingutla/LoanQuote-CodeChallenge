import { GraphQLError } from "graphql";
import { buildSchema } from "graphql";
import { createQuote, type QuoteInput } from "./quote.js";
import type { LogFn } from "./log.js";

export const schema = buildSchema(`
  type Query {
    ping: String!
  }

  type Quote {
    quoteId: ID!
    commissionRate: Float!
    totalCommission: Float!
  }

  input QuoteInput {
    loanAmount: Float!
    loanTermInMonths: Int!
    riskBand: String!
  }

  type Mutation {
    createQuote(input: QuoteInput!): Quote!
  }
`);

export function createGraphqlRoot(mockBaseUrl: string, log: LogFn) {
  return {
    ping: () => "ok",
    createQuote: async ({ input }: { input: QuoteInput }) => {
      const result = await createQuote(input, mockBaseUrl, log);
      if (!result.ok) {
        throw new GraphQLError(result.error, {
          extensions: { retry: result.retry },
        });
      }
      return result.quote;
    },
  };
}
