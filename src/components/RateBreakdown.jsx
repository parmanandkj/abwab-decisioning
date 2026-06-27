export default function RateBreakdown({ rateBreakdown }) {
  const baseRate = rateBreakdown.cost_of_capital_pct + rateBreakdown.servicing_cost_pct

  const rows = [
    { label: 'Base rate (cost of capital + servicing cost)', value: baseRate },
    { label: 'Risk premium (contribution margin)', value: rateBreakdown.contribution_margin_pct },
    { label: 'Expected loss adjustment', value: rateBreakdown.expected_loss_pct },
    { label: 'Total rate', value: rateBreakdown.total_rate_pct, isTotal: true },
  ]

  return (
    <div className="border border-abwab-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-abwab-border">
            <th className="text-left px-4 py-2 text-xs text-abwab-muted font-medium uppercase">
              Component
            </th>
            <th className="text-right px-4 py-2 text-xs text-abwab-muted font-medium uppercase">
              Rate
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-abwab-border last:border-0 ${
                row.isTotal ? 'bg-abwab-card' : ''
              }`}
            >
              <td className={`px-4 py-2 ${row.isTotal ? 'font-semibold text-white' : 'text-abwab-muted'}`}>
                {row.label}
              </td>
              <td className={`px-4 py-2 text-right font-mono ${row.isTotal ? 'font-semibold text-white' : 'text-white'}`}>
                {row.value.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
