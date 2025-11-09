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
        const [{ data: settings, error: settingsError }, { data, error: consignmentError }, { data: payments, error: paymentsError }] =
          await Promise.all([
            supabase
              .from('owner_settings')
              .select('*')
              .eq('owner_id', ownerId)
              .maybeSingle(),
            supabase
              .from('consignments')
              .select(
                `id, dc_number, total_value, created_at, status, billing_status, payment_status,
                 hospital:hospitals(*),
                 branch:branches(*),
                 prepared_by_user:users!consignments_prepared_by_fkey(full_name),
                 items:consignment_items(id, product_id, stock_item_id, item_name, brand_name, size, quantity, unit_price, tax_percentage, manufacturing_date, expiry_date, batch_number)`
              )
              .eq('owner_id', ownerId)
              .eq('id', id)
              .single(),
            supabase
              .from('payment_records')
              .select(`id, payment_amount, payment_method, payment_reference, payment_date, notes, received_by_user:users!payment_records_received_by_fkey(full_name)`)
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
    const text = `Delivery Challan: ${consignment.dc_number}\nHospital: ${consignment.hospital?.name}\nTotal: ${formatCurrency(consignment.total_value)}\n\nView: ${window.location.href}`
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

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto mb-4 flex max-w-5xl items-center justify-between gap-2 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow hover:shadow-md"
        >
          <ArrowLeft size={18} /> Back
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={shareWhatsApp}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            <Share2 size={18} /> Share
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Printer size={18} /> Print
          </button>
          <button
            onClick={downloadPDF}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:shadow-lg"
          >
            <Download size={18} /> Download PDF
          </button>
        </div>
      </div>

      <div id="dc-content" className="mx-auto max-w-5xl">
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
  )
}

export default DCPreviewPage
