import { useState, useEffect, useCallback, useRef } from 'react'
import { FileText, Image, Trash2, Upload, Loader2 } from 'lucide-react'
import { get, del, put, upload } from '../lib/api'
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_ERROR,
} from '../lib/uploadLimits'

const LABEL_OPTIONS = ['Purchase receipt', 'Warranty card', 'Manual', 'Parts List', 'Other']

// file_type stores the sniffed extension (".pdf"), not a MIME type, so match
// loosely: older or future rows may hold either form.
function isPdf(receipt) {
  return String(receipt.file_type || '').toLowerCase().includes('pdf')
}

export default function ReceiptsSection({ resource, ownerId }) {
  const [receipts, setReceipts] = useState([])
  const [uploading, setUploading] = useState(false)
  const [label, setLabel] = useState('Purchase receipt')
  const [error, setError] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const skipBlurSave = useRef(false)

  const loadReceipts = useCallback(async () => {
    try {
      const data = await get('/' + resource + '/' + ownerId + '/receipts')
      if (data) setReceipts(data)
    } catch {
      /* keep the current list if the refresh fails */
    }
  }, [resource, ownerId])

  useEffect(() => {
    if (ownerId) loadReceipts()
  }, [ownerId, loadReceipts])

  async function handleFileSelect(e) {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      if (!DOCUMENT_TYPES.includes(file.type)) {
        throw new Error(DOCUMENT_TYPE_ERROR)
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error(`File must be under ${MAX_UPLOAD_LABEL}.`)
      }
      // Upload receipt with label as query param
      await upload('/' + resource + '/' + ownerId + '/receipts?label=' + encodeURIComponent(label), file)
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

  function startEdit(receipt) {
    skipBlurSave.current = false
    setSaveError(null)
    setEditingId(receipt.id)
    setEditValue(receipt.name || receipt.label || '')
  }

  async function saveEdit(receipt) {
    const value = editValue.trim()
    setEditingId(null)
    if (value === '' || value === (receipt.name || '')) return
    try {
      const updated = await put('/receipts/' + receipt.id, { name: value })
      setReceipts((prev) => prev.map((r) => (r.id === receipt.id ? { ...r, ...updated } : r)))
    } catch (err) {
      setSaveError(err.message)
    }
  }

  function cancelEdit() {
    skipBlurSave.current = true
    setEditingId(null)
    setEditValue('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur() // blur saves, so both Enter and click-away commit
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  }

  function handleBlur(receipt) {
    if (skipBlurSave.current) {
      skipBlurSave.current = false
      return
    }
    saveEdit(receipt)
  }

  if (!ownerId) return null

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
              {isPdf(receipt) ? (
                <FileText size={20} className="text-warn flex-shrink-0" />
              ) : (
                <Image size={20} className="text-accent flex-shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                {editingId === receipt.id ? (
                  <input
                    type="text"
                    value={editValue}
                    autoFocus
                    maxLength={200}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => handleBlur(receipt)}
                    className="w-full px-2 py-0.5 bg-surface border border-bd-input rounded text-sm text-fg focus:outline-none focus:border-accent transition-colors"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(receipt)}
                    title="Rename"
                    className="block max-w-full text-left text-sm text-fg truncate cursor-text hover:text-accent transition-colors"
                  >
                    {receipt.name || receipt.label}
                  </button>
                )}
                <p className="text-xs text-fg-faint">
                  {receipt.label} · {isPdf(receipt) ? 'PDF' : 'Image'}
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

      {saveError && (
        <p className="text-xs text-warn">{saveError}</p>
      )}

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor={resource + '-receipt-label'} className="block text-sm text-fg-muted mb-1">Label</label>
          <select
            id={resource + '-receipt-label'}
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
