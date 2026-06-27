export function evaluateRule(operator, actual, threshold) {
  if (actual === null || actual === undefined) return false
  if (operator === 'gte') return Number(actual) >= Number(threshold)
  if (operator === 'lte') return Number(actual) <= Number(threshold)
  if (operator === 'eq') return String(actual).toLowerCase() === String(threshold).toLowerCase()
  return false
}

export function runPolicyCheck(features, rules) {
  return rules
    .filter(rule => rule.active)
    .map(rule => {
      const fieldParts = rule.field.split('.')
      const value = features[fieldParts[fieldParts.length - 1]] ?? null
      const passed = evaluateRule(rule.operator, value, rule.threshold)
      return {
        rule: rule.name,
        data_source: rule.data_source,
        threshold: rule.threshold,
        actual: value,
        passed,
      }
    })
}
