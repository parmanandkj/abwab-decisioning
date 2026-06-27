import { RISK_BAND_COLORS, RISK_BAND_LABELS } from '../utils/formatters.js'

export default function RiskBand({ band }) {
  const color = RISK_BAND_COLORS[band] || '#9CA3AF'
  const label = RISK_BAND_LABELS[band] || 'Unknown'

  return (
    <div
      className="rounded-lg p-3 text-center border"
      style={{
        backgroundColor: `${color}22`,
        borderColor: color,
      }}
    >
      <div className="text-2xl font-bold" style={{ color }}>{band}</div>
      <div className="text-xs mt-1" style={{ color, opacity: 0.8 }}>{label}</div>
    </div>
  )
}
