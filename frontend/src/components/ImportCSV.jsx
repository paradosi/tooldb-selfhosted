import { useState } from 'react'
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { post } from '../lib/api'
import { parseCsv } from '../lib/importCsv'

export default function ImportCSV({ onComplete }) {
  const [preview, setPreview] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function handleFileSelect(e) {
    const file = e.target.files[0]
    if (!file) return

    setError(null)
    setResult(null)

    try {
      const text = await file.text()
      const tools = parseCsv(text)
      setPreview(tools)
    } catch (err) {
      setError(err.message)
      setPreview(null)
    }

    e.target.value = ''
  }

  async function handleImport() {
    if (!preview || preview.length === 0) return

    setImporting(true)
    setError(null)

    let imported = 0
    try {
      for (const tool of preview) {
        await post('/tools', tool)
        imported++
      }
      setResult({ count: imported })
      setPreview(null)
    } catch (err) {
      setError(err.message + (imported > 0 ? ` (${imported} imported before error)` : ''))
    }

    setImporting(false)

    if (onComplete && imported > 0) {
      setTimeout(onComplete, 1500)
    }
  }

  function handleCancel() {
    setPreview(null)
    setError(null)
    setResult(null)
  }

  return (
    <div className="bg-card border border-bd rounded-xl p-6 space-y-4">
      <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider">Import from CSV</h2>

      {result ? (
        <div className="flex items-center gap-3 py-4">
          <CheckCircle size={24} className="text-ok" />
          <p className="text-fg text-sm font-medium">
            Successfully imported {result.count} tool{result.count === 1 ? '' : 's'}.
          </p>
        </div>
      ) : preview ? (
        <div className="space-y-4">
          <div className="bg-surface border border-bd rounded-lg p-4">
            <p className="text-sm text-fg mb-3">
              <span className="font-medium">{preview.length}</span> tool{preview.length === 1 ? '' : 's'} found in CSV:
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {preview.map((tool, i) => (
                <div key={i} className="text-xs text-fg-muted truncate">
                  <span className="text-fg">{tool.name}</span>
                  {tool.brand && <span> · {tool.brand}</span>}
                  {tool.model_number && <span> · {tool.model_number}</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 py-2 bg-bd hover:bg-bd-input text-fg text-sm rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              {importing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Import {preview.length} Tool{preview.length === 1 ? '' : 's'}
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs text-fg-faint">
            Upload a CSV with columns: Name, Brand, Model, Serial Number, Tool Type, Purchase Date, Purchase Price, Retailer, Condition, Location, Warranty Expiry. Matches the export format.
          </p>
          <label className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-bd-input hover:border-accent rounded-lg text-sm text-fg-muted hover:text-accent transition-colors cursor-pointer">
            <FileSpreadsheet size={18} />
            Select CSV File
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </>
      )}

      {error && (
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-warn flex-shrink-0 mt-0.5" />
          <p className="text-sm text-warn">{error}</p>
        </div>
      )}
    </div>
  )
}
