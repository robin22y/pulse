import { MapPin } from 'lucide-react'
import StatusBadge from '../StatusBadge.jsx'

const RecentDCCard = ({ dcNumber, createdAt, status, value, location }) => {
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

  const locationLabel = location?.trim()

  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-1 text-white">
        <p className="text-sm font-semibold">{dcNumber}</p>
        <p className="text-xs text-white/60">{formattedDate}</p>
        {value ? <p className="text-xs text-white/80">₹{Number(value).toLocaleString()}</p> : null}
        {locationLabel && (
          <p className="flex items-center gap-1 text-[11px] text-blue-200">
            <MapPin size={12} />
            <span className="truncate">{locationLabel}</span>
          </p>
        )}
      </div>
      <StatusBadge type="delivery" status={status} />
    </div>
  )
}

export default RecentDCCard
