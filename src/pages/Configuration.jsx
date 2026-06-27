import { useState, useEffect } from 'react'
import productsDefault from '../data/products.json'
import { formatSAR } from '../utils/formatters.js'

const STORAGE_KEY = 'abwab_products'

function loadConfig() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try { return JSON.parse(saved) } catch { return productsDefault }
  }
  return JSON.parse(JSON.stringify(productsDefault))
}

function saveConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

const PRODUCT_OPTIONS = [
  { key: 'sme_working_capital',  label: 'SME Working Capital Facility' },
  { key: 'invoice_discounting',  label: 'Invoice Discounting' },
  { key: 'supply_chain_finance', label: 'Supply Chain Finance' },
  { key: 'asset_finance',        label: 'Asset Finance' },
  { key: 'trade_finance',        label: 'Trade Finance' },
  { key: 'overdraft',            label: 'Business Overdraft' },
]

const OPERATOR_LABELS = {
  gte: 'Minimum',
  lte: 'Maximum',
  eq:  'Must equal',
}

const BANDS = ['A', 'B', 'C', 'D', 'E']

const BAND_COLORS = {
  A: { bg: 'bg-emerald-950', text: 'text-emerald-400', border: 'border-emerald-800' },
  B: { bg: 'bg-emerald-900', text: 'text-emerald-300', border: 'border-emerald-700' },
  C: { bg: 'bg-amber-950',   text: 'text-amber-400',   border: 'border-amber-800' },
  D: { bg: 'bg-orange-950',  text: 'text-orange-400',  border: 'border-orange-800' },
  E: { bg: 'bg-red-950',     text: 'text-red-400',     border: 'border-red-800' },
}

const HYPOTHETICAL = {
  annual_revenue_sar:  5_000_000,
  working_capital_sar: 1_200_000,
}

const PD_MIDPOINTS = { A: 0.015, B: 0.05, C: 0.095, D: 0.16, E: 0.25 }
const LGD_FIXED = 0.40

// ─── Policy Tab ────────────────────────────────────────────────────────────────

function PolicyTab({ product, selectedProduct, config, setConfig, saveConfig, showSaveMessage }) {
  const [rules, setRules] = useState(() => JSON.parse(JSON.stringify(product.policy_rules)))

  useEffect(() => {
    setRules(JSON.parse(JSON.stringify(product.policy_rules)))
  }, [selectedProduct])

  function updateThreshold(index, value) {
    const updated = [...rules]
    const parsed = isNaN(Number(value)) ? value : Number(value)
    updated[index] = { ...updated[index], threshold: parsed }
    setRules(updated)
  }

  function toggleActive(index) {
    const updated = [...rules]
    updated[index] = { ...updated[index], active: !updated[index].active }
    setRules(updated)
  }

  function handleSave() {
    const updated = JSON.parse(JSON.stringify(config))
    updated.products[selectedProduct].policy_rules = rules
    setConfig(updated)
    saveConfig(updated)
    showSaveMessage('Policy rules saved. Changes apply to all new assessments immediately.')
  }

  return (
    <div>
      <div className="border border-abwab-border rounded-lg overflow-hidden mb-4">
        <div className="grid grid-cols-[2fr_1.5fr_1fr_1.5fr_1fr] gap-4 px-4 py-3 border-b border-abwab-border">
          {['Rule', 'Data Source', 'Operator', 'Threshold', 'Active'].map(h => (
            <span key={h} className="text-xs text-abwab-muted font-medium uppercase tracking-wide">{h}</span>
          ))}
        </div>
        {rules.map((rule, i) => (
          <div
            key={rule.name}
            className={`grid grid-cols-[2fr_1.5fr_1fr_1.5fr_1fr] gap-4 px-4 py-3 border-b border-abwab-border last:border-0 items-center ${!rule.active ? 'opacity-50' : ''}`}
          >
            <span className="text-sm text-white">{rule.name}</span>
            <span className="text-sm text-abwab-muted">{rule.data_source}</span>
            <span className="text-sm text-abwab-muted">{OPERATOR_LABELS[rule.operator] || rule.operator}</span>
            <input
              type={typeof rule.threshold === 'number' ? 'number' : 'text'}
              value={rule.threshold}
              onChange={e => updateThreshold(i, e.target.value)}
              className="bg-abwab-input border border-abwab-border text-white text-sm rounded px-2 py-1 outline-none focus:border-abwab-purple transition-colors w-full"
            />
            <div className="flex items-center">
              <button
                onClick={() => toggleActive(i)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${rule.active ? 'bg-abwab-purple' : 'bg-abwab-border'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${rule.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={handleSave}
        className="bg-abwab-purple text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-purple-600 transition-colors"
      >
        Save Rules
      </button>
    </div>
  )
}

// ─── Pricing Tab ───────────────────────────────────────────────────────────────

function PricingTab({ product, selectedProduct, config, setConfig, saveConfig, showSaveMessage }) {
  const [costOfCapital, setCostOfCapital] = useState(config.institution.cost_of_capital)
  const [servicingCost, setServicingCost] = useState(product.pricing.servicing_cost)
  const [margins, setMargins] = useState(() => ({ ...product.pricing.contribution_margin_by_band }))

  useEffect(() => {
    setServicingCost(product.pricing.servicing_cost)
    setMargins({ ...product.pricing.contribution_margin_by_band })
  }, [selectedProduct])

  function updateMargin(band, value) {
    setMargins(prev => ({ ...prev, [band]: Number(value) || 0 }))
  }

  function handleSave() {
    const updated = JSON.parse(JSON.stringify(config))
    updated.institution.cost_of_capital = costOfCapital
    updated.products[selectedProduct].pricing.servicing_cost = servicingCost
    updated.products[selectedProduct].pricing.contribution_margin_by_band = margins
    setConfig(updated)
    saveConfig(updated)
    showSaveMessage('Pricing parameters saved. Changes apply to all new assessments immediately.')
  }

  function previewRate(band) {
    const pd = PD_MIDPOINTS[band]
    const expectedLoss = pd * LGD_FIXED
    return (costOfCapital / 100) + (servicingCost / 100) + ((margins[band] || 0) / 100) + expectedLoss
  }

  return (
    <div className="space-y-6">

      <div>
        <div className="text-xs text-abwab-muted uppercase tracking-wide mb-3">
          Institution level — applies to all products
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-white min-w-40">Cost of capital (%)</label>
          <input
            type="number"
            value={costOfCapital}
            onChange={e => setCostOfCapital(Number(e.target.value))}
            step="0.1" min="0" max="20"
            className="bg-abwab-input border border-abwab-border text-white text-sm rounded px-3 py-1.5 outline-none focus:border-abwab-purple transition-colors w-28"
          />
        </div>
      </div>

      <div>
        <div className="text-xs text-abwab-muted uppercase tracking-wide mb-3">
          Product level — applies to selected product only
        </div>
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-white min-w-40">Servicing cost (%)</label>
          <input
            type="number"
            value={servicingCost}
            onChange={e => setServicingCost(Number(e.target.value))}
            step="0.1" min="0" max="10"
            className="bg-abwab-input border border-abwab-border text-white text-sm rounded px-3 py-1.5 outline-none focus:border-abwab-purple transition-colors w-28"
          />
        </div>

        <div className="text-sm text-white mb-2">Contribution margin by risk band (%)</div>
        <div className="border border-abwab-border rounded-lg overflow-hidden mb-4">
          <div className="grid grid-cols-[1fr_2fr] gap-4 px-4 py-2.5 border-b border-abwab-border">
            <span className="text-xs text-abwab-muted font-medium uppercase tracking-wide">Band</span>
            <span className="text-xs text-abwab-muted font-medium uppercase tracking-wide">Target Margin (%)</span>
          </div>
          {BANDS.map(band => {
            const colors = BAND_COLORS[band]
            return (
              <div key={band} className="grid grid-cols-[1fr_2fr] gap-4 px-4 py-2.5 border-b border-abwab-border last:border-0 items-center">
                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border w-fit ${colors.bg} ${colors.text} ${colors.border}`}>
                  Band {band}
                </span>
                <input
                  type="number"
                  value={margins[band] || 0}
                  onChange={e => updateMargin(band, e.target.value)}
                  step="0.1" min="0"
                  className="bg-abwab-input border border-abwab-border text-white text-sm rounded px-2 py-1 outline-none focus:border-abwab-purple transition-colors w-28"
                />
              </div>
            )
          })}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="bg-abwab-purple text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-purple-600 transition-colors"
      >
        Save Pricing
      </button>

      <div>
        <div className="text-sm font-medium text-white mb-1">Rate preview (illustrative)</div>
        <p className="text-xs text-abwab-muted mb-3">
          Indicative rates based on band midpoint PD and a fixed LGD of 40%. Actual rates vary by borrower.
        </p>
        <div className="border border-abwab-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-3 px-4 py-2.5 border-b border-abwab-border">
            {['Band', 'Indicative PD', 'Indicative Rate'].map(h => (
              <span key={h} className="text-xs text-abwab-muted font-medium uppercase tracking-wide">{h}</span>
            ))}
          </div>
          {BANDS.map(band => {
            const colors = BAND_COLORS[band]
            const rate = previewRate(band)
            return (
              <div key={band} className="grid grid-cols-3 px-4 py-2.5 border-b border-abwab-border last:border-0 items-center">
                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border w-fit ${colors.bg} ${colors.text} ${colors.border}`}>
                  Band {band}
                </span>
                <span className="text-sm text-abwab-muted">{(PD_MIDPOINTS[band] * 100).toFixed(1)}%</span>
                <span className="text-sm text-white font-mono">{(rate * 100).toFixed(2)}%</span>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

// ─── Sizing Tab ────────────────────────────────────────────────────────────────

function SizingTab({ product, selectedProduct, config, setConfig, saveConfig, showSaveMessage }) {
  const formula = product.limit_formula

  const [sizing, setSizing] = useState(() => ({
    low:    { ...formula.low_risk },
    medium: { ...formula.medium_risk },
    high:   { ...formula.high_risk },
  }))

  useEffect(() => {
    setSizing({
      low:    { ...product.limit_formula.low_risk },
      medium: { ...product.limit_formula.medium_risk },
      high:   { ...product.limit_formula.high_risk },
    })
  }, [selectedProduct])

  function update(tier, field, value) {
    setSizing(prev => ({
      ...prev,
      [tier]: { ...prev[tier], [field]: Number(value) || 0 },
    }))
  }

  function computeLimit(tier) {
    const s = sizing[tier]
    const fromRevenue = HYPOTHETICAL.annual_revenue_sar * s.revenue_pct
    const fromWC = HYPOTHETICAL.working_capital_sar * s.working_capital_pct
    const cap = s.cap_sar
    const candidates = [fromRevenue, fromWC, cap]
    return s.function === 'max' ? Math.max(...candidates) : Math.min(...candidates)
  }

  function handleSave() {
    const updated = JSON.parse(JSON.stringify(config))
    updated.products[selectedProduct].limit_formula.low_risk    = { ...sizing.low }
    updated.products[selectedProduct].limit_formula.medium_risk = { ...sizing.medium }
    updated.products[selectedProduct].limit_formula.high_risk   = { ...sizing.high }
    setConfig(updated)
    saveConfig(updated)
    showSaveMessage('Facility sizing rules saved. Changes apply to all new assessments immediately.')
  }

  const allBands = ['A', 'B', 'C', 'D', 'E']
  const highRiskBands = allBands.filter(
    b => !formula.low_risk_bands.includes(b) && !formula.medium_risk_bands.includes(b)
  )

  const TIERS = [
    { key: 'low',    label: 'Low Risk',    bands: formula.low_risk_bands.join(', '), formulaLabel: sizing.low.function    === 'max' ? 'Take highest' : 'Take lowest' },
    { key: 'medium', label: 'Medium Risk', bands: formula.medium_risk_bands.join(', '), formulaLabel: sizing.medium.function === 'max' ? 'Take highest' : 'Take lowest' },
    { key: 'high',   label: 'High Risk',   bands: highRiskBands.join(', '),          formulaLabel: sizing.high.function   === 'max' ? 'Take highest' : 'Take lowest' },
  ]

  return (
    <div className="space-y-6">

      <div className="bg-abwab-card border border-abwab-border rounded-lg px-4 py-3 text-sm text-abwab-muted">
        These parameters reflect your institution's current credit appetite for each risk tier.
        They were configured during onboarding and can be adjusted at any time. Changes take
        effect immediately on all new applications.
      </div>

      <div className="border border-abwab-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr_1fr] gap-3 px-4 py-2.5 border-b border-abwab-border">
          {['Risk Category', 'Bands', 'Revenue %', 'Working Capital %', 'Cap (SAR)', 'Formula'].map(h => (
            <span key={h} className="text-xs text-abwab-muted font-medium uppercase tracking-wide">{h}</span>
          ))}
        </div>
        {TIERS.map(tier => (
          <div key={tier.key} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr_1fr] gap-3 px-4 py-3 border-b border-abwab-border last:border-0 items-center">
            <span className="text-sm font-medium text-white">{tier.label}</span>
            <span className="text-sm text-abwab-muted">{tier.bands}</span>
            <input
              type="number"
              value={(sizing[tier.key].revenue_pct * 100).toFixed(0)}
              onChange={e => update(tier.key, 'revenue_pct', Number(e.target.value) / 100)}
              step="1" min="1" max="100"
              className="bg-abwab-input border border-abwab-border text-white text-sm rounded px-2 py-1 outline-none focus:border-abwab-purple transition-colors w-full"
            />
            <input
              type="number"
              value={(sizing[tier.key].working_capital_pct * 100).toFixed(0)}
              onChange={e => update(tier.key, 'working_capital_pct', Number(e.target.value) / 100)}
              step="1" min="1" max="100"
              className="bg-abwab-input border border-abwab-border text-white text-sm rounded px-2 py-1 outline-none focus:border-abwab-purple transition-colors w-full"
            />
            <input
              type="number"
              value={sizing[tier.key].cap_sar}
              onChange={e => update(tier.key, 'cap_sar', e.target.value)}
              step="50000" min="0"
              className="bg-abwab-input border border-abwab-border text-white text-sm rounded px-2 py-1 outline-none focus:border-abwab-purple transition-colors w-full"
            />
            <span className="text-xs text-abwab-muted">{tier.formulaLabel}</span>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        className="bg-abwab-purple text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-purple-600 transition-colors"
      >
        Save Facility Sizing
      </button>

      <div>
        <div className="text-sm font-medium text-white mb-1">Limit preview (illustrative)</div>
        <p className="text-xs text-abwab-muted mb-3">
          Based on a hypothetical borrower: annual revenue SAR 5,000,000 and working capital SAR 1,200,000. Actual limits will vary by borrower.
        </p>
        <div className="border border-abwab-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr] gap-3 px-4 py-2.5 border-b border-abwab-border">
            {['Risk Category', 'From Revenue', 'From Working Capital', 'Cap', 'Recommended Limit'].map(h => (
              <span key={h} className="text-xs text-abwab-muted font-medium uppercase tracking-wide">{h}</span>
            ))}
          </div>
          {TIERS.map(tier => {
            const s = sizing[tier.key]
            const fromRevenue = HYPOTHETICAL.annual_revenue_sar * s.revenue_pct
            const fromWC      = HYPOTHETICAL.working_capital_sar * s.working_capital_pct
            const limit       = computeLimit(tier.key)
            return (
              <div key={tier.key} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr] gap-3 px-4 py-2.5 border-b border-abwab-border last:border-0 items-center">
                <span className="text-sm text-white font-medium">{tier.label}</span>
                <span className="text-sm text-abwab-muted font-mono">{formatSAR(fromRevenue, true)}</span>
                <span className="text-sm text-abwab-muted font-mono">{formatSAR(fromWC, true)}</span>
                <span className="text-sm text-abwab-muted font-mono">{formatSAR(s.cap_sar, true)}</span>
                <span className="text-sm text-white font-semibold font-mono">{formatSAR(limit, true)}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-abwab-card border border-abwab-border rounded-lg px-4 py-3 text-sm text-abwab-muted">
        <span className="text-white font-medium">Need further customization?</span>{' '}
        The parameters above cover the standard facility sizing formula. For advanced customization such as adding
        new variables, changing the formula structure, or incorporating sector-specific limits, speak with your
        Abwab relationship manager. All customizations are versioned and auditable.
      </div>

    </div>
  )
}

// ─── Main export ───────────────────────────────────────────────────────────────

export default function Configuration({ onBack }) {
  const [config, setConfig] = useState(loadConfig)
  const [selectedProduct, setSelectedProduct] = useState('sme_working_capital')
  const [activeTab, setActiveTab] = useState('policy')
  const [saveMessage, setSaveMessage] = useState(null)

  const product = config.products[selectedProduct] || config.products['sme_working_capital']

  function showSaveMessage(text) {
    setSaveMessage(text)
    setTimeout(() => setSaveMessage(null), 3000)
  }

  return (
    <div className="p-6 max-w-5xl">

      <button
        onClick={onBack}
        className="text-sm text-abwab-muted hover:text-white mb-6 flex items-center gap-1 transition-colors"
      >
        ← Back to Risk Decisioning
      </button>

      <h1 className="text-2xl font-semibold text-white mb-1">Product Configuration</h1>
      <p className="text-sm text-abwab-muted mb-6">
        Product policy, pricing, and facility sizing parameters
      </p>

      <div className="mb-6">
        <label className="block text-xs text-abwab-muted uppercase tracking-wide mb-1.5">Product</label>
        <select
          value={selectedProduct}
          onChange={e => setSelectedProduct(e.target.value)}
          className="bg-abwab-card border border-abwab-border text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-abwab-purple transition-colors min-w-56"
        >
          {PRODUCT_OPTIONS.map(p => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
      </div>

      {saveMessage && (
        <div className="mb-4 bg-emerald-950 border border-emerald-800 rounded-lg px-4 py-2.5 text-emerald-400 text-sm">
          {saveMessage}
        </div>
      )}

      <div className="flex border-b border-abwab-border mb-6">
        {[
          { key: 'policy',  label: 'Policy Rules' },
          { key: 'pricing', label: 'Pricing Parameters' },
          { key: 'sizing',  label: 'Facility Sizing Rules' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'text-abwab-purple border-abwab-purple font-medium'
                : 'text-abwab-muted border-transparent hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'policy' && (
        <PolicyTab
          product={product}
          selectedProduct={selectedProduct}
          config={config}
          setConfig={setConfig}
          saveConfig={saveConfig}
          showSaveMessage={showSaveMessage}
        />
      )}
      {activeTab === 'pricing' && (
        <PricingTab
          product={product}
          selectedProduct={selectedProduct}
          config={config}
          setConfig={setConfig}
          saveConfig={saveConfig}
          showSaveMessage={showSaveMessage}
        />
      )}
      {activeTab === 'sizing' && (
        <SizingTab
          product={product}
          selectedProduct={selectedProduct}
          config={config}
          setConfig={setConfig}
          saveConfig={saveConfig}
          showSaveMessage={showSaveMessage}
        />
      )}

    </div>
  )
}
