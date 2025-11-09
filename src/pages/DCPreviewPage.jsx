import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Download, Printer, Share2, ArrowLeft } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { supabase } from '../utils/supabaseClient.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import DCPreview from '../components/DCPreview.jsx'

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount || 0)

const DCPreviewPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { ownerId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [consignment, setConsignment] = useState(null)
  const [companySettings, setCompanySettings] = useState(null)
  const [paymentRecords, setPaymentRecords] = useState([])

  useEffect(() => {
    if (!id || !ownerId) return
    const fetchData = async () => {
      setLoading(true)
      setError('')
      try {
        const [
          { data: settings, error: settingsError },
          { data, error: consignmentError },
          { data: payments, error: paymentsError },
        ] = await Promise.all([
          supabase
            .from('owner_settings')
            .select(
              `
              company_name,
              company_address,
              company_city,
              company_state,
              company_pincode,
              company_phone,
              company_email,
              company_website,
              company_gstin,
              company_pan,
              company_drug_license,
              company_logo_url
              `,
            )
            .eq('owner_id', ownerId)
            .maybeSingle(),
          supabase
            .from('consignments')
            .select(
              `
              id,
              owner_id,
              hospital_id,
              branch_id,
              dc_number,
              status,
              billing_status,
              payment_status,
              total_value,
              created_at,
              delivered_at,
              delivery_timestamp,
              billed_amount,
              billed_date,
              payment_received_at,
              hospital:hospitals(
                id,
                name,
                address,
                city,
                state,
                pincode,
                gstin,
                drug_license_number,
                contact_person,
                contact_phone,
                email
              ),
              branch:branches(
                id,
                name,
                city,
                state
              ),
              prepared_by_user:users!consignments_prepared_by_fkey(
                id,
                full_name,
                email,
                role
              ),
              delivered_by_user:users!consignments_delivered_by_fkey(
                id,
                full_name,
                email,
                role
              ),
              billed_by_user:users!consignments_billed_by_fkey(
                id,
                full_name,
                email,
                role
              ),
              payment_received_by_user:users!consignments_payment_received_by_fkey(
                id,
                full_name,
                email,
                role
              ),
              items:consignment_items(
                id,
                product_id,
                stock_item_id,
                item_name,
                brand_name,
                size,
                quantity,
                unit_price,
                tax_percentage,
                manufacturing_date,
                expiry_date,
                batch_number
              )
              `,
            )
            .eq('owner_id', ownerId)
            .eq('id', id)
            .single(),
          supabase
            .from('payment_records')
            .select(
              `id, payment_amount, payment_method, payment_reference, payment_date, notes,
               received_by_user:users!payment_records_received_by_fkey(full_name)`
            )
            .eq('owner_id', ownerId)
            .eq('consignment_id', id)
            .order('payment_date', { ascending: false }),
        ])

        if (settingsError && settingsError.code !== 'PGRST116') {
          console.warn('Company settings not found', settingsError)
        }
        setCompanySettings(settings ?? null)

        if (consignmentError) throw consignmentError
        setConsignment(data)

        if (paymentsError && paymentsError.code !== 'PGRST116') throw paymentsError
        setPaymentRecords(payments ?? [])
      } catch (err) {
        console.error('Error loading consignment', err)
        setError(err.message ?? 'Unable to load consignment')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, ownerId])

  const downloadPDF = async () => {
    const element = document.getElementById('dc-content')
    if (!element) return
    const canvas = await html2canvas(element, { scale: 2 })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgWidth = 210
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
    pdf.save(`DC-${consignment?.dc_number ?? 'challan'}.pdf`)
  }

  const shareWhatsApp = () => {
    if (!consignment) return
    const text = `Delivery Challan: ${consignment.dc_number}\nHospital: ${consignment.hospital?.name}\nTotal: ${formatCurrency(
      consignment.total_value,
    )}\n\nView: ${window.location.href}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !consignment) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-xl text-red-600">{error || 'Consignment not found'}</p>
          <button onClick={() => navigate(-1)} className="text-blue-600 underline">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const ActionButtons = ({ className = '' }) => (
    <div className={`flex w-full flex-wrap items-center gap-2 ${className}`}>
      <button
        onClick={shareWhatsApp}
        className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600 active:scale-95"
      >
        <span className="inline-flex items-center justify-center gap-2">
          <Share2 size={18} /> Share
        </span>
      </button>
      <button
        onClick={() => window.print()}
        className="flex-1 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-600 active:scale-95"
      >
        <span className="inline-flex items-center justify-center gap-2">
          <Printer size={18} /> Print
        </span>
      </button>
      <button
        onClick={downloadPDF}
        className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:shadow-blue-600/40 active:scale-95"
      >
        <span className="inline-flex items-center justify-center gap-2">
          <Download size={18} /> PDF
        </span>
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-100 pb-28 md:bg-slate-50 md:pb-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 md:px-6">
        <div className="hidden items-center justify-between gap-2 md:flex">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow hover:shadow-md"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <ActionButtons className="max-w-lg" />
        </div>

        <div id="dc-content" className="mx-auto w-full">
          <DCPreview
            company={companySettings || {}}
            hospital={consignment.hospital || {}}
            branch={consignment.branch || {}}
            dcNumber={consignment.dc_number}
            items={consignment.items || []}
            payments={paymentRecords}
            createdAt={consignment.created_at}
          />
        </div>
      </div>

      <div className="action-buttons fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
        <button
          onClick={() => navigate(-1)}
          className="mr-2 inline-flex items-center justify-center rounded-xl bg-slate-200 px-3 py-3 text-sm font-semibold text-slate-700"
        >
          <ArrowLeft size={18} />
        </button>
        <ActionButtons />
      </div>
    </div>
  )
}

export default DCPreviewPage
