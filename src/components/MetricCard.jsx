export default function MetricCard({ label, value, delta, deltaColor = 'off' }) {
  const deltaColorClass = {
    off: 'text-abwab-muted',
    green: 'text-abwab-success',
    red: 'text-abwab-error',
  }[deltaColor] || 'text-abwab-muted'

  return (
    <div className="bg-abwab-card border border-abwab-border rounded-lg p-4">
      <div className="text-xs text-abwab-muted mb-2">{label}</div>
      <div className="text-2xl font-semibold text-white leading-none">{value}</div>
      {delta && (
        <div className={`text-xs mt-2 ${deltaColorClass}`}>{delta}</div>
      )}
    </div>
  )
}
