import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import eclReport from '../data/ecl_report.json'
import { formatSAR } from '../utils/formatters.js'

const BAND_COLORS = { A: '#10B981', B: '#34D399' }
const PRODUCT_COLOR = '#8B5CF6'

function SectionLabel({ children }) {
  return (
    <div className="text-xs font-medium text-abwab-muted uppercase tracking-wider mb-3">
      {children}
    </div>
  )
}

function KpiCard({ label, value, sub }) {
  return (
    <div className="bg-abwab-card border border-abwab-border rounded-lg p-4">
      <div className="text-xs text-abwab-muted mb-2">{label}</div>
      <div className="text-2xl font-semibold text-white leading-none">{value}</div>
      {sub && <div className="text-xs text-abwab-muted mt-1">{sub}</div>}
    </div>
  )
}

export default function ECLReport({ onBack }) {
  const { summary, by_risk_band, by_product, assumptions } = eclReport

  return (
    <div className="p-6 max-w-5xl">

      <button
        onClick={onBack}
        className="text-sm text-abwab-muted hover:text-white mb-6 flex items-center gap-1 transition-colors"
      >
        ← Back to Risk Decisioning
      </button>

      <h1 className="text-2xl font-semibold text-white mb-1">Portfolio ECL Report</h1>
      <p className="text-sm text-abwab-muted mb-8">
        Expected Credit Loss — 12-month horizon, approved applications only, {summary.as_of_date}
      </p>

      {/* ── Section 1: KPI cards ── */}
      <SectionLabel>Portfolio Summary</SectionLabel>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <KpiCard
          label="Total committed portfolio"
          value={formatSAR(summary.total_committed_sar)}
          sub={`${summary.approved_applications} approved applications`}
        />
        <KpiCard
          label="Total 12-month ECL"
          value={formatSAR(summary.total_ecl_sar)}
          sub={summary.time_horizon}
        />
        <KpiCard
          label="ECL as % of portfolio"
          value={`${summary.ecl_pct_of_portfolio}%`}
          sub="Portfolio-level loss rate"
        />
      </div>

      {/* ── Section 2: ECL by risk band ── */}
      <SectionLabel>ECL by Risk Band</SectionLabel>
      <div className="bg-abwab-card border border-abwab-border rounded-lg p-4 mb-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={by_risk_band}
            margin={{ top: 8, right: 40, left: 10, bottom: 0 }}
            barCategoryGap="30%"
            barGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
            <XAxis
              dataKey="band"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              axisLine={{ stroke: '#2A2A2A' }}
              tickLine={false}
            />
            <YAxis
              yAxisId="committed"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickFormatter={v => `${(v / 1000).toFixed(0)}K`}
              axisLine={false}
              tickLine={false}
              label={{ value: 'Committed (SAR)', angle: -90, position: 'insideLeft', fill: '#6B7280', fontSize: 10, dy: 50 }}
            />
            <YAxis
              yAxisId="ecl"
              orientation="right"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickFormatter={v => `${v.toLocaleString()}`}
              axisLine={false}
              tickLine={false}
              label={{ value: 'ECL (SAR)', angle: 90, position: 'insideRight', fill: '#6B7280', fontSize: 10, dy: -30 }}
            />
            <Tooltip
              contentStyle={{
                background: '#141414',
                border: '1px solid #2A2A2A',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '12px',
              }}
              formatter={(value, name) => [
                formatSAR(value),
                name === 'committed_sar' ? 'Committed' : 'ECL',
              ]}
            />
            <Bar yAxisId="committed" dataKey="committed_sar" name="committed_sar" radius={[3, 3, 0, 0]}>
              {by_risk_band.map(row => (
                <Cell key={row.band} fill={BAND_COLORS[row.band]} fillOpacity={0.35} />
              ))}
            </Bar>
            <Bar yAxisId="ecl" dataKey="ecl_sar" name="ecl_sar" radius={[3, 3, 0, 0]}>
              {by_risk_band.map(row => (
                <Cell key={row.band} fill={BAND_COLORS[row.band]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-6 mt-2 text-xs text-abwab-muted justify-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block opacity-35" />
            Committed exposure (left axis)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
            ECL (right axis)
          </span>
        </div>
      </div>

      <div className="border border-abwab-border rounded-lg overflow-hidden mb-8">
        <div className="grid grid-cols-5 gap-4 px-4 py-2 border-b border-abwab-border bg-abwab-card">
          {['Band', 'Applications', 'Committed (SAR)', 'ECL (SAR)', 'ECL Rate'].map(h => (
            <span key={h} className="text-xs text-abwab-muted font-medium uppercase tracking-wide">{h}</span>
          ))}
        </div>
        {by_risk_band.map(row => (
          <div key={row.band} className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-abwab-border last:border-0 items-center">
            <span
              className="text-sm font-semibold"
              style={{ color: BAND_COLORS[row.band] }}
            >
              Band {row.band}
            </span>
            <span className="text-sm text-abwab-muted">{row.application_count}</span>
            <span className="text-sm text-white font-mono">{formatSAR(row.committed_sar)}</span>
            <span className="text-sm text-white font-mono">{formatSAR(row.ecl_sar)}</span>
            <span className="text-sm text-abwab-muted">{row.ecl_pct}%</span>
          </div>
        ))}
      </div>

      {/* ── Section 3: ECL by product ── */}
      <SectionLabel>ECL by Product</SectionLabel>
      <div className="bg-abwab-card border border-abwab-border rounded-lg p-4 mb-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={by_product}
            layout="vertical"
            margin={{ top: 0, right: 40, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickFormatter={v => `${v.toLocaleString()}`}
              axisLine={{ stroke: '#2A2A2A' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="product"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              width={140}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: '#141414',
                border: '1px solid #2A2A2A',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '12px',
              }}
              formatter={v => [formatSAR(v), 'ECL (SAR)']}
            />
            <Bar dataKey="ecl_sar" fill={PRODUCT_COLOR} fillOpacity={0.8} radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="border border-abwab-border rounded-lg overflow-hidden mb-8">
        <div className="grid grid-cols-4 gap-4 px-4 py-2 border-b border-abwab-border bg-abwab-card">
          {['Product', 'Committed (SAR)', 'ECL (SAR)', 'ECL Rate'].map(h => (
            <span key={h} className="text-xs text-abwab-muted font-medium uppercase tracking-wide">{h}</span>
          ))}
        </div>
        {by_product.map(row => (
          <div key={row.product} className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-abwab-border last:border-0 items-center">
            <span className="text-sm text-white">{row.product}</span>
            <span className="text-sm text-white font-mono">{formatSAR(row.committed_sar)}</span>
            <span className="text-sm text-white font-mono">{formatSAR(row.ecl_sar)}</span>
            <span className="text-sm text-abwab-muted">{row.ecl_pct}%</span>
          </div>
        ))}
      </div>

      {/* ── Section 4: Assumptions ── */}
      <SectionLabel>Methodology and Assumptions</SectionLabel>
      <div className="bg-abwab-card border border-abwab-border rounded-lg p-5">
        <ul className="space-y-3">
          {assumptions.map((a, i) => (
            <li key={i} className="flex gap-3 text-sm text-abwab-muted">
              <span className="text-abwab-purple font-medium shrink-0">{i + 1}.</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </div>

    </div>
  )
}
