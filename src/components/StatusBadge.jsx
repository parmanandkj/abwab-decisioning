const STATUS_STYLES = {
  Approved: {
    bg: 'bg-emerald-950',
    text: 'text-emerald-400',
    border: 'border-emerald-800',
  },
  Referred: {
    bg: 'bg-amber-950',
    text: 'text-amber-400',
    border: 'border-amber-800',
  },
  Declined: {
    bg: 'bg-red-950',
    text: 'text-red-400',
    border: 'border-red-800',
  },
  Qualified: {
    bg: 'bg-emerald-950',
    text: 'text-emerald-400',
    border: 'border-emerald-800',
  },
}

export default function StatusBadge({ status }) {
  const styles = STATUS_STYLES[status] || {
    bg: 'bg-gray-900',
    text: 'text-gray-400',
    border: 'border-gray-700',
  }

  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded border
        ${styles.bg} ${styles.text} ${styles.border}`}
    >
      {status}
    </span>
  )
}
