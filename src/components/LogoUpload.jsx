import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient.js'
import { X, Image as ImageIcon } from 'lucide-react'

const LogoUpload = ({ currentLogo, onUpload }) => {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(currentLogo ?? null)

  useEffect(() => {
    setPreview(currentLogo ?? null)
  }, [currentLogo])

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      window.alert('File size must be less than 2MB')
      return
    }

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      window.alert('Only JPG and PNG files are allowed')
      return
    }

    try {
      setUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `logos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('company-assets').getPublicUrl(filePath)
      const publicUrl = data?.publicUrl
      setPreview(publicUrl)
      onUpload?.(publicUrl)
    } catch (error) {
      console.error('Logo upload failed', error)
      window.alert('Failed to upload logo. Please try again.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const removeLogo = () => {
    setPreview(null)
    onUpload?.(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-semibold text-gray-900">
        Company Logo
      </label>
      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Company Logo"
            className="h-24 w-auto rounded-lg border-2 border-gray-200 object-contain"
          />
          <button
            type="button"
            onClick={removeLogo}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition hover:border-blue-500 hover:bg-blue-50">
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
          <ImageIcon size={48} className="text-gray-400" />
          <p className="text-sm text-gray-600">
            {uploading ? 'Uploading…' : 'Click to upload logo'}
          </p>
          <p className="text-xs text-gray-500">JPG or PNG, max 2MB</p>
        </label>
      )}
    </div>
  )
}

export default LogoUpload
