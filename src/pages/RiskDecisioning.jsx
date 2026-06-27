import { useState } from 'react'
import MetricCard from '../components/MetricCard.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import RiskBand from '../components/RiskBand.jsx'
import RateBreakdown from '../components/RateBreakdown.jsx'
import { formatSAR, getRiskBand, RISK_BAND_COLORS, RISK_BAND_LABELS } from '../utils/formatters.js'
import { runPolicyCheck } from '../engine/policyEngine.js'
import { calculateLimit } from '../engine/limitCalculator.js'
import { calculatePricing } from '../engine/pricingEngine.js'
import pipeline from '../data/pipeline.json'
import products from '../data/products.json'
import modelInsights from '../data/model_insights.json'
import case01 from '../data/sample_cases/case_01_approve.json'
import case02 from '../data/sample_cases/case_02_refer.json'
import case03 from '../data/sample_cases/case_03_decline.json'
import case04 from '../data/sample_cases/case_04_approve_trade.json'
import case05 from '../data/sample_cases/case_05_approve_logistics.json'

function loadProducts() {
  const saved = localStorage.getItem('abwab_products')
  if (saved) {
    try { return JSON.parse(saved) } catch { return products }
  }
  return products
}

const CASE_FILES = {
  'data/sample_cases/case_01_approve.json': case01,
  'data/sample_cases/case_02_refer.json': case02,
  'data/sample_cases/case_03_decline.json': case03,
  'data/sample_cases/case_04_approve_trade.json': case04,
  'data/sample_cases/case_05_approve_logistics.json': case05,
}

const FEATURE_DISPLAY = {
  past_dues_count:          { label: 'Past dues count',          format: v => String(Math.round(v)) },
  simah_score:              { label: 'SIMAH score',              format: v => String(Math.round(v)) },
  bounced_cheques_12m:      { label: 'Bounced cheques (12m)',    format: v => String(Math.round(v)) },
  leverage_ratio:           { label: 'Leverage ratio',           format: v => `${v.toFixed(2)}x` },
  debt_servicing_ratio:     { label: 'Debt servicing ratio',     format: v => `${(v * 100).toFixed(1)}%` },
  gross_profit_margin:      { label: 'Gross profit margin',      format: v => `${(v * 100).toFixed(1)}%` },
  cash_inflow_outflow_ratio:{ label: 'Cash inflow/outflow',      format: v => `${v.toFixed(2)}x` },
  return_on_assets:         { label: 'Return on assets',         format: v => `${(v * 100).toFixed(1)}%` },
  active_defaults:          { label: 'Active defaults',          format: v => String(Math.round(v)) },
  bounced_checks_count:     { label: 'Bounced checks count',     format: v => String(Math.round(v)) },
}

function runDecisioning(app, caseFile) {
  const pdScore = caseFile.pd_score
  const riskBand = getRiskBand(pdScore)
  const features = caseFile.features
  const borrower = caseFile.borrower

  const productsData = loadProducts()
  const productConfig = productsData.products[app.product_key]
    ?? productsData.products['sme_working_capital']
  const costOfCapital = productsData.institution.cost_of_capital

  const ruleResults = runPolicyCheck(features, productConfig.policy_rules)
  const allPassed = ruleResults.every(r => r.passed)

  if (!allPassed) {
    return {
      pdScore, riskBand, ruleResults,
      decision: 'decline',
      recommendedLimit: null,
      recommendedTenor: null,
      rateBreakdown: null,
      limitCapped: false,
      tenorCapped: false,
      productName: productConfig.display_name,
    }
  }

  const annualRevenue = borrower.annual_revenue_sar || 0
  const workingCapital = borrower.working_capital_sar || 0
  const calculatedLimit = calculateLimit(riskBand, annualRevenue, workingCapital, productConfig.limit_formula)
  const requestedLimit = app.facility_amount_sar
  const recommendedLimit = Math.min(calculatedLimit, requestedLimit)
  const limitCapped = recommendedLimit < requestedLimit

  const tenorCaps = { A: 60, B: 48, C: 36, D: 24, E: 12 }
  const maxTenor = tenorCaps[riskBand] || 12
  const recommendedTenor = Math.min(app.tenor_months, maxTenor)
  const tenorCapped = recommendedTenor < app.tenor_months

  const rateBreakdown = calculatePricing(
    pdScore, riskBand, features, recommendedLimit,
    productConfig.pricing, costOfCapital
  )

  const decision = ['A', 'B'].includes(riskBand) ? 'approve' : 'refer'

  return {
    pdScore, riskBand, ruleResults, decision,
    recommendedLimit, requestedLimit,
    recommendedTenor, requestedTenor: app.tenor_months,
    rateBreakdown, limitCapped, tenorCapped,
    productName: productConfig.display_name,
  }
}

function generateCreditMemo(app, caseFile, result) {
  const b = caseFile.borrower
  const f = caseFile.features
  const now = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  const decisionColors = { approve: '#10B981', refer: '#F59E0B', decline: '#EF4444' }
  const fg = decisionColors[result.decision] || '#F59E0B'
  const decisionLabel = result.decision.charAt(0).toUpperCase() + result.decision.slice(1)

  const summaryText = (() => {
    const base = `${b.business_name} (${b.industry_label}, ${b.region_label}) has applied for a ${result.productName} facility. The credit model assigned a probability of default of ${(result.pdScore * 100).toFixed(1)}%, placing the borrower in Risk Band ${result.riskBand}.`
    if (result.decision === 'decline') {
      return base + ' The application does not meet the mandatory eligibility criteria for this product.'
    }
    return base + ` The recommended credit limit is ${formatSAR(result.recommendedLimit, true)} at a risk-based rate of ${result.rateBreakdown.total_rate_pct.toFixed(2)}% per annum for a tenor of ${result.recommendedTenor} months. The application is ${result.decision === 'approve' ? 'recommended for approval' : 'referred for manual review'}.`
  })()

  const ruleRows = result.ruleResults.map(r => `
    <tr style="background:${r.passed ? '#f0fdf4' : '#fef2f2'}">
      <td>${r.rule}</td>
      <td>${r.data_source}</td>
      <td>${r.threshold}</td>
      <td>${r.actual ?? 'N/A'}</td>
      <td style="color:${r.passed ? '#10B981' : '#EF4444'};font-weight:600">${r.passed ? 'Pass' : 'Fail'}</td>
    </tr>
  `).join('')

  const recommendationSection = result.decision !== 'decline' ? `
    <h2>Recommendation</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin:16px 0">
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;text-align:center">
        <div style="font-size:11px;color:#6b7280;margin-bottom:4px">Recommended limit</div>
        <div style="font-size:20px;font-weight:700">${formatSAR(result.recommendedLimit, true)}</div>
        ${result.limitCapped ? `<div style="font-size:11px;color:#6b7280">Requested: ${formatSAR(result.requestedLimit, true)}</div>` : ''}
      </div>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;text-align:center">
        <div style="font-size:11px;color:#6b7280;margin-bottom:4px">Risk-based rate</div>
        <div style="font-size:20px;font-weight:700">${result.rateBreakdown.total_rate_pct.toFixed(2)}%</div>
      </div>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;text-align:center">
        <div style="font-size:11px;color:#6b7280;margin-bottom:4px">Tenor</div>
        <div style="font-size:20px;font-weight:700">${result.recommendedTenor} months</div>
        ${result.tenorCapped ? `<div style="font-size:11px;color:#6b7280">Requested: ${result.requestedTenor} months</div>` : ''}
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px">
      <thead>
        <tr>
          <th style="text-align:left;padding:7px 10px;background:#f5f5f5;font-weight:600;color:#333">Component</th>
          <th style="text-align:right;padding:7px 10px;background:#f5f5f5;font-weight:600;color:#333">Rate</th>
        </tr>
      </thead>
      <tbody>
        <tr><td style="padding:7px 10px;border-bottom:1px solid #eee">Base rate (cost of capital + servicing cost)</td><td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:right">${(result.rateBreakdown.cost_of_capital_pct + result.rateBreakdown.servicing_cost_pct).toFixed(2)}%</td></tr>
        <tr><td style="padding:7px 10px;border-bottom:1px solid #eee">Risk premium (contribution margin)</td><td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:right">${result.rateBreakdown.contribution_margin_pct.toFixed(2)}%</td></tr>
        <tr><td style="padding:7px 10px;border-bottom:1px solid #eee">Expected loss adjustment</td><td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:right">${result.rateBreakdown.expected_loss_pct.toFixed(2)}%</td></tr>
        <tr style="font-weight:700"><td style="padding:7px 10px">Total rate</td><td style="padding:7px 10px;text-align:right">${result.rateBreakdown.total_rate_pct.toFixed(2)}%</td></tr>
      </tbody>
    </table>
  ` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Credit Memo - ${app.business_name}</title>
<style>
  body{font-family:Arial,sans-serif;max-width:900px;margin:40px auto;padding:0 24px;color:#1a1a1a}
  h1{font-size:22px;margin-bottom:4px}
  h2{font-size:14px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.06em;margin:24px 0 8px;border-bottom:1px solid #e0e0e0;padding-bottom:4px}
  .decision{display:inline-block;padding:6px 18px;border-radius:6px;font-size:18px;font-weight:700;color:${fg};border:1px solid ${fg};margin-bottom:12px}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px}
  th{text-align:left;padding:7px 10px;background:#f5f5f5;font-weight:600;color:#333}
  td{padding:7px 10px;border-bottom:1px solid #eee}
  .summary{background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:12px 16px;font-size:13px;color:#1e40af;margin-bottom:8px}
  .meta{font-size:12px;color:#888;margin-top:2px}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px}
  .kv{margin-bottom:6px;font-size:13px}
  .kv strong{display:inline-block;min-width:180px;color:#555}
  .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e0e0e0;font-size:11px;color:#aaa}
</style>
</head>
<body>
<h1>${app.business_name}</h1>
<div class="meta">CR: ${app.cr_number} &nbsp;&middot;&nbsp; Ref: ${app.app_id} &nbsp;&middot;&nbsp; ${now} GST</div>
<div class="meta">${result.productName}</div>
<br>
<div class="decision">${decisionLabel}</div>
<h2>Executive Summary</h2>
<div class="summary">${summaryText}</div>
<h2>Borrower Profile</h2>
<div class="two-col">
  <div>
    <div class="kv"><strong>Business name:</strong> ${app.business_name}</div>
    <div class="kv"><strong>CR number:</strong> ${app.cr_number}</div>
    <div class="kv"><strong>Industry:</strong> ${b.industry_label}</div>
    <div class="kv"><strong>Region:</strong> ${b.region_label}</div>
  </div>
  <div>
    <div class="kv"><strong>Annual revenue:</strong> ${formatSAR(b.annual_revenue_sar)}</div>
    <div class="kv"><strong>Years in business:</strong> ${((f.business_age_months || 0) / 12).toFixed(1)} years</div>
    <div class="kv"><strong>Saudi ownership:</strong> ${(f.saudi_ownership_pct || 0).toFixed(0)}%</div>
    <div class="kv"><strong>Active facilities:</strong> ${f.number_of_facilities || 0}</div>
  </div>
</div>
<h2>Credit Risk Assessment</h2>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin:16px 0">
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;text-align:center">
    <div style="font-size:11px;color:#6b7280;margin-bottom:4px">Probability of Default</div>
    <div style="font-size:20px;font-weight:700">${(result.pdScore * 100).toFixed(1)}%</div>
  </div>
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;text-align:center">
    <div style="font-size:11px;color:#6b7280;margin-bottom:4px">Risk Band</div>
    <div style="font-size:20px;font-weight:700;color:${fg}">${result.riskBand}</div>
  </div>
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;text-align:center">
    <div style="font-size:11px;color:#6b7280;margin-bottom:4px">Decision</div>
    <div style="font-size:20px;font-weight:700;color:${fg}">${decisionLabel}</div>
  </div>
</div>
<h2>Financial Highlights</h2>
<div class="two-col">
  <div>
    <div class="kv"><strong>Gross profit margin:</strong> ${((f.gross_profit_margin || 0) * 100).toFixed(1)}%</div>
    <div class="kv"><strong>Net profit margin:</strong> ${((f.net_profit_margin || 0) * 100).toFixed(1)}%</div>
    <div class="kv"><strong>Current ratio:</strong> ${(f.current_ratio || 0).toFixed(2)}x</div>
    <div class="kv"><strong>Return on assets:</strong> ${((f.return_on_assets || 0) * 100).toFixed(1)}%</div>
  </div>
  <div>
    <div class="kv"><strong>Leverage ratio:</strong> ${(f.leverage_ratio || 0).toFixed(2)}x</div>
    <div class="kv"><strong>Debt servicing ratio:</strong> ${((f.debt_servicing_ratio || 0) * 100).toFixed(1)}%</div>
    <div class="kv"><strong>Cash inflow/outflow ratio:</strong> ${(f.cash_inflow_outflow_ratio || 0).toFixed(2)}x</div>
    <div class="kv"><strong>LCR:</strong> ${(f.lcr || 0).toFixed(2)}x</div>
  </div>
</div>
<h2>Policy Check - ${result.productName}</h2>
<table>
  <thead>
    <tr>
      <th>Rule</th><th>Data Source</th><th>Threshold</th><th>Actual Value</th><th>Result</th>
    </tr>
  </thead>
  <tbody>${ruleRows}</tbody>
</table>
${recommendationSection}
<h2>Audit Trail</h2>
<div class="kv"><strong>Assessment date:</strong> ${now} GST</div>
<div class="kv"><strong>Model:</strong> Abwab.ai Credit Model v1.0</div>
<div class="kv"><strong>Reference:</strong> ${app.app_id}</div>
<div class="kv"><strong>Generated by:</strong> Abwab Decisioning Engine</div>
<div class="footer">Generated by Abwab Decisioning Engine &nbsp;&middot;&nbsp; Powered by Abwab.ai &nbsp;&middot;&nbsp; For internal use only.</div>
</body>
</html>`
}

export default function RiskDecisioning() {
  const [selectedApp, setSelectedApp] = useState(null)
  const [selectedCaseFile, setSelectedCaseFile] = useState(null)

  // PIPELINE VIEW
  if (!selectedApp) {
    return (
      <div className="p-6">

        <div className="grid grid-cols-4 gap-4 mb-6">
          <MetricCard label="Total Qualified" value={pipeline.kpis.total_qualified} />
          <MetricCard label="Approved" value={pipeline.kpis.approved} />
          <MetricCard label="Referred" value={pipeline.kpis.referred} />
          <MetricCard label="Exceptions" value={pipeline.kpis.exceptions} />
        </div>

        <div className="border border-abwab-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1.5fr_1fr_1.5fr_1fr_1fr] gap-4 px-4 py-3 border-b border-abwab-border">
            {['Business Name', 'CR Number', 'Product', 'Amount', 'Tenor', 'Submitted', 'Status', 'Actions'].map(h => (
              <span key={h} className="text-xs text-abwab-muted font-medium uppercase tracking-wide">
                {h}
              </span>
            ))}
          </div>

          {pipeline.applications.map((app) => {
            const caseFile = CASE_FILES[app.case_file]
            return (
              <div
                key={app.app_id}
                className="grid grid-cols-[2fr_1.5fr_1.5fr_1.5fr_1fr_1.5fr_1fr_1fr] gap-4 px-4 py-3 border-b border-abwab-border last:border-0 hover:bg-abwab-card transition-colors items-center"
              >
                <div>
                  <div className="text-sm font-medium text-white">{app.business_name}</div>
                  <div className="text-xs text-abwab-muted mt-0.5">{app.app_id}</div>
                </div>
                <div className="text-sm text-abwab-muted">{app.cr_number}</div>
                <div className="text-sm text-abwab-muted">{app.product}</div>
                <div className="text-sm text-abwab-muted">{formatSAR(app.facility_amount_sar)}</div>
                <div className="text-sm text-abwab-muted">{app.tenor_months}m</div>
                <div className="text-sm text-abwab-muted">{app.submitted}</div>
                <div><StatusBadge status={app.status} /></div>
                <div>
                  <button
                    disabled={!caseFile}
                    onClick={() => {
                      if (!caseFile) return
                      setSelectedApp(app)
                      setSelectedCaseFile(caseFile)
                    }}
                    className={`text-xs border rounded px-3 py-1.5 transition-colors whitespace-nowrap ${
                      caseFile
                        ? 'text-abwab-purple border-abwab-purple hover:bg-abwab-purple-dim cursor-pointer'
                        : 'text-abwab-muted border-abwab-border cursor-not-allowed opacity-40'
                    }`}
                  >
                    View Details
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // DETAIL VIEW
  const result = runDecisioning(selectedApp, selectedCaseFile)
  const topFeatures = modelInsights.feature_importance.slice(0, 5)
  const features = selectedCaseFile.features
  const borrower = selectedCaseFile.borrower

  const handleDownload = () => {
    const html = generateCreditMemo(selectedApp, selectedCaseFile, result)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `credit_memo_${selectedApp.cr_number}_${new Date().toISOString().slice(0, 10)}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 max-w-5xl">

      <button
        onClick={() => { setSelectedApp(null); setSelectedCaseFile(null) }}
        className="text-sm text-abwab-muted hover:text-white mb-6 flex items-center gap-1 transition-colors"
      >
        ← Back to Pipeline
      </button>

      {/* Section 1: Application Summary */}
      <div className="mb-2">
        <h2 className="text-2xl font-semibold text-white">{selectedApp.business_name}</h2>
        <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded border bg-emerald-950 text-emerald-400 border-emerald-800">
          Qualified
        </span>
      </div>

      <div className="border-t border-abwab-border my-4" />

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          {[
            { label: 'REFERENCE', value: selectedApp.app_id },
            { label: 'PRODUCT',   value: selectedApp.product },
            { label: 'TENOR',     value: `${selectedApp.tenor_months} months` },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-xs text-abwab-muted uppercase tracking-wide mb-0.5">{label}</div>
              <div className="text-sm font-medium text-white">{value}</div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[
            { label: 'CR NUMBER', value: selectedApp.cr_number },
            { label: 'AMOUNT',    value: formatSAR(selectedApp.facility_amount_sar) },
            { label: 'SUBMITTED', value: selectedApp.submitted },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-xs text-abwab-muted uppercase tracking-wide mb-0.5">{label}</div>
              <div className="text-sm font-medium text-white">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Risk Decisioning Output */}
      <div className="border-t border-abwab-border my-4" />
      <h3 className="text-lg font-semibold text-white mb-4">Risk Decisioning</h3>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricCard label="Probability of Default" value={`${(result.pdScore * 100).toFixed(1)}%`} />
        <RiskBand band={result.riskBand} />
        <MetricCard label="Risk Category" value={RISK_BAND_LABELS[result.riskBand]} />
      </div>

      {/* Key Credit Indicators */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-white mb-3">Key Credit Indicators</h4>
        <div className="border border-abwab-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-abwab-border">
                <th className="text-left px-4 py-2 text-xs text-abwab-muted font-medium uppercase">Feature</th>
                <th className="text-right px-4 py-2 text-xs text-abwab-muted font-medium uppercase">Borrower Value</th>
                <th className="text-right px-4 py-2 text-xs text-abwab-muted font-medium uppercase">Direction</th>
              </tr>
            </thead>
            <tbody>
              {topFeatures.map((feat, i) => {
                const display = FEATURE_DISPLAY[feat.feature]
                const rawValue = features[feat.feature]
                const formattedValue = display && rawValue !== undefined
                  ? display.format(rawValue)
                  : rawValue !== undefined ? String(rawValue) : 'N/A'
                const label = display
                  ? display.label
                  : feat.feature.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                const isRisk = feat.direction === 'increases_risk'
                return (
                  <tr key={i} className="border-b border-abwab-border last:border-0">
                    <td className="px-4 py-2.5 text-abwab-muted">{label}</td>
                    <td className="px-4 py-2.5 text-right text-white font-mono">{formattedValue}</td>
                    <td className={`px-4 py-2.5 text-right text-xs font-medium ${isRisk ? 'text-red-400' : 'text-emerald-400'}`}>
                      {isRisk ? '↑ Increases risk' : '↓ Reduces risk'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Recommendation */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-white mb-3">Product Recommendation</h4>

        {result.decision === 'decline' ? (
          <div className="bg-red-950 border border-red-800 rounded-lg p-4 text-red-400 text-sm">
            <div className="font-semibold mb-1">
              Application declined — {result.productName}
            </div>
            <div className="text-red-300 text-xs">
              The following mandatory criteria were not met:{' '}
              {result.ruleResults.filter(r => !r.passed).map(r => r.rule).join(', ')}.
            </div>
          </div>
        ) : (
          <>
            <div className={`rounded-lg px-4 py-2.5 text-sm font-medium mb-4 border ${
              result.decision === 'approve'
                ? 'bg-emerald-950 border-emerald-800 text-emerald-400'
                : 'bg-amber-950 border-amber-800 text-amber-400'
            }`}>
              {result.decision === 'approve'
                ? `Recommendation: Approve — ${result.productName}`
                : `Recommendation: Refer for review — ${result.productName}`}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <MetricCard
                label="Recommended limit"
                value={formatSAR(result.recommendedLimit, true)}
                delta={result.limitCapped ? `Requested: ${formatSAR(result.requestedLimit, true)}` : null}
              />
              <MetricCard
                label="Risk-based rate"
                value={`${result.rateBreakdown.total_rate_pct.toFixed(2)}%`}
              />
              <MetricCard
                label="Tenor"
                value={`${result.recommendedTenor} months`}
                delta={result.tenorCapped ? `Requested: ${result.requestedTenor} months` : null}
              />
            </div>

            <RateBreakdown rateBreakdown={result.rateBreakdown} />

            {result.decision === 'refer' && (
              <div className="mt-4 bg-amber-950 border border-amber-800 rounded-lg p-4 text-amber-400 text-sm">
                This application requires manual review before a final decision is made.
                Review the key credit indicators above before proceeding.
              </div>
            )}
          </>
        )}
      </div>

      {/* Download button */}
      <div className="border-t border-abwab-border pt-4">
        <button
          onClick={handleDownload}
          className="bg-abwab-purple text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-purple-600 transition-colors"
        >
          Download Credit Memo
        </button>
      </div>

    </div>
  )
}
