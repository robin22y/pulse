import FluentCard from './FluentCard.jsx'
import PulseLogo from './PulseLogo.jsx'

const formatCurrency = (value) =>
  `₹${Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—'

const computeTotals = (items) =>
  items.reduce(
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

const InfoLine = ({ label, value }) =>
  value ? (
    <p className="text-sm text-slate-500">
      <span className="font-medium text-slate-700">{label}:</span> {value}
    </p>
  ) : null

const DCPreview = ({ company = {}, hospital = {}, branch = {}, dcNumber, items = [], payments = [], createdAt }) => {
  const totals = computeTotals(items)
  const grandTotal = totals.subtotal + totals.tax

  const companyCityLine = [company.company_city, company.company_pincode, company.company_state]
    .filter(Boolean)
    .join(' ')
  const hospitalCityLine = [hospital.city, hospital.pincode, hospital.state].filter(Boolean).join(' ')

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <PulseLogo size="default" variant="white" />
            <div className="text-right text-white">
              <h2 className="text-3xl font-bold uppercase tracking-[0.3em]">Delivery Challan</h2>
              <div className="mt-3 inline-flex flex-col gap-1 rounded-xl bg-white/20 px-4 py-2 text-left shadow-lg">
                <span className="text-xs uppercase tracking-[0.4em] text-blue-100">DC Number</span>
                <span className="text-lg font-semibold">{dcNumber}</span>
              </div>
              <p className="mt-3 text-sm text-blue-100/80">Issued on {formatDate(createdAt)}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-6 p-4 md:grid-cols-2 md:p-6">
          <div className="rounded-2xl bg-slate-50 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">From</h2>
            <div className="mt-3 space-y-1.5 text-sm text-slate-600">
              <p className="text-lg font-semibold text-slate-900">{company.company_name || 'Add your company in settings'}</p>
              <p>{company.company_address || 'Update your business address in settings'}</p>
              {companyCityLine ? <p>{companyCityLine}</p> : null}
              {company.company_gstin && <p className="text-sm text-slate-500">GSTIN: {company.company_gstin}</p>}
              {company.company_pan && <p className="text-sm text-slate-500">PAN: {company.company_pan}</p>}
              {company.company_drug_license && (
                <p className="text-sm text-slate-500">Drug Lic: {company.company_drug_license}</p>
              )}
              <InfoLine label="Phone" value={company.company_phone} />
              <InfoLine label="Email" value={company.company_email} />
              <InfoLine label="Website" value={company.company_website} />
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Bill To</h2>
            <div className="mt-3 space-y-1.5 text-sm text-slate-600">
              <p className="text-lg font-semibold text-slate-900">{hospital.name || 'Hospital Name'}</p>
              <p>{hospital.address || 'Hospital address line'}</p>
              {hospitalCityLine ? <p>{hospitalCityLine}</p> : null}
              {hospital.gstin && <p className="text-sm text-slate-500">GSTIN: {hospital.gstin}</p>}
              {hospital.drug_license_number && (
                <p className="text-sm text-slate-500">Drug Lic: {hospital.drug_license_number}</p>
              )}
              <InfoLine label="Contact" value={hospital.contact_person} />
              <InfoLine label="Phone" value={hospital.phone ?? hospital.contact_phone} />
              <InfoLine label="Email" value={hospital.email} />
              {branch?.name ? <p className="text-xs uppercase text-slate-400">Branch: {branch.name}</p> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 md:p-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="hidden px-4 py-3 text-center md:table-cell">Qty</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const qty = Number(item.quantity ?? 0)
                const price = Number(item.unit_price ?? 0)
                const total = qty * price
                const key = item.stock_item_id ?? `${item.product_id}-${item.batch_number ?? ''}`
                return (
                  <tr key={key} className="bg-white">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{item.item_name || item.brand_name || 'Unnamed Item'}</p>
                      <p className="text-xs text-slate-500 md:hidden">
                        Qty: {qty} × {formatCurrency(price)}
                      </p>
                      <p className="text-xs text-slate-400">Batch: {item.batch_number || '—'}</p>
                      <p className="hidden text-xs text-slate-400 md:block">
                        MFG: {item.manufacturing_date || '—'} · EXP: {item.expiry_date || '—'}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 text-center md:table-cell">{qty.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(total)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Tax</span>
            <span>{formatCurrency(totals.tax)}</span>
          </div>
          <div className="flex items-center justify-between text-base font-semibold text-slate-900">
            <span>Grand Total</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 md:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Payment History</h2>
        {payments.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No payments recorded yet.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="hidden px-4 py-3 text-left md:table-cell">Method</th>
                  <th className="hidden px-4 py-3 text-left md:table-cell">Reference</th>
                  <th className="hidden px-4 py-3 text-left md:table-cell">Received By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <tr key={payment.id} className="bg-white">
                    <td className="px-4 py-3">{formatDate(payment.payment_date)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(payment.payment_amount)}</td>
                    <td className="hidden px-4 py-3 capitalize md:table-cell">
                      {payment.payment_method?.replace('_', ' ') || '—'}
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-slate-500 md:table-cell">
                      {payment.payment_reference || '—'}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {payment.received_by_user?.full_name || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default DCPreview
