export const RISK_BAND_COLORS = {
  A: '#10B981',
  B: '#34D399',
  C: '#F59E0B',
  D: '#F97316',
  E: '#EF4444',
}

export const RISK_BAND_LABELS = {
  A: 'Low Risk',
  B: 'Low-Medium Risk',
  C: 'Medium Risk',
  D: 'High Risk',
  E: 'Very High Risk',
}

export function getRiskBand(pdScore) {
  if (pdScore < 0.03) return 'A'
  if (pdScore < 0.07) return 'B'
  if (pdScore < 0.12) return 'C'
  if (pdScore < 0.20) return 'D'
  return 'E'
}

export function formatSAR(amount, abbreviate = false) {
  if (abbreviate && amount >= 1_000_000) {
    return `SAR ${(amount / 1_000_000).toFixed(1)}M`
  }
  if (abbreviate && amount >= 1_000) {
    return `SAR ${(amount / 1_000).toFixed(0)}K`
  }
  if (amount >= 10_000) {
    return `SAR ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }
  return `SAR ${amount.toFixed(2)}`
}

export function formatPct(value, decimals = 1) {
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatPctDirect(value, decimals = 2) {
  return `${value.toFixed(decimals)}%`
}
