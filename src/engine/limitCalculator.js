export function calculateLimit(riskBand, annualRevenue, workingCapital, limitFormula) {
  const { low_risk_bands, medium_risk_bands, low_risk, medium_risk, high_risk } = limitFormula

  let formula
  if (low_risk_bands.includes(riskBand)) {
    formula = low_risk
  } else if (medium_risk_bands.includes(riskBand)) {
    formula = medium_risk
  } else {
    formula = high_risk
  }

  const fromRevenue = annualRevenue * formula.revenue_pct
  const fromWorkingCapital = workingCapital * formula.working_capital_pct
  const cap = formula.cap_sar

  const candidates = [fromRevenue, fromWorkingCapital, cap]

  return formula.function === 'max'
    ? Math.max(...candidates)
    : Math.min(...candidates)
}
