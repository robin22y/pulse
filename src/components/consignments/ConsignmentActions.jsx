import { useState } from 'react'
import { supabase } from '../../utils/supabaseClient.js'
import { FileText, DollarSign, CheckCircle, Clock } from 'lucide-react'
import PaymentModal from './PaymentModal.jsx'

const ConsignmentActions = ({ consignment, onUpdated }) => {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleMarkBilled = async () => {
    if (consignment.billing_status === 'billed') return
    if (!window.confirm('Mark this DC as billed?')) return
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('update_billing_status', {
        p_consignment_id: consignment.id,
        p_billing_status: 'billed',
      })
      if (error) throw error
      if (data?.success === false) throw new Error(data?.error || 'Failed to mark as billed')
      window.alert('DC marked as billed successfully!')
      onUpdated?.()
    } catch (err) {
      window.alert('Failed to update: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={handleMarkBilled}
        disabled={loading || consignment.billing_status === 'billed'}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
          consignment.billing_status === 'billed'
            ? 'bg-green-100 text-green-700 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {consignment.billing_status === 'billed' ? (
          <>
            <CheckCircle size={18} /> Billed
          </>
        ) : (
          <>
            <FileText size={18} /> Mark Billed
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => setPaymentModalOpen(true)}
        disabled={consignment.payment_status === 'received'}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
          consignment.payment_status === 'received'
            ? 'bg-green-100 text-green-700 cursor-not-allowed'
            : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg'
        }`}
      >
        {consignment.payment_status === 'received' ? (
          <>
            <CheckCircle size={18} /> Paid
          </>
        ) : (
          <>
            <DollarSign size={18} /> Cash Received
          </>
        )}
      </button>

      {consignment.billing_status === 'pending' && consignment.payment_status === 'pending' && (
        <span className="inline-flex items-center gap-2 rounded-lg bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700">
          <Clock size={18} /> Pending
        </span>
      )}

      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        consignment={consignment}
        onSuccess={() => {
          setPaymentModalOpen(false)
          onUpdated?.()
        }}
      />
    </div>
  )
}

export default ConsignmentActions
