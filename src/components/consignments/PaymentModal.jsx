import { useState } from 'react'
import { supabase } from '../../utils/supabaseClient.js'
import { X, DollarSign } from 'lucide-react'

const formatCurrency = (value) => `₹${Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`

const PaymentModal = ({ isOpen, onClose, consignment, onSuccess }) => {
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen || !consignment) return null

  const resetForm = () => {
    setPaymentAmount('')
    setPaymentMethod('')
    setPaymentReference('')
    setPaymentDate(new Date().toISOString().split('T')[0])
    setNotes('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      const amount = parseFloat(paymentAmount)
      if (Number.isNaN(amount) || amount <= 0) throw new Error('Enter a valid payment amount.')
      if (!paymentMethod) throw new Error('Select payment method.')

      const { data, error } = await supabase.rpc('record_payment', {
        p_consignment_id: consignment.id,
        p_payment_amount: amount,
        p_payment_method: paymentMethod,
        p_payment_reference: paymentReference || null,
        p_payment_date: paymentDate,
        p_notes: notes || null,
      })

      if (error) throw error
      if (data?.success === false) throw new Error(data?.error || 'Failed to record payment')

      window.alert('Payment recorded successfully!')
      resetForm()
      onSuccess?.()
    } catch (err) {
      window.alert('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Record Payment</h2>
          <button
            onClick={() => {
              resetForm()
              onClose?.()
            }}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            type="button"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-4 rounded-xl border-l-4 border-blue-500 bg-blue-50 p-4">
          <p className="text-sm text-gray-600">DC Number</p>
          <p className="text-lg font-bold text-gray-900">{consignment.dc_number}</p>
          <p className="mt-2 text-sm text-gray-600">Hospital: {consignment.hospital?.name}</p>
          <p className="mt-2 text-xl font-bold text-blue-600">
            Amount: {formatCurrency(consignment.total_value)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              Payment Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
              required
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
              placeholder={consignment.total_value}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              required
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select method</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="upi">UPI</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">Payment Reference</label>
            <input
              type="text"
              value={paymentReference}
              onChange={(event) => setPaymentReference(event.target.value)}
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Cheque No / Transaction ID / UTR"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              required
              max={new Date().toISOString().split('T')[0]}
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">Notes</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                resetForm()
                onClose?.()
              }}
              className="flex-1 rounded-lg border-2 border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Recording…' : (
                <span className="flex items-center justify-center gap-2">
                  <DollarSign size={18} /> Record Payment
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PaymentModal
