import { useEffect, useMemo, useState } from 'react'
import FluentCard from '../components/FluentCard.jsx'
import { supabase } from '../utils/supabaseClient.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import PulseLogo from '../components/PulseLogo.jsx'
import PageHeader from '../components/layout/PageHeader.jsx'
import LogoUpload from '../components/LogoUpload.jsx'

const DC_DEFAULTS = {
  prefix: 'DC-',
  dateFormat: 'YYYYMMDD',
  separator: '-',
  sequenceDigits: 4,
  resetStrategy: 'daily',
  useStockManagement: true,
}

const COMPANY_DEFAULTS = {
  companyName: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  gstin: '',
  pan: '',
  drugLicense: '',
  phone: '',
  email: '',
  website: '',
  logoUrl: null,
}

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
const PHONE_REGEX = /^[+]?[0-9]{10,15}$/
const PINCODE_REGEX = /^[0-9]{6}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const formatPreview = ({ prefix, dateFormat, separator, sequenceDigits }) => {
  const sampleDate = new Date(2025, 0, 9)
  const mapFormat = {
    YYYYMMDD: sampleDate.toISOString().slice(0, 10).replace(/-/g, ''),
    YYMMDD: `${String(sampleDate.getFullYear()).slice(-2)}${String(sampleDate.getMonth() + 1).padStart(2, '0')}${String(sampleDate.getDate()).padStart(2, '0')}`,
    DDMMYYYY: `${String(sampleDate.getDate()).padStart(2, '0')}${String(sampleDate.getMonth() + 1).padStart(2, '0')}${sampleDate.getFullYear()}`,
  }
  const sequence = String(1).padStart(sequenceDigits || 4, '0')
  const parts = [prefix || '', mapFormat[dateFormat] || mapFormat.YYYYMMDD, sequence]
  return parts.filter(Boolean).join(separator ?? '-')
}

const SettingsPage = () => {
  const { ownerId } = useAuth()
  const [activeTab, setActiveTab] = useState('company')
  const [dcSettings, setDcSettings] = useState(DC_DEFAULTS)
  const [companyForm, setCompanyForm] = useState(COMPANY_DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [companySaving, setCompanySaving] = useState(false)
  const [dcSaving, setDcSaving] = useState(false)
  const [stockSaving, setStockSaving] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      if (!ownerId) return
      setLoading(true)
      setError('')
      try {
        const { data, error: fetchError } = await supabase
          .from('owner_settings')
          .select(
            '*',
          )
          .eq('owner_id', ownerId)
          .maybeSingle()

        if (fetchError) throw fetchError

        setDcSettings({
          prefix: data?.dc_number_prefix ?? DC_DEFAULTS.prefix,
          dateFormat: data?.dc_number_format ?? DC_DEFAULTS.dateFormat,
          separator: data?.dc_number_separator ?? DC_DEFAULTS.separator,
          sequenceDigits: data?.sequence_digits ?? DC_DEFAULTS.sequenceDigits,
          resetStrategy: data?.reset_sequence_strategy ?? DC_DEFAULTS.resetStrategy,
          useStockManagement:
            data?.use_stock_management == null
              ? DC_DEFAULTS.useStockManagement
              : Boolean(data.use_stock_management),
        })

        setCompanyForm({
          companyName: data?.company_name ?? COMPANY_DEFAULTS.companyName,
          address: data?.company_address ?? COMPANY_DEFAULTS.address,
          city: data?.company_city ?? COMPANY_DEFAULTS.city,
          state: data?.company_state ?? COMPANY_DEFAULTS.state,
          pincode: data?.company_pincode ?? COMPANY_DEFAULTS.pincode,
          gstin: data?.company_gstin ?? COMPANY_DEFAULTS.gstin,
          pan: data?.company_pan ?? COMPANY_DEFAULTS.pan,
          drugLicense: data?.company_drug_license ?? COMPANY_DEFAULTS.drugLicense,
          phone: data?.company_phone ?? COMPANY_DEFAULTS.phone,
          email: data?.company_email ?? COMPANY_DEFAULTS.email,
          website: data?.company_website ?? COMPANY_DEFAULTS.website,
          logoUrl: data?.company_logo_url ?? COMPANY_DEFAULTS.logoUrl,
        })
      } catch (err) {
        setError(err.message ?? 'Unable to load settings.')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [ownerId])

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(''), 2500)
    return () => clearTimeout(timer)
  }, [success])

  const previewValue = useMemo(() => formatPreview(dcSettings), [dcSettings])

  const handleCompanySave = async (event) => {
    event.preventDefault()
    if (!ownerId) return

    if (!companyForm.companyName.trim()) {
      setError('Company name is required.')
      return
    }
    if (!companyForm.address.trim()) {
      setError('Company address is required.')
      return
    }
    if (!companyForm.city.trim() || !companyForm.state.trim()) {
      setError('City and state are required.')
      return
    }
    if (!PINCODE_REGEX.test(companyForm.pincode)) {
      setError('Pincode must be a 6-digit number.')
      return
    }
    if (companyForm.gstin && !GSTIN_REGEX.test(companyForm.gstin)) {
      setError('GSTIN format is invalid.')
      return
    }
    if (companyForm.pan && !PAN_REGEX.test(companyForm.pan)) {
      setError('PAN format is invalid.')
      return
    }
    if (!PHONE_REGEX.test(companyForm.phone)) {
      setError('Phone number must be 10-15 digits and may start with +.')
      return
    }
    if (!EMAIL_REGEX.test(companyForm.email)) {
      setError('Enter a valid email address.')
      return
    }
    if (companyForm.website) {
      try {
        // eslint-disable-next-line no-new
        new URL(companyForm.website)
      } catch (err) {
        setError('Website must be a valid URL (include https://)')
        return
      }
    }

    setCompanySaving(true)
    setError('')
    try {
      const { error: upsertError } = await supabase.from('owner_settings').upsert(
        {
          owner_id: ownerId,
          company_name: companyForm.companyName.trim(),
          company_address: companyForm.address.trim(),
          company_city: companyForm.city.trim(),
          company_state: companyForm.state.trim(),
          company_pincode: companyForm.pincode.trim(),
          company_gstin: companyForm.gstin ? companyForm.gstin.trim().toUpperCase() : null,
          company_pan: companyForm.pan ? companyForm.pan.trim().toUpperCase() : null,
          company_drug_license: companyForm.drugLicense ? companyForm.drugLicense.trim() : null,
          company_phone: companyForm.phone.trim(),
          company_email: companyForm.email.trim(),
          company_website: companyForm.website ? companyForm.website.trim() : null,
          company_logo_url: companyForm.logoUrl,
        },
        { onConflict: 'owner_id' },
      )

      if (upsertError) throw upsertError
      setSuccess('Company details updated successfully.')
    } catch (err) {
      setError(err.message ?? 'Unable to save company settings.')
    } finally {
      setCompanySaving(false)
    }
  }

  const handleDcSave = async (event) => {
    event.preventDefault()
    if (!ownerId) return
    if (!dcSettings.sequenceDigits || dcSettings.sequenceDigits < 1) {
      setError('Sequence digits must be at least 1.')
      return
    }

    setDcSaving(true)
    setError('')
    try {
      const { error: upsertError } = await supabase.from('owner_settings').upsert(
        {
          owner_id: ownerId,
          dc_number_prefix: dcSettings.prefix,
          dc_number_format: dcSettings.dateFormat,
          dc_number_separator: dcSettings.separator,
          sequence_digits: dcSettings.sequenceDigits,
          reset_sequence_strategy: dcSettings.resetStrategy,
        },
        { onConflict: 'owner_id' },
      )
      if (upsertError) throw upsertError
      setSuccess('DC settings updated successfully.')
    } catch (err) {
      setError(err.message ?? 'Unable to save DC settings.')
    } finally {
      setDcSaving(false)
    }
  }

  const handleStockSave = async () => {
    if (!ownerId) return
    setStockSaving(true)
    setError('')
    try {
      const { error: upsertError } = await supabase.from('owner_settings').upsert(
        {
          owner_id: ownerId,
          use_stock_management: dcSettings.useStockManagement,
        },
        { onConflict: 'owner_id' },
      )
      if (upsertError) throw upsertError
      setSuccess('Stock management preference updated.')
    } catch (err) {
      setError(err.message ?? 'Unable to update stock settings.')
    } finally {
      setStockSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Company Settings"
        description="Update your business profile, numbering preferences, and feature toggles."
      />
      <div className="flex flex-col gap-6">

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          {success}
        </div>
      )}

      <div className="rounded-3xl border border-white/10 bg-white/5">
        <div className="border-b border-white/10">
          <nav className="flex gap-8 px-6">
            {[
              { id: 'company', label: 'Company Details' },
              { id: 'dc', label: 'DC Settings' },
              { id: 'stock', label: 'Stock Management' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'border-b-2 border-primary text-primary'
                    : 'border-b-2 border-transparent text-white/60 hover:text-white'
                }`}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'company' && (
            <form onSubmit={handleCompanySave} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-gray-900 font-semibold">Company Name *</span>
                  <input
                    value={companyForm.companyName}
                    onChange={(event) =>
                      setCompanyForm((prev) => ({ ...prev, companyName: event.target.value }))
                    }
                    required
                    className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Pulse Healthcare Pvt Ltd"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-gray-900 font-semibold">Phone *</span>
                  <input
                    value={companyForm.phone}
                    onChange={(event) =>
                      setCompanyForm((prev) => ({ ...prev, phone: event.target.value }))
                    }
                    required
                    className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="+919876543210"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm sm:col-span-2">
                  <span className="text-gray-900 font-semibold">Address *</span>
                  <textarea
                    value={companyForm.address}
                    onChange={(event) =>
                      setCompanyForm((prev) => ({ ...prev, address: event.target.value }))
                    }
                    required
                    rows={3}
                    className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="123, Industrial Estate, Phase II"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-gray-900 font-semibold">City *</span>
                  <input
                    value={companyForm.city}
                    onChange={(event) =>
                      setCompanyForm((prev) => ({ ...prev, city: event.target.value }))
                    }
                    required
                    className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Bengaluru"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-gray-900 font-semibold">State *</span>
                  <input
                    value={companyForm.state}
                    onChange={(event) =>
                      setCompanyForm((prev) => ({ ...prev, state: event.target.value }))
                    }
                    required
                    className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Karnataka"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-gray-900 font-semibold">Pincode *</span>
                  <input
                    value={companyForm.pincode}
                    onChange={(event) =>
                      setCompanyForm((prev) => ({ ...prev, pincode: event.target.value }))
                    }
                    required
                    className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="560001"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-gray-900 font-semibold">Email *</span>
                  <input
                    type="email"
                    value={companyForm.email}
                    onChange={(event) =>
                      setCompanyForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    required
                    className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="support@pulse.com"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-gray-900 font-semibold">Website</span>
                  <input
                    value={companyForm.website}
                    onChange={(event) =>
                      setCompanyForm((prev) => ({ ...prev, website: event.target.value }))
                    }
                    className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="https://pulsehealth.co"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-gray-900 font-semibold">GSTIN (optional)</span>
                  <input
                    value={companyForm.gstin}
                    onChange={(event) =>
                      setCompanyForm((prev) => ({ ...prev, gstin: event.target.value.toUpperCase() }))
                    }
                    className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="22AAAAA0000A1Z5"
                  />
                  <span className="text-xs text-gray-500">Format: 22AAAAA0000A1Z5</span>
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-gray-900 font-semibold">PAN (optional)</span>
                  <input
                    value={companyForm.pan}
                    onChange={(event) =>
                      setCompanyForm((prev) => ({ ...prev, pan: event.target.value.toUpperCase() }))
                    }
                    className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="AAAAA0000A"
                  />
                  <span className="text-xs text-gray-500">Format: AAAAA0000A</span>
                </label>
                <label className="flex flex-col gap-2 text-sm sm:col-span-2">
                  <span className="text-gray-900 font-semibold">Drug License Number</span>
                  <input
                    value={companyForm.drugLicense}
                    onChange={(event) =>
                      setCompanyForm((prev) => ({ ...prev, drugLicense: event.target.value }))
                    }
                    className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="DL-XXXX-XXXX"
                  />
                </label>
              </div>

              <LogoUpload
                currentLogo={companyForm.logoUrl}
                onUpload={(logoUrl) => setCompanyForm((prev) => ({ ...prev, logoUrl }))}
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={companySaving}
                  className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-wait"
                >
                  {companySaving ? 'Saving…' : 'Save Company Details'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'dc' && (
            <form onSubmit={handleDcSave} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-white/70">Prefix</span>
                  <input
                    value={dcSettings.prefix}
                    onChange={(event) =>
                      setDcSettings((prev) => ({ ...prev, prefix: event.target.value }))
                    }
                    className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                    placeholder="DC-"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-white/70">Separator</span>
                  <input
                    value={dcSettings.separator}
                    onChange={(event) =>
                      setDcSettings((prev) => ({ ...prev, separator: event.target.value }))
                    }
                    className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                    placeholder="-"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-white/70">Date Format</span>
                  <select
                    value={dcSettings.dateFormat}
                    onChange={(event) =>
                      setDcSettings((prev) => ({ ...prev, dateFormat: event.target.value }))
                    }
                    className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="YYYYMMDD">YYYYMMDD (20250109)</option>
                    <option value="YYMMDD">YYMMDD (250109)</option>
                    <option value="DDMMYYYY">DDMMYYYY (09012025)</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-white/70">Sequence Digits</span>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={dcSettings.sequenceDigits}
                    onChange={(event) =>
                      setDcSettings((prev) => ({ ...prev, sequenceDigits: Number(event.target.value) }))
                    }
                    className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm text-white/70">Reset Sequence</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {['daily', 'monthly', 'yearly', 'never'].map((value) => (
                    <label
                      key={value}
                      className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                        dcSettings.resetStrategy === value
                          ? 'border-primary bg-primary/10 text-white'
                          : 'border-white/10 bg-slate-900/70 text-white/70'
                      }`}
                    >
                      <span className="capitalize">{value}</span>
                      <input
                        type="radio"
                        name="resetStrategy"
                        value={value}
                        checked={dcSettings.resetStrategy === value}
                        onChange={(event) =>
                          setDcSettings((prev) => ({ ...prev, resetStrategy: event.target.value }))
                        }
                        className="hidden"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <FluentCard glass>
                <p className="text-xs uppercase tracking-widest text-white/50">Preview</p>
                <p className="mt-2 text-lg font-semibold text-white">{previewValue}</p>
                <p className="mt-1 text-xs text-white/40">
                  Example generated using sample date (09 Jan 2025) and sequence 0001.
                </p>
              </FluentCard>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={dcSaving}
                  className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-wait"
                >
                  {dcSaving ? 'Saving…' : 'Save DC Settings'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'stock' && (
            <div className="space-y-6">
              <FluentCard glass>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Enable Stock Tracking</h3>
                    <p className="mt-1 text-sm text-white/60">
                      Track inventory quantities and automatically deduct from stock when creating DCs.
                      Disable if you manage inventory separately.
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={dcSettings.useStockManagement}
                      onChange={(event) =>
                        setDcSettings((prev) => ({ ...prev, useStockManagement: event.target.checked }))
                      }
                      className="peer sr-only"
                    />
                    <div className="h-7 w-14 rounded-full bg-gray-400 transition peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-300">
                      <div className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white transition peer-checked:translate-x-7" />
                    </div>
                  </label>
                </div>
                {dcSettings.useStockManagement ? (
                  <div className="mt-4 rounded-xl border border-blue-500/40 bg-blue-500/10 p-4 text-sm text-blue-100">
                    ✓ Stock tracking enabled. You must add stock before creating DCs.
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/60 p-4 text-sm text-white/60">
                    Stock tracking disabled. You can create DCs without stock entries. Product directory remains available for quick entry.
                  </div>
                )}
              </FluentCard>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleStockSave}
                  disabled={stockSaving}
                  className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-wait"
                >
                  {stockSaving ? 'Saving…' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
        </div>
      )}
      </div>
    </>
  )
}

export default SettingsPage
