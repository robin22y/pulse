import FluentCard from './FluentCard.jsx'

const formatCurrency = (value) => `₹${Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

const computeTotals = (items) => {
  return items.reduce(
    (acc, item) => {
      const qty = Number(item.quantity ?? 0)
      const price = Number(item.unit_price ?? 0)
      const tax = Number(item.tax_percentage ?? 0)
      const subtotal = qty * price
      const taxAmount = subtotal * (tax / 100)
      acc.subtotal += subtotal
      acc.tax += taxAmount
      return acc
    },
    { subtotal: 0, tax: 0 },
  )
}

const InfoLine = ({ label, value }) =>
  value ? (
    <p className="text-sm text-gray-500">
      <span className="font-medium text-gray-600">{label}:</span> {value}
    </p>
  ) : null

const DCPreview = ({
  company = {},
  hospital = {},
  branch = {},
  dcNumber,
  items = [],
  payments = [],
  createdAt,
}) => {
  const totals = computeTotals(items)
  const grandTotal = totals.subtotal + totals.tax

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">From</h3>
          <div className="mt-3 space-y-1 text-sm text-gray-600">
            {company.company_logo_url && (
              <img
                src={company.company_logo_url}
                alt="Company Logo"
                className="mb-3 h-12 w-auto object-contain"
              />
            )}
            <p className="text-lg font-semibold text-gray-900">
              {company.company_name || 'Your Company Name'}
            </p>
            <p>{company.company_address || 'Company address line'}</p>
            <p>
              {[company.company_city, company.company_pincode, company.company_state]
                .filter(Boolean)
                .join(' ')}
            </p>
            {company.company_gstin && <p className="text-sm text-gray-500">GSTIN: {company.company_gstin}</p>}
            {company.company_pan && <p className="text-sm text-gray-500">PAN: {company.company_pan}</p>}
            {company.company_drug_license && (
              <p className="text-sm text-gray-500">Drug Lic: {company.company_drug_license}</p>
            )}
            <InfoLine label="Phone" value={company.company_phone} />
            <InfoLine label="Email" value={company.company_email} />
            <InfoLine label="Website" value={company.company_website} />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Bill To</h3>
          <div className="mt-3 space-y-1 text-sm text-gray-600">
            <p className="text-lg font-semibold text-gray-900">{hospital.name || 'Hospital Name'}</p>
            <p>{hospital.address || 'Hospital address line'}</p>
            <p>
              {[hospital.city, hospital.pincode, hospital.state].filter(Boolean).join(' ')}
            </p>
            {hospital.gstin && <p className="text-sm text-gray-500">GSTIN: {hospital.gstin}</p>}
            {hospital.drug_license_number && (
              <p className="text-sm text-gray-500">Drug Lic: {hospital.drug_license_number}</p>
            )}
            <InfoLine label="Contact" value={hospital.contact_person} />
            <InfoLine label="Phone" value={hospital.phone} />
            <InfoLine label="Email" value={hospital.email} />
            {branch?.name && (
              <p className="text-xs text-gray-400">Branch: {branch.name}</p>
            )}
          </div>
        </div>
      </div>

      <FluentCard glass={false} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500">Delivery Challan</p>
            <p className="text-lg font-semibold text-gray-900">DC Number: {dcNumber}</p>
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-gray-700">
            <thead className="bg-gray-50 text-xs uppercase tracking-widest text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-left">Batch</th>
                <th className="px-4 py-3 text-left">MFG / EXP</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Tax %</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => {
                const qty = Number(item.quantity ?? 0)
                const price = Number(item.unit_price ?? 0)
                const total = qty * price
                return (
                  <tr key={item.stock_item_id ?? `${item.product_id}-${item.batch_number ?? ''}`}>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {item.item_name || item.brand_name || 'Unnamed'}
                      <p className="text-xs text-gray-500">{item.size || 'No size'}</p>
                    </td>
                    <td className="px-4 py-3">{item.batch_number || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <div>MFG: {item.manufacturing_date || '—'}</div>
                      <div>EXP: {item.expiry_date || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-right">{qty.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(price)}</td>
                    <td className="px-4 py-3 text-right">
                      {item.tax_percentage != null ? `${item.tax_percentage}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(total)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 space-y-1 text-sm text-gray-700">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Tax</span>
            <span>{formatCurrency(totals.tax)}</span>
          </div>
          <div className="flex items-center justify-between text-base font-semibold text-gray-900">
            <span>Grand Total</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </FluentCard>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-xl font-bold text-gray-900">Payment History</h3>
        {payments.length === 0 ? (
          <p className="text-sm text-gray-500">No payments recorded yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm text-gray-700">
              <thead className="bg-gray-50 text-xs uppercase tracking-widest text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Method</th>
                  <th className="px-4 py-3 text-left">Reference</th>
                  <th className="px-4 py-3 text-left">Received By</th>
                  <th className="px-4 py-3 text-left">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-3">{formatDate(payment.payment_date)}</td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(payment.payment_amount)}</td>
                    <td className="px-4 py-3 capitalize">
                      {payment.payment_method?.replace('_', ' ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {payment.payment_reference || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {payment.received_by_user?.full_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{payment.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default DCPreview
