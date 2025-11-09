const CONFIGS = {
  delivery: {
    prepared: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Prepared' },
    in_transit: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Transit' },
    delivered: { bg: 'bg-green-100', text: 'text-green-700', label: 'Delivered' },
  },
  billing: {
    pending: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Billing Pending' },
    billed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Billed' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
  },
  payment: {
    pending: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Payment Pending' },
    received: { bg: 'bg-green-100', text: 'text-green-700', label: 'Paid' },
    overdue: { bg: 'bg-red-100', text: 'text-red-700', label: 'Overdue' },
  },
}

const StatusBadge = ({ type, status }) => {
  const config = CONFIGS[type]?.[status]
  if (!config) return null
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

export default StatusBadge
