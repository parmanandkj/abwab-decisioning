// ECL calculation engine — isolated from UI so the formulas below can be
// swapped for calibrated versions later without touching the dashboard.
// Every function runs once per segment row (stage × sector × security),
// not per loan.

export function getLGD(segment, recoveryRates) {
  const recovery = segment.secured ? recoveryRates.secured : recoveryRates.unsecured
  return 1 - recovery
}

export function computeSegmentECL(segment, { macroMultiplier, recoveryRates }) {
  const lgd = getLGD(segment, recoveryRates)
  const adjustedPd = Math.min(segment.avg_pd_12m * macroMultiplier, 1)

  if (segment.stage === 1) {
    return adjustedPd * lgd * segment.balance
  }

  if (segment.stage === 2) {
    const n = segment.remaining_life_years ?? 3
    const lifetimePd = 1 - Math.pow(1 - adjustedPd, n)
    return Math.min(lifetimePd, 1) * lgd * segment.balance
  }

  // Stage 3 — already defaulted, PD = 100%
  return lgd * segment.balance
}

export function computeScenarioECL(segments, fullMultiplier, recoveryRates) {
  return segments.reduce(
    (sum, seg) => sum + computeSegmentECL(seg, { macroMultiplier: fullMultiplier, recoveryRates }),
    0
  )
}

// Quarterly projection: ramp the multiplier linearly from 1.0 at Q1 to the
// full scenario multiplier by Q4.
export function quarterlyMultiplier(fullMultiplier, quarterIndex) {
  return 1 + (fullMultiplier - 1) * ((quarterIndex - 1) / 3)
}

export function computeQuarterlyECL(segments, fullMultiplier, recoveryRates, quarterIndex) {
  const macroMultiplier = quarterlyMultiplier(fullMultiplier, quarterIndex)
  return segments.reduce(
    (sum, seg) => sum + computeSegmentECL(seg, { macroMultiplier, recoveryRates }),
    0
  )
}

export function blendScenarios(totals, weights) {
  return totals.upside * weights.upside + totals.base * weights.base + totals.downside * weights.downside
}

export function computeStageBreakdown(segments, fullMultiplier, recoveryRates) {
  return [1, 2, 3].map(stage => {
    const rows = segments.filter(s => s.stage === stage)
    const balance = rows.reduce((s, r) => s + r.balance, 0)
    const ecl = rows.reduce(
      (s, r) => s + computeSegmentECL(r, { macroMultiplier: fullMultiplier, recoveryRates }),
      0
    )
    return { stage, balance, ecl, eclRate: balance > 0 ? ecl / balance : 0 }
  })
}

export function computeTotalBalance(segments) {
  return segments.reduce((s, r) => s + r.balance, 0)
}

export function computeCostOfRisk(blendedEcl, segments) {
  const totalBalance = computeTotalBalance(segments)
  return totalBalance > 0 ? blendedEcl / totalBalance : 0
}

export function computeCoverageRatio(segments, fullMultiplier, recoveryRates) {
  const stage3 = segments.filter(s => s.stage === 3)
  const balance = stage3.reduce((s, r) => s + r.balance, 0)
  const ecl = stage3.reduce(
    (s, r) => s + computeSegmentECL(r, { macroMultiplier: fullMultiplier, recoveryRates }),
    0
  )
  return balance > 0 ? ecl / balance : 0
}

// Moves `fraction` of every row's balance in `fromStage` into `toStage`,
// keeping each row's own sector/security/PD attributes.
export function migrateStageBalance(segments, fromStage, toStage, fraction) {
  if (!fraction) return segments
  const result = []
  segments.forEach(seg => {
    if (seg.stage !== fromStage) {
      result.push(seg)
      return
    }
    const migrated = seg.balance * fraction
    const remaining = seg.balance - migrated
    if (remaining > 0) result.push({ ...seg, balance: remaining })
    if (migrated > 0) result.push({ ...seg, id: `${seg.id}::to-stage-${toStage}`, stage: toStage, balance: migrated })
  })
  return result
}

// SICR/DPD threshold lever: no real DPD distribution behind this build, so
// use a hardcoded assumption — loosening the threshold migrates a fixed
// share of Stage 2 balance back to Stage 1 per 15-day step, and tightening
// it does the reverse.
export function applySicrMigration(segments, dpdThresholdDays, defaultThresholdDays, migrationPctPer15Days) {
  const deltaDays = dpdThresholdDays - defaultThresholdDays
  if (deltaDays === 0) return segments
  const fraction = Math.min((Math.abs(deltaDays) / 15) * migrationPctPer15Days, 1)
  return deltaDays > 0
    ? migrateStageBalance(segments, 2, 1, fraction)
    : migrateStageBalance(segments, 1, 2, fraction)
}

// Portfolio growth lever: adds one new Stage 1 row per sector, balance
// scaled off that sector's current Stage 1 book, PD set from the approval
// cutoff lever.
export function applyGrowth(segments, growthRatePct, approvalPdCutoff, growthSectors) {
  if (!growthRatePct) return segments
  const newRows = growthSectors
    .map(sector => {
      const sectorStage1Balance = segments
        .filter(s => s.stage === 1 && s.sector === sector)
        .reduce((sum, s) => sum + s.balance, 0)
      return {
        id: `growth-${sector.toLowerCase()}`,
        stage: 1,
        sector,
        balance: sectorStage1Balance * (growthRatePct / 100),
        avg_pd_12m: approvalPdCutoff,
        secured: false,
        remaining_life_years: 3,
      }
    })
    .filter(row => row.balance !== 0)
  return [...segments, ...newRows]
}

export function buildEffectiveSegments({
  baseSegments,
  growthRatePct,
  approvalPdCutoff,
  growthSectors,
  dpdThresholdDays,
  defaultThresholdDays,
  sicrMigrationPct,
}) {
  const migrated = applySicrMigration(baseSegments, dpdThresholdDays, defaultThresholdDays, sicrMigrationPct)
  return applyGrowth(migrated, growthRatePct, approvalPdCutoff, growthSectors)
}

// Sensitivity table: ECL impact of a defined shock vs. the current blended
// baseline, holding every other lever fixed.
export function computeSensitivity(segments, scenarioMultipliers, weights, recoveryRates, shocks) {
  const blendedFor = segs =>
    blendScenarios(
      {
        upside: computeScenarioECL(segs, scenarioMultipliers.upside, recoveryRates),
        base: computeScenarioECL(segs, scenarioMultipliers.base, recoveryRates),
        downside: computeScenarioECL(segs, scenarioMultipliers.downside, recoveryRates),
      },
      weights
    )

  const baseline = blendedFor(segments)

  return shocks.map(shock => {
    let shocked = segments
    if (shock.key === 'migration') {
      shocked = migrateStageBalance(segments, 1, 2, shock.migrationPct)
    } else if (shock.sectors) {
      shocked = segments.map(s =>
        shock.sectors.includes(s.sector) ? { ...s, avg_pd_12m: s.avg_pd_12m * (1 + shock.pdUpliftPct) } : s
      )
    } else {
      shocked = segments.map(s => ({ ...s, avg_pd_12m: s.avg_pd_12m * (1 + shock.pdUpliftPct) }))
    }
    return { key: shock.key, label: shock.label, impact: blendedFor(shocked) - baseline }
  })
}
