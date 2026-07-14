import { useState, useMemo, Fragment } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  BASE_SEGMENTS, GROWTH_SECTORS, DEFAULT_SCENARIOS, DEFAULT_WEIGHTS,
  DEFAULT_RECOVERY_RATES, DEFAULT_SICR_THRESHOLD_DAYS, SICR_MIGRATION_PCT_PER_15_DAYS,
  DEFAULT_APPROVAL_PD_CUTOFF, DEFAULT_GROWTH_RATE, QUARTERS, SENSITIVITY_SHOCKS,
  STAGE_MIGRATION_MATRIX,
} from '../data/portfolio-config.js'
import {
  buildEffectiveSegments, computeScenarioECL, blendScenarios,
  computeStageBreakdown, computeCoverageRatio, computeQuarterlyECL, computeSensitivity,
} from '../engine/ecl-engine.js'
import { formatSAR } from '../utils/formatters.js'

const STAGE_COLORS = { 1: '#10B981', 2: '#F59E0B', 3: '#EF4444' }

function SectionLabel({ children }) {
  return (
    <div className="text-xs font-medium text-abwab-muted uppercase tracking-wider mb-3">
      {children}
    </div>
  )
}

// ─── What-if controls ──────────────────────────────────────────────────────────

function SliderRow({ label, value, min, max, step = 1, unit = '', onChange }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="text-xs text-abwab-muted">{label}</label>
        <span className="text-sm font-semibold text-white">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-abwab-border accent-abwab-purple"
      />
    </div>
  )
}

function WhatIfControls({
  collapsed, onToggleCollapse,
  macroMultipliers, setMacroMultipliers,
  weights, updateWeight,
  recoveryRates, setRecoveryRates,
  sicrThresholdDays, setSicrThresholdDays,
  approvalPdCutoff, setApprovalPdCutoff,
  growthRate, setGrowthRate,
}) {
  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between bg-abwab-card border border-abwab-border rounded-lg px-4 py-2.5 mb-8 text-sm text-abwab-muted hover:text-white transition-colors"
      >
        <span className="font-medium">What-if controls</span>
        <span className="text-xs">▾ Expand</span>
      </button>
    )
  }

  const weightSum = weights.upside + weights.base + weights.downside

  return (
    <div className="bg-abwab-card border border-abwab-border rounded-lg p-5 mb-8">
      <div className="flex items-center justify-between mb-5">
        <span className="text-sm font-semibold text-white">What-if controls</span>
        <button onClick={onToggleCollapse} className="text-xs text-abwab-muted hover:text-white transition-colors">
          ▴ Collapse
        </button>
      </div>

      {/* Row 1 — Scenario controls */}
      <div className="mb-6">
        <div className="text-xs font-medium text-abwab-muted uppercase tracking-wider mb-3">Scenario controls</div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <SliderRow label="Macro multiplier — upside" value={macroMultipliers.upside} min={0.5} max={2.5} step={0.05} unit="×"
            onChange={v => setMacroMultipliers(p => ({ ...p, upside: v }))} />
          <SliderRow label="Macro multiplier — base" value={macroMultipliers.base} min={0.5} max={2.5} step={0.05} unit="×"
            onChange={v => setMacroMultipliers(p => ({ ...p, base: v }))} />
          <SliderRow label="Macro multiplier — downside" value={macroMultipliers.downside} min={0.5} max={2.5} step={0.05} unit="×"
            onChange={v => setMacroMultipliers(p => ({ ...p, downside: v }))} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <SliderRow label="Weight — upside" value={weights.upside} min={0} max={100} step={1} unit="%"
            onChange={v => updateWeight('upside', v)} />
          <SliderRow label="Weight — base" value={weights.base} min={0} max={100} step={1} unit="%"
            onChange={v => updateWeight('base', v)} />
          <SliderRow label="Weight — downside" value={weights.downside} min={0} max={100} step={1} unit="%"
            onChange={v => updateWeight('downside', v)} />
        </div>
        <div className={`text-xs mt-2 ${weightSum === 100 ? 'text-abwab-muted' : 'text-abwab-warning'}`}>
          Weights sum to {weightSum}%
        </div>
      </div>

      {/* Row 2 — Loss controls */}
      <div className="mb-6 pt-5 border-t border-abwab-border">
        <div className="text-xs font-medium text-abwab-muted uppercase tracking-wider mb-3">Loss controls</div>
        <div className="grid grid-cols-3 gap-4">
          <SliderRow label="Recovery rate — unsecured" value={recoveryRates.unsecured} min={0} max={100} step={1} unit="%"
            onChange={v => setRecoveryRates(p => ({ ...p, unsecured: v }))} />
          <SliderRow label="Recovery rate — secured" value={recoveryRates.secured} min={0} max={100} step={1} unit="%"
            onChange={v => setRecoveryRates(p => ({ ...p, secured: v }))} />
          <SliderRow label="SICR / DPD threshold" value={sicrThresholdDays} min={0} max={60} step={5} unit=" days"
            onChange={setSicrThresholdDays} />
        </div>
      </div>

      {/* Row 3 — Portfolio strategy */}
      <div className="pt-5 border-t border-abwab-border">
        <div className="text-xs font-medium text-abwab-muted uppercase tracking-wider mb-3">Portfolio strategy</div>
        <div className="grid grid-cols-2 gap-4">
          <SliderRow label="Approval PD cutoff" value={approvalPdCutoff} min={0} max={20} step={0.5} unit="%"
            onChange={setApprovalPdCutoff} />
          <SliderRow label="Portfolio growth rate" value={growthRate} min={-20} max={50} step={1} unit="%"
            onChange={setGrowthRate} />
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard components ──────────────────────────────────────────────────────

function HeroMetric({ blended, scenarioTotals }) {
  const low = Math.min(scenarioTotals.upside, scenarioTotals.base, scenarioTotals.downside)
  const high = Math.max(scenarioTotals.upside, scenarioTotals.base, scenarioTotals.downside)
  return (
    <div className="bg-abwab-card border border-abwab-border rounded-lg p-6 mb-8">
      <div className="text-xs text-abwab-muted mb-2">Blended full-year ECL forecast</div>
      <div className="text-4xl font-semibold text-white leading-none mb-2">{formatSAR(blended, true)}</div>
      <div className="text-sm text-abwab-muted">Range {formatSAR(low, true)} – {formatSAR(high, true)}</div>
    </div>
  )
}

function ScenarioCards({ scenarioTotals, macroMultipliers }) {
  const cards = [
    { key: 'upside', label: 'Upside', color: 'text-emerald-400' },
    { key: 'base', label: 'Base', color: 'text-abwab-purple' },
    { key: 'downside', label: 'Downside', color: 'text-red-400' },
  ]
  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      {cards.map(c => (
        <div key={c.key} className="bg-abwab-card border border-abwab-border rounded-lg p-4">
          <div className={`text-xs font-medium mb-2 ${c.color}`}>
            {c.label} ({macroMultipliers[c.key].toFixed(2)}×)
          </div>
          <div className="text-2xl font-semibold text-white leading-none">{formatSAR(scenarioTotals[c.key], true)}</div>
          <div className="text-xs text-abwab-muted mt-1">Full-year ECL</div>
        </div>
      ))}
    </div>
  )
}

function StageBreakdown({ stageBreakdown }) {
  const chartData = stageBreakdown.map(row => ({
    stage: `Stage ${row.stage}`,
    stageNum: row.stage,
    balance: row.balance,
    ecl: row.ecl,
  }))

  return (
    <div className="mb-8">
      <div className="bg-abwab-card border border-abwab-border rounded-lg p-4 mb-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 8, right: 40, left: 10, bottom: 0 }} barCategoryGap="30%" barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
            <XAxis dataKey="stage" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} />
            <YAxis
              yAxisId="balance"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`}
              axisLine={false} tickLine={false}
              label={{ value: 'Balance (SAR)', angle: -90, position: 'insideLeft', fill: '#6B7280', fontSize: 10, dy: 50 }}
            />
            <YAxis
              yAxisId="ecl"
              orientation="right"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickFormatter={v => `${(v / 1_000).toFixed(0)}K`}
              axisLine={false} tickLine={false}
              label={{ value: 'ECL (SAR)', angle: 90, position: 'insideRight', fill: '#6B7280', fontSize: 10, dy: -30 }}
            />
            <Tooltip
              contentStyle={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
              formatter={(value, name) => [formatSAR(value), name === 'balance' ? 'Balance' : 'ECL']}
            />
            <Bar yAxisId="balance" dataKey="balance" radius={[3, 3, 0, 0]}>
              {chartData.map(row => <Cell key={row.stage} fill={STAGE_COLORS[row.stageNum]} fillOpacity={0.3} />)}
            </Bar>
            <Bar yAxisId="ecl" dataKey="ecl" radius={[3, 3, 0, 0]}>
              {chartData.map(row => <Cell key={row.stage} fill={STAGE_COLORS[row.stageNum]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-6 mt-2 text-xs text-abwab-muted justify-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-abwab-muted inline-block opacity-30" />
            Balance (left axis)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-abwab-muted inline-block" />
            ECL (right axis)
          </span>
        </div>
      </div>

      <div className="border border-abwab-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-5 gap-4 px-4 py-2 border-b border-abwab-border bg-abwab-card">
          {['Stage', 'Balance (SAR)', 'ECL (SAR)', 'ECL Rate', 'Recovery rate assumed'].map(h => (
            <span key={h} className="text-xs text-abwab-muted font-medium uppercase tracking-wide">{h}</span>
          ))}
        </div>
        {stageBreakdown.map(row => (
          <div key={row.stage} className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-abwab-border last:border-0 items-center">
            <span className="text-sm font-semibold" style={{ color: STAGE_COLORS[row.stage] }}>Stage {row.stage}</span>
            <span className="text-sm text-white font-mono">{formatSAR(row.balance)}</span>
            <span className="text-sm text-white font-mono">{formatSAR(row.ecl)}</span>
            <span className="text-sm text-abwab-muted">{(row.eclRate * 100).toFixed(2)}%</span>
            <span className="text-sm text-abwab-muted">{(row.recoveryRateAssumed * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SensitivityTable({ sensitivity }) {
  return (
    <div className="border border-abwab-border rounded-lg overflow-hidden h-full">
      <div className="grid grid-cols-[2fr_1fr] gap-4 px-4 py-2 border-b border-abwab-border bg-abwab-card">
        <span className="text-xs text-abwab-muted font-medium uppercase tracking-wide">Shock</span>
        <span className="text-xs text-abwab-muted font-medium uppercase tracking-wide">ECL impact</span>
      </div>
      {sensitivity.map(row => (
        <div key={row.key} className="grid grid-cols-[2fr_1fr] gap-4 px-4 py-3 border-b border-abwab-border last:border-0 items-center">
          <span className="text-sm text-white">{row.label}</span>
          <span className={`text-sm font-mono font-semibold ${row.impact >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {row.impact >= 0 ? '+' : ''}{formatSAR(row.impact, true)}
          </span>
        </div>
      ))}
    </div>
  )
}

function CoverageRatioCard({ coverageRatio }) {
  return (
    <div className="bg-abwab-card border border-abwab-border rounded-lg p-6 flex flex-col justify-center h-full">
      <div className="text-xs text-abwab-muted mb-2">Stage 3 coverage ratio</div>
      <div className="text-3xl font-semibold text-white leading-none mb-1">{(coverageRatio * 100).toFixed(1)}%</div>
      <div className="text-xs text-abwab-muted">Stage 3 ECL ÷ Stage 3 balance</div>
    </div>
  )
}

function StageMigrationTable({ matrix }) {
  const maxOpacity = 0.55
  return (
    <div className="max-w-sm">
      <div className="border border-abwab-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-4 text-xs">
          <div className="px-2 py-1.5 bg-abwab-card" />
          {[1, 2, 3].map(to => (
            <div key={to} className="px-2 py-1.5 bg-abwab-card text-abwab-muted text-center font-medium">
              To S{to}
            </div>
          ))}
          {matrix.map(row => (
            <Fragment key={row.from}>
              <div className="px-2 py-1.5 bg-abwab-card text-abwab-muted font-medium">S{row.from}</div>
              {[row.to1, row.to2, row.to3].map((value, i) => (
                <div
                  key={i}
                  className="px-2 py-1.5 text-center text-white font-mono"
                  style={{ backgroundColor: `rgba(139, 92, 246, ${(value * maxOpacity).toFixed(2)})` }}
                >
                  {(value * 100).toFixed(0)}%
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

function QuarterlyTrendChart({ quarterly }) {
  return (
    <div className="bg-abwab-card border border-abwab-border rounded-lg p-4 mb-8">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={quarterly} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
          <XAxis dataKey="quarter" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} />
          <YAxis
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            tickFormatter={v => `${v.toFixed(1)}M`}
            axisLine={false} tickLine={false}
          />
          <Tooltip
            contentStyle={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
            formatter={(value, name) => [`SAR ${value.toFixed(2)}M`, name]}
          />
          <Line type="monotone" dataKey="Upside" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Base" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Downside" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-3 text-xs text-abwab-muted justify-center">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Upside</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-abwab-purple inline-block" />Base</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />Downside</span>
      </div>
    </div>
  )
}

// ─── Main export ───────────────────────────────────────────────────────────────

export default function ECLSimulation({ onBack }) {
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [macroMultipliers, setMacroMultipliers] = useState({
    upside: DEFAULT_SCENARIOS.upside.multiplier,
    base: DEFAULT_SCENARIOS.base.multiplier,
    downside: DEFAULT_SCENARIOS.downside.multiplier,
  })
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS)
  const [recoveryRates, setRecoveryRates] = useState(DEFAULT_RECOVERY_RATES)
  const [sicrThresholdDays, setSicrThresholdDays] = useState(DEFAULT_SICR_THRESHOLD_DAYS)
  const [approvalPdCutoff, setApprovalPdCutoff] = useState(DEFAULT_APPROVAL_PD_CUTOFF)
  const [growthRate, setGrowthRate] = useState(DEFAULT_GROWTH_RATE)

  function updateWeight(key, newValue) {
    setWeights(prev => {
      const clamped = Math.max(0, Math.min(100, newValue))
      const otherKeys = ['upside', 'base', 'downside'].filter(k => k !== key)
      const remaining = 100 - clamped
      const otherSum = prev[otherKeys[0]] + prev[otherKeys[1]]
      const next = { ...prev, [key]: clamped }
      if (otherSum === 0) {
        next[otherKeys[0]] = remaining / 2
        next[otherKeys[1]] = remaining / 2
      } else {
        next[otherKeys[0]] = Math.round((prev[otherKeys[0]] / otherSum) * remaining)
        next[otherKeys[1]] = remaining - next[otherKeys[0]]
      }
      return next
    })
  }

  const recoveryFrac = useMemo(
    () => ({ unsecured: recoveryRates.unsecured / 100, secured: recoveryRates.secured / 100 }),
    [recoveryRates]
  )
  const weightFrac = useMemo(
    () => ({ upside: weights.upside / 100, base: weights.base / 100, downside: weights.downside / 100 }),
    [weights]
  )

  const effectiveSegments = useMemo(() => buildEffectiveSegments({
    baseSegments: BASE_SEGMENTS,
    growthRatePct: growthRate,
    approvalPdCutoff: approvalPdCutoff / 100,
    growthSectors: GROWTH_SECTORS,
    dpdThresholdDays: sicrThresholdDays,
    defaultThresholdDays: DEFAULT_SICR_THRESHOLD_DAYS,
    sicrMigrationPct: SICR_MIGRATION_PCT_PER_15_DAYS,
  }), [growthRate, approvalPdCutoff, sicrThresholdDays])

  const scenarioTotals = useMemo(() => ({
    upside: computeScenarioECL(effectiveSegments, macroMultipliers.upside, recoveryFrac),
    base: computeScenarioECL(effectiveSegments, macroMultipliers.base, recoveryFrac),
    downside: computeScenarioECL(effectiveSegments, macroMultipliers.downside, recoveryFrac),
  }), [effectiveSegments, macroMultipliers, recoveryFrac])

  const blended = blendScenarios(scenarioTotals, weightFrac)

  const stageBreakdown = useMemo(
    () => computeStageBreakdown(effectiveSegments, macroMultipliers.base, recoveryFrac),
    [effectiveSegments, macroMultipliers.base, recoveryFrac]
  )

  const coverageRatio = useMemo(
    () => computeCoverageRatio(effectiveSegments, macroMultipliers.base, recoveryFrac),
    [effectiveSegments, macroMultipliers.base, recoveryFrac]
  )

  const quarterly = useMemo(() => QUARTERS.map((q, i) => ({
    quarter: q,
    Upside: computeQuarterlyECL(effectiveSegments, macroMultipliers.upside, recoveryFrac, i + 1) / 1_000_000,
    Base: computeQuarterlyECL(effectiveSegments, macroMultipliers.base, recoveryFrac, i + 1) / 1_000_000,
    Downside: computeQuarterlyECL(effectiveSegments, macroMultipliers.downside, recoveryFrac, i + 1) / 1_000_000,
  })), [effectiveSegments, macroMultipliers, recoveryFrac])

  const sensitivity = useMemo(
    () => computeSensitivity(effectiveSegments, macroMultipliers, weightFrac, recoveryFrac, SENSITIVITY_SHOCKS),
    [effectiveSegments, macroMultipliers, weightFrac, recoveryFrac]
  )

  return (
    <div className="p-6 max-w-6xl">

      <button
        onClick={onBack}
        className="text-sm text-abwab-muted hover:text-white mb-6 flex items-center gap-1 transition-colors"
      >
        ← Back to Risk Decisioning
      </button>

      <h1 className="text-2xl font-semibold text-white mb-1">ECL Simulation</h1>
      <p className="text-sm text-abwab-muted mb-8">
        Forward-looking IFRS 9 expected credit loss, projected across three macro scenarios on a segment-level portfolio.
      </p>

      <WhatIfControls
        collapsed={panelCollapsed}
        onToggleCollapse={() => setPanelCollapsed(p => !p)}
        macroMultipliers={macroMultipliers}
        setMacroMultipliers={setMacroMultipliers}
        weights={weights}
        updateWeight={updateWeight}
        recoveryRates={recoveryRates}
        setRecoveryRates={setRecoveryRates}
        sicrThresholdDays={sicrThresholdDays}
        setSicrThresholdDays={setSicrThresholdDays}
        approvalPdCutoff={approvalPdCutoff}
        setApprovalPdCutoff={setApprovalPdCutoff}
        growthRate={growthRate}
        setGrowthRate={setGrowthRate}
      />

      <SectionLabel>Headline Forecast</SectionLabel>
      <HeroMetric blended={blended} scenarioTotals={scenarioTotals} />

      <SectionLabel>Scenario Comparison</SectionLabel>
      <ScenarioCards scenarioTotals={scenarioTotals} macroMultipliers={macroMultipliers} />

      <SectionLabel>Stage Breakdown</SectionLabel>
      <StageBreakdown stageBreakdown={stageBreakdown} />

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <SectionLabel>Stage Migration</SectionLabel>
          <StageMigrationTable matrix={STAGE_MIGRATION_MATRIX} />
        </div>
        <div>
          <SectionLabel>Coverage Ratio</SectionLabel>
          <CoverageRatioCard coverageRatio={coverageRatio} />
        </div>
      </div>

      <SectionLabel>Quarterly Trend</SectionLabel>
      <QuarterlyTrendChart quarterly={quarterly} />

      <SectionLabel>Sensitivity Table</SectionLabel>
      <SensitivityTable sensitivity={sensitivity} />

    </div>
  )
}
