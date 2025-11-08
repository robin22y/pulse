import { useEffect, useMemo, useState } from 'react'
import FluentCard from '../components/FluentCard.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../utils/supabaseClient.js'

const BillingEntry = () => {
  const { ownerId } = useAuth()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [unbilled, setUnbilled] = useState([])
  const [formState, setFormState] = useState({
    billed_amount: '',
    billed_date: '',
    invoice_file: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadUnbilled = async () => {
    if (!ownerId) return
    setLoading(true)
    setError('')
    try {
      const { data, error: fetchError } = await supabase
        .from('consignments')
        .select('id, dc_number, hospital:hospitals(name), total_value, status, billed_amount')
        .eq('owner_id', ownerId)
        .or('billed_amount.is.null,status.eq.delivered')
        .neq('status', 'closed')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setUnbilled(data ?? [])
    } catch (err) {
      setError(err.message ?? 'Unable to fetch consignments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUnbilled()
  }, [ownerId])

  const handleSearch = async (event) => {
    event.preventDefault()
    if (!query || !ownerId) return
    setError('')
    setSuccess('')
    try {
      const { data, error: searchError } = await supabase
        .from('consignments')
        .select(
          'id, dc_number, hospital:hospitals(name), total_value, status, billed_amount, billed_date, billed_invoice_url',
        )
        .eq('owner_id', ownerId)
        .eq('dc_number', query)
        .maybeSingle()

      if (searchError) throw searchError
      if (!data) {
        setError('Consignment not found.')
        setSelected(null)
      } else {
        setSelected(data)
        setFormState({
          billed_amount: data.billed_amount ?? '',
          billed_date: data.billed_date ?? '',
          invoice_file: null,
        })
      }
    } catch (err) {
      setError(err.message ?? 'Unable to search consignment.')
    }
  }

  const uploadInvoice = async (file, consignmentId) => {
    if (!file) return null
    const extension = file.name.split('.').pop()
    const path = `invoices/${consignmentId}-${Date.now()}.${extension}`
    const { data, error: uploadError } = await supabase.storage
      .from('billing-invoices')
      .upload(path, file, { upsert: true })
    if (uploadError) throw uploadError
    const { data: publicData } = supabase.storage
      .from('billing-invoices')
      .getPublicUrl(data.path)
    return publicData?.publicUrl ?? null
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!selected) return
    if (!formState.billed_amount || !formState.billed_date) {
      setError('Enter billed amount and date.')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      let invoiceUrl = selected.billed_invoice_url ?? null
      if (formState.invoice_file) {
        invoiceUrl = await uploadInvoice(formState.invoice_file, selected.id)
      }

      const { error: updateError } = await supabase
        .from('consignments')
        .update({
          billed_amount: Number(formState.billed_amount),
          billed_date: formState.billed_date,
          billed_invoice_url: invoiceUrl,
          status: 'closed',
        })
        .eq('id', selected.id)

      if (updateError) throw updateError

      setSuccess('Billing info saved and consignment closed.')
      setSelected(null)
      setQuery('')
      setFormState({
        billed_amount: '',
        billed_date: '',
        invoice_file: null,
      })
      await loadUnbilled()
    } catch (err) {
      setError(err.message ?? 'Unable to update billing.')
    } finally {
      setSaving(false)
    }
  }

  const totalOutstanding = useMemo(
    () =>
      unbilled.reduce(
        (total, row) => total + Number(row.total_value ?? 0) - Number(row.billed_amount ?? 0),
        0,
      ),
    [unbilled],
  )

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Billing Entry</h2>
          <p className="text-sm text-white/60">
            Settle consignments with invoice uploads and closure tracking.
          </p>
        </div>
      </header>

      {(error || success) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            error
              ? 'border-red-500/30 bg-red-500/10 text-red-200'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
          }`}
        >
          {error || success}
        </div>
      )}

      <FluentCard glass>
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            placeholder="Enter DC number"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="flex-1 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Search
          </button>
        </form>

        {selected && (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <FluentCard glass className="border border-white/10 bg-white/5">
              <h3 className="text-lg font-semibold text-white">Details</h3>
              <p className="mt-2 text-sm text-white/70">
                Hospital: <strong className="text-white">{selected.hospital?.name}</strong>
              </p>
              <p className="text-sm text-white/70">
                Total Value: ₹{Number(selected.total_value ?? 0).toLocaleString()}
              </p>
              <p className="text-sm text-white/70">Status: {selected.status}</p>
            </FluentCard>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="number"
                placeholder="Billed amount"
                value={formState.billed_amount}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, billed_amount: event.target.value }))
                }
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
              <input
                type="date"
                value={formState.billed_date}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, billed_date: event.target.value }))
                }
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-4 text-sm text-white/70 transition hover:border-primary hover:text-primary">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      invoice_file: event.target.files?.[0] ?? null,
                    }))
                  }
                />
                {formState.invoice_file
                  ? `Invoice: ${formState.invoice_file.name}`
                  : 'Upload Invoice (optional)'}
              </label>
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save & Close Consignment'}
              </button>
            </form>
          </div>
        )}
      </FluentCard>

      <FluentCard glass>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Unbilled Consignments</h3>
          <div className="rounded-2xl bg-primary/20 px-4 py-2 text-xs uppercase tracking-widest text-white/80">
            Outstanding ₹{totalOutstanding.toLocaleString()}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {unbilled.map((row) => (
            <button
              key={row.id}
              onClick={() => {
                setQuery(row.dc_number)
                setSelected(row)
                setFormState({
                  billed_amount: row.billed_amount ?? '',
                  billed_date: '',
                  invoice_file: null,
                })
              }}
              className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-primary/10"
            >
              <span className="text-sm font-semibold text-white">{row.dc_number}</span>
              <span className="text-xs text-white/50">
                {row.hospital?.name ?? 'Hospital'} • ₹{Number(row.total_value ?? 0).toLocaleString()}
              </span>
            </button>
          ))}
          {!unbilled.length && !loading && (
            <p className="text-center text-sm text-white/50">All consignments are closed.</p>
          )}
        </div>
      </FluentCard>

      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
        </div>
      )}
    </div>
  )
}

export default BillingEntry

