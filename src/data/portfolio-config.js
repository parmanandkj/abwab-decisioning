// Segment-level portfolio config for the ECL Simulation tab.
// Stand-in for real loan-level data: one row per stage × sector × security
// combination. Swap for an aggregated data feed once real history exists.

export const BASE_SEGMENTS = [
  // Stage 1 — ~85% of balance
  { id: 'stage1-trading',          stage: 1, sector: 'Trading',      balance: 60_000_000, avg_pd_12m: 0.035, secured: false, remaining_life_years: 1.5 },
  { id: 'stage1-construction',     stage: 1, sector: 'Construction', balance: 55_000_000, avg_pd_12m: 0.050, secured: false, remaining_life_years: 3 },
  { id: 'stage1-construction-sec', stage: 1, sector: 'Construction', balance: 25_000_000, avg_pd_12m: 0.050, secured: true,  remaining_life_years: 3 },
  { id: 'stage1-services',         stage: 1, sector: 'Services',     balance: 53_000_000, avg_pd_12m: 0.030, secured: false, remaining_life_years: 3 },
  { id: 'stage1-retail',           stage: 1, sector: 'Retail',       balance: 20_000_000, avg_pd_12m: 0.045, secured: false, remaining_life_years: 3 },

  // Stage 2 — ~12% of balance
  { id: 'stage2-trading',          stage: 2, sector: 'Trading',      balance:  9_500_000, avg_pd_12m: 0.090, secured: false, remaining_life_years: 1.5 },
  { id: 'stage2-construction',     stage: 2, sector: 'Construction', balance: 10_000_000, avg_pd_12m: 0.140, secured: false, remaining_life_years: 3 },
  { id: 'stage2-construction-sec', stage: 2, sector: 'Construction', balance:  4_000_000, avg_pd_12m: 0.140, secured: true,  remaining_life_years: 3 },
  { id: 'stage2-services',         stage: 2, sector: 'Services',     balance:  6_500_000, avg_pd_12m: 0.080, secured: false, remaining_life_years: 3 },

  // Stage 3 — ~3% of balance, already defaulted
  { id: 'stage3-construction',     stage: 3, sector: 'Construction', balance:  3_000_000, avg_pd_12m: 1.0, secured: false },
  { id: 'stage3-construction-sec', stage: 3, sector: 'Construction', balance:  2_000_000, avg_pd_12m: 1.0, secured: true },
  { id: 'stage3-retail',           stage: 3, sector: 'Retail',       balance:  2_500_000, avg_pd_12m: 1.0, secured: false },
]

export const GROWTH_SECTORS = ['Trading', 'Construction', 'Services', 'Retail']

export const DEFAULT_SCENARIOS = {
  upside:   { label: 'Upside',   multiplier: 0.8 },
  base:     { label: 'Base',     multiplier: 1.0 },
  downside: { label: 'Downside', multiplier: 1.5 },
}

export const DEFAULT_WEIGHTS = { upside: 20, base: 60, downside: 20 }

export const DEFAULT_RECOVERY_RATES = { unsecured: 70, secured: 80 } // %, LGD = 1 − recovery

export const DEFAULT_SICR_THRESHOLD_DAYS = 30
export const SICR_MIGRATION_PCT_PER_15_DAYS = 0.03 // fraction of source-stage balance per 15-day step

export const DEFAULT_APPROVAL_PD_CUTOFF = 8 // %
export const DEFAULT_GROWTH_RATE = 10 // %

// Placeholder prior-quarter blended full-year ECL, for the provision
// build/release card. No real prior-period run exists yet — hardcoded
// modestly below the current default blended ECL (~SAR 7.48M).
export const PRIOR_PERIOD_ECL = 7_000_000

export const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

// Illustrative 3×3 transition matrix for the supporting "stage migration"
// diagnostic — hardcoded, not derived from segment data or real historical
// transitions (no transition history exists yet to compute it from).
export const STAGE_MIGRATION_MATRIX = [
  { from: 1, to1: 0.90, to2: 0.08, to3: 0.02 },
  { from: 2, to1: 0.30, to2: 0.55, to3: 0.15 },
  { from: 3, to1: 0.00, to2: 0.00, to3: 1.00 },
]

export const SENSITIVITY_SHOCKS = [
  {
    key: 'oil',
    label: 'Oil price −$10/barrel',
    sectors: ['Trading', 'Construction'],
    pdUpliftPct: 0.20,
  },
  {
    key: 'gdp',
    label: 'GDP −1%',
    pdUpliftPct: 0.10,
  },
  {
    key: 'migration',
    label: '5% of Stage 1 balance migrates to Stage 2',
    migrationPct: 0.05,
  },
]
