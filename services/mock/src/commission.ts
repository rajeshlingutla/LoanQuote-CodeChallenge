export function calculateTotalCommission(
  loanAmount: number,
  annualCommissionRate: number,
  loanTermInMonths: number,
): number {
  const termInYears = loanTermInMonths / 12;
  return Math.round(loanAmount * annualCommissionRate * termInYears * 100) / 100;
}
