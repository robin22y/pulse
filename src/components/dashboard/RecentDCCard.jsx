import StatusBadge from '../StatusBadge.jsx'

const RecentDCCard = ({ dcNumber, createdAt, status, value }) => {
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
      <div>
        <p className="text-sm font-semibold text-white">{dcNumber}</p>
        <p className="text-xs text-white/60">{formattedDate}</p>
        {value ? <p className="text-xs text-white/80">₹{Number(value).toLocaleString()}</p> : null}
      </div>
      <StatusBadge type="delivery" status={status} />
    </div>
  )
}

export default RecentDCCard
