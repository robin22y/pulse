import { useState } from 'react'
import { supabase } from '../utils/supabaseClient.js'
import { RefreshCw } from 'lucide-react'

const DCNumberInput = ({ value, onChange }) => {
  const [generating, setGenerating] = useState(false)

  const fallbackGenerate = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const sequence = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
    return `${year}${month}${day}${sequence}`
  }

  const generateDC = async () => {
    setGenerating(true)
    try {
      const { data, error } = await supabase.rpc('generate_dc_number')
      if (error) throw error
      if (data) {
        onChange?.(data)
      } else {
        onChange?.(fallbackGenerate())
      }
    } catch (err) {
      console.error('Failed to generate DC number:', err)
      onChange?.(fallbackGenerate())
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="block text-sm font-semibold text-gray-200">
        DC Number <span className="text-red-400">*</span>
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          required
          className="flex-1 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/40"
          placeholder="202501090001 or enter custom"
        />
        <button
          type="button"
          onClick={generateDC}
          disabled={generating}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={18} className={generating ? 'animate-spin' : ''} /> Auto
        </button>
      </div>
      <p className="text-xs text-white/50">
        Format: YYYYMMDDNNNN (auto-generated) or enter number from billing software.
      </p>
    </div>
  )
}

export default DCNumberInput
