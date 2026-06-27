import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import modelInsights from '../data/model_insights.json'

// ─── Sub-components ────────────────────────────────────────────────────────────

function MetricWithDescription({ label, value, description }) {
  return (
    <div className="bg-abwab-card border border-abwab-border rounded-lg p-4">
      <div className="text-xs text-abwab-muted mb-2">{label}</div>
      <div className="text-2xl font-semibold text-white leading-none mb-2">{value}</div>
      <div className="text-xs text-abwab-muted leading-relaxed">{description}</div>
    </div>
  )
}

function ConfusionCell({ count, label, isCorrect }) {
  return (
    <div className={`rounded-lg p-4 border text-center ${
      isCorrect ? 'bg-emerald-950 border-emerald-800' : 'bg-red-950 border-red-800'
    }`}>
      <div className={`text-3xl font-bold mb-1 ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
        {count}
      </div>
      <div className={`text-xs leading-relaxed ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
        {label}
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div className="text-xs font-medium text-abwab-muted uppercase tracking-wider mb-3">
      {children}
    </div>
  )
}

// ─── Main export ───────────────────────────────────────────────────────────────

export default function CreditModel({ onBack }) {
  const meta     = modelInsights.metadata
  const perf     = modelInsights.performance
  const features = modelInsights.feature_importance
  const cutoff   = meta.cutoff_threshold

  const { true_positive: tp, true_negative: tn,
          false_positive: fp, false_negative: fn } = modelInsights.confusion_matrix

  const total      = tp + tn + fp + fn
  const accuracy    = ((tp + tn) / total * 100).toFixed(1)
  const precision   = (tp / (tp + fp) * 100).toFixed(1)
  const recall      = (tp / (tp + fn) * 100).toFixed(1)
  const specificity = (tn / (tn + fp) * 100).toFixed(1)

  const bins = modelInsights.score_distribution.bins.map(bin => {
    const midpoint = parseFloat(bin.range.split('-')[0]) + 0.025
    return { range: bin.range, count: bin.count, isApprove: midpoint < cutoff }
  })

  const featureChartData = [...features]
    .sort((a, b) => a.importance_pct - b.importance_pct)
    .map(f => ({
      name:      f.feature.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value:     f.importance_pct,
      direction: f.direction,
    }))

  return (
    <div className="p-6 max-w-5xl">

      <button
        onClick={onBack}
        className="text-sm text-abwab-muted hover:text-white mb-6 flex items-center gap-1 transition-colors"
      >
        ← Back to Risk Decisioning
      </button>

      <h1 className="text-2xl font-semibold text-white mb-1">Credit Risk Model</h1>

      <div className="bg-abwab-card border border-abwab-border rounded-lg px-4 py-3 text-sm text-abwab-muted mb-8">
        This page shows the credit model currently powering the Decisioning Engine.
        The model is trained and validated by Abwab.ai on the lender's portfolio.
        All performance metrics are calculated on the held-out test set.
      </div>

      {/* ── SECTION 1: Model Metadata ── */}
      <SectionLabel>Model Metadata</SectionLabel>
      <div className="grid grid-cols-3 gap-4 mb-2">
        <div className="bg-abwab-card border border-abwab-border rounded-lg p-4">
          <div className="text-xs text-abwab-muted mb-1">Algorithm</div>
          <div className="text-lg font-semibold text-white">{meta.algorithm}</div>
        </div>
        <div className="bg-abwab-card border border-abwab-border rounded-lg p-4">
          <div className="text-xs text-abwab-muted mb-1">Version</div>
          <div className="text-lg font-semibold text-white">{meta.version}</div>
        </div>
        <div className="bg-abwab-card border border-abwab-border rounded-lg p-4">
          <div className="text-xs text-abwab-muted mb-1">Training date</div>
          <div className="text-lg font-semibold text-white">{meta.training_date}</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-abwab-card border border-abwab-border rounded-lg p-4">
          <div className="text-xs text-abwab-muted mb-1">Total observations</div>
          <div className="text-lg font-semibold text-white">{meta.total_observations.toLocaleString()}</div>
        </div>
        <div className="bg-abwab-card border border-abwab-border rounded-lg p-4">
          <div className="text-xs text-abwab-muted mb-1">Portfolio default rate</div>
          <div className="text-lg font-semibold text-white">{meta.default_rate_pct}%</div>
        </div>
        <div className="bg-abwab-card border border-abwab-border rounded-lg p-4">
          <div className="text-xs text-abwab-muted mb-1">Cutoff threshold</div>
          <div className="text-lg font-semibold text-white">{meta.cutoff_threshold}</div>
        </div>
      </div>

      {/* ── SECTION 2: Performance Metrics ── */}
      <SectionLabel>Model Performance: Test Set Results</SectionLabel>
      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricWithDescription
          label="Gini Index"
          value={perf.gini}
          description="How well the model separates good borrowers from bad"
        />
        <MetricWithDescription
          label="ROC AUC"
          value={perf.roc_auc}
          description="Probability the model ranks a defaulter above a performer"
        />
        <MetricWithDescription
          label="KS Statistic"
          value={perf.ks_statistic}
          description="Maximum separation between good and bad score distributions"
        />
        <MetricWithDescription
          label="Calibration Error"
          value={perf.calibration_error}
          description="How closely predicted probabilities match observed default rates"
        />
      </div>

      {/* ── SECTION 3: Feature Importance + Score Distribution ── */}
      <SectionLabel>Feature Importance and Score Distribution</SectionLabel>
      <div className="grid grid-cols-2 gap-6 mb-8">

        {/* Feature importance chart */}
        <div className="bg-abwab-card border border-abwab-border rounded-lg p-4">
          <div className="text-sm font-medium text-white mb-1">Feature Importance</div>
          <div className="text-xs text-abwab-muted mb-4">
            Top features driving credit scores, ranked by contribution
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={featureChartData}
              layout="vertical"
              margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                tickFormatter={v => `${v}%`}
                axisLine={{ stroke: '#2A2A2A' }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                width={160}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={v => [`${v}%`, 'Importance']}
                contentStyle={{
                  background: '#141414',
                  border: '1px solid #2A2A2A',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                {featureChartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.direction === 'increases_risk' ? '#EF4444' : '#10B981'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3 text-xs text-abwab-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />
              Increases default risk
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
              Reduces default risk
            </span>
          </div>
        </div>

        {/* Score distribution histogram */}
        <div className="bg-abwab-card border border-abwab-border rounded-lg p-4">
          <div className="text-sm font-medium text-white mb-1">Score Distribution</div>
          <div className="text-xs text-abwab-muted mb-4">
            Distribution of PD scores across the test set
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={bins}
              margin={{ top: 0, right: 10, left: 0, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
              <XAxis
                dataKey="range"
                tick={{ fill: '#9CA3AF', fontSize: 9 }}
                angle={-45}
                textAnchor="end"
                interval={1}
                axisLine={{ stroke: '#2A2A2A' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={v => [v, 'Borrowers']}
                contentStyle={{
                  background: '#141414',
                  border: '1px solid #2A2A2A',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <ReferenceLine
                x={bins.find(b => !b.isApprove)?.range}
                stroke="#F59E0B"
                strokeWidth={2}
                strokeDasharray="4 2"
                label={{
                  value: `Cutoff ${cutoff}`,
                  fill: '#F59E0B',
                  fontSize: 10,
                  position: 'top',
                }}
              />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {bins.map((entry, i) => (
                  <Cell key={i} fill={entry.isApprove ? '#10B981' : '#EF4444'} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3 text-xs text-abwab-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block opacity-70" />
              Approve zone (below cutoff)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block opacity-70" />
              Decline zone (at or above cutoff)
            </span>
          </div>
        </div>

      </div>

      {/* ── SECTION 4: Confusion Matrix ── */}
      <SectionLabel>Confusion Matrix</SectionLabel>
      <p className="text-xs text-abwab-muted mb-4">{modelInsights.confusion_matrix.note}</p>
      <div className="grid grid-cols-2 gap-8 mb-8">

        {/* 2×2 matrix */}
        <div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div />
            <div className="grid grid-cols-2 gap-2">
              <div className="text-xs text-abwab-muted text-center pb-1">Predicted: Perform</div>
              <div className="text-xs text-abwab-muted text-center pb-1">Predicted: Default</div>
            </div>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <div className="flex flex-col justify-around">
              <div className="text-xs text-abwab-muted text-right pr-2">Actual: Perform</div>
              <div className="text-xs text-abwab-muted text-right pr-2">Actual: Default</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ConfusionCell count={tn} label="Correctly predicted as performing" isCorrect={true} />
              <ConfusionCell count={fp} label="Performing borrower incorrectly flagged" isCorrect={false} />
              <ConfusionCell count={fn} label="Default borrower missed" isCorrect={false} />
              <ConfusionCell count={tp} label="Correctly predicted as default" isCorrect={true} />
            </div>
          </div>
        </div>

        {/* Derived metrics */}
        <div className="space-y-3">
          {[
            { label: 'Accuracy',    value: `${accuracy}%`,    description: 'Overall correct predictions' },
            { label: 'Precision',   value: `${precision}%`,   description: 'Of predicted defaults, how many were real' },
            { label: 'Recall',      value: `${recall}%`,      description: 'Of actual defaults, how many were caught' },
            { label: 'Specificity', value: `${specificity}%`, description: 'Of actual performers, how many were correctly cleared' },
          ].map(({ label, value, description }) => (
            <div key={label} className="bg-abwab-card border border-abwab-border rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-abwab-muted">{label}</div>
                <div className="text-xs text-abwab-muted mt-0.5 opacity-70">{description}</div>
              </div>
              <div className="text-xl font-semibold text-white ml-4">{value}</div>
            </div>
          ))}

          <div className="bg-abwab-card border border-abwab-border rounded-lg px-4 py-3 text-xs text-abwab-muted leading-relaxed">
            At the current cutoff of{' '}
            <span className="text-amber-400 font-medium">{cutoff}</span>, the model identifies{' '}
            <span className="text-white font-medium">{recall}%</span> of actual defaults. The
            cutoff can be adjusted in the{' '}
            <span className="text-abwab-purple">Configuration</span> page to reflect the
            lender's risk appetite.
          </div>
        </div>

      </div>

    </div>
  )
}
