const RETAIL_CODES = ['4711', '4719', '4721', '4722', '4723']
const FOOD_BEVERAGE_CODES = ['5610', '5620', '5630']
const CONSTRUCTION_CODES = ['4100', '4110', '4120', '4200', '4210', '4220']

export function lookupLGD(collateralType, coverageRatio, industryCode) {
  let base

  if (collateralType === 'real_estate') {
    if (coverageRatio > 1.30) base = 0.12
    else if (coverageRatio >= 1.0) base = 0.22
    else base = 0.35
  } else if (collateralType === 'equipment') {
    base = 0.45
  } else if (collateralType === 'inventory') {
    base = 0.55
  } else {
    base = 0.65
  }

  if (RETAIL_CODES.includes(industryCode) || FOOD_BEVERAGE_CODES.includes(industryCode)) {
    base -= 0.05
  } else if (CONSTRUCTION_CODES.includes(industryCode)) {
    base += 0.10
  }

  return Math.max(0.05, Math.min(0.95, base))
}
