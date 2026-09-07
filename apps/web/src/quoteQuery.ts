export const CREATE_QUOTE = `
  mutation CreateQuote($input: QuoteInput!) {
    createQuote(input: $input) {
      quoteId
      commissionRate
      totalCommission
    }
  }
`;
