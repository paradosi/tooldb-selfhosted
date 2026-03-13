import { useState, useEffect } from 'react'
import { FileText, Image, Trash2, Upload, Loader2 } from 'lucide-react'
import { get, del, upload } from '../lib/api'

const LABEL_OPTIONS = ['Purchase receipt', 'Warranty card', 'Manual', 'Other']

export default function ReceiptUpload({ toolId }) {
  const [receipts, setReceipts] = useState([])
  const [uploading, setUploading] = useState(false)
  const [label, setLabel] = useState('Purchase receipt')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!toolId) return
    loadReceipts()
  }, [toolId])

  async function loadReceipts() {
    try {
      const data = await get('/tools/' + toolId + '/receipts')
      if (data) setReceipts(data)
    } catch {}
  }

  const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

  async function handleFileSelect(e) {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Only JPEG, PNG, WebP, and PDF files are allowed.')
      }
      if (file.size > MAX_SIZE) {
        throw new Error('File must be under 10 MB.')
      }
      // Upload receipt with label as query param
      await upload('/tools/' + toolId + '/receipts?label=' + encodeURIComponent(label), file)
      await loadReceipts()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function deleteReceipt(receiptId) {
    await del('/receipts/' + receiptId)
    await loadReceipts()
  }

  if (!toolId) return null

  return (
    <div className="bg-card border border-bd rounded-xl p-6 space-y-4">
      <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider">Receipts & Documents</h2>

      {receipts.length > 0 && (
        <div className="space-y-2">
          {receipts.map((receipt) => (
            <div
              key={receipt.id}
              className="flex items-center gap-3 bg-surface border border-bd rounded-lg px-4 py-3"
            >
              {receipt.file_type === 'application/pdf' ? (
                <FileText size={20} className="text-warn flex-shrink-0" />
              ) : (
                <Image size={20} className="text-accent flex-shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm text-fg truncate">{receipt.label}</p>
                <p className="text-xs text-fg-faint">
                  {receipt.file_type === 'application/pdf' ? 'PDF' : 'Image'}
                </p>
              </div>

              <a
                href={receipt.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:text-accent-hover flex-shrink-0"
              >
                View
              </a>

              <button
                type="button"
                onClick={() => deleteReceipt(receipt.id)}
                className="text-fg-faint hover:text-warn transition-colors cursor-pointer flex-shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="receipt-label" className="block text-sm text-fg-muted mb-1">Label</label>
          <select
            id="receipt-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-bd-input rounded-lg text-fg focus:outline-none focus:border-accent transition-colors"
          >
            {LABEL_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-bd-input hover:border-accent rounded-lg text-sm text-fg-muted hover:text-accent transition-colors cursor-pointer flex-shrink-0">
          {uploading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload size={16} />
              Upload
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {error && (
        <p className="text-sm text-warn">{error}</p>
      )}
    </div>
  )
}
