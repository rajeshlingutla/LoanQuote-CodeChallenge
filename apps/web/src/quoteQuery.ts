import { gql, type TypedDocumentNode } from "@apollo/client";

export type QuoteResponse = {
  quoteId: string;
  commissionRate: number;
  totalCommission: number;
};

export type CreateQuoteData = {
  createQuote: QuoteResponse;
};

export type CreateQuoteVariables = {
  input: {
    loanAmount: number;
    loanTermInMonths: number;
    riskBand: string;
  };
};

export const CREATE_QUOTE: TypedDocumentNode<
  CreateQuoteData,
  CreateQuoteVariables
> = gql`
  mutation CreateQuote($input: QuoteInput!) {
    createQuote(input: $input) {
      quoteId
      commissionRate
      totalCommission
    }
  }
`;
