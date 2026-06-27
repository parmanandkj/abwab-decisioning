import { lookupLGD } from './lgdLookup.js'

export function calculatePricing(pdScore, riskBand, features, recommendedLimit, pricing, costOfCapital) {
  const collateralType = features.collateral_type || 'unsecured'
  const collateralValue = features.collateral_value || 0
  const coverageRatio = recommendedLimit > 0 ? collateralValue / recommendedLimit : 0
  const industryCode = features.industry_isic4_code || ''

  const lgd = lookupLGD(collateralType, coverageRatio, industryCode)

  const costOfCapitalRate = costOfCapital / 100
  const servicingCost = pricing.servicing_cost / 100
  const margin = (pricing.contribution_margin_by_band[riskBand] || 2.0) / 100
  const expectedLoss = pdScore * lgd

  const totalRate = costOfCapitalRate + servicingCost + margin + expectedLoss

  return {
    cost_of_capital_pct: costOfCapitalRate * 100,
    servicing_cost_pct: servicingCost * 100,
    contribution_margin_pct: margin * 100,
    expected_loss_pct: expectedLoss * 100,
    total_rate_pct: totalRate * 100,
  }
}
