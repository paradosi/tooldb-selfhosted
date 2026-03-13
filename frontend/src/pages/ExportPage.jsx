import { useState, useEffect } from 'react'
import { FileText, FileSpreadsheet, Loader2 } from 'lucide-react'
import posthog from 'posthog-js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { exportPdf } from '../lib/exportPdf'
import { exportCsv } from '../lib/exportCsv'

export default function ExportPage() {
  const { user } = useAuth()
  const [tools, setTools] = useState([])
  const [batteries, setBatteries] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(null)

  useEffect(() => {
    async function fetchAll(table) {
      const PAGE = 1000
      let all = []
      let from = 0
      while (true) {
        const { data } = await supabase
          .from(table)
          .select('*')
          .order('brand', { ascending: true })
          .order('name', { ascending: true })
          .range(from, from + PAGE - 1)
        if (!data || data.length === 0) break
        all = all.concat(data)
        if (data.length < PAGE) break
        from += PAGE
      }
      return all
    }

    async function load() {
      const [toolData, batteryData] = await Promise.all([
        fetchAll('user_tools'),
        fetchAll('user_batteries'),
      ])

      setTools(toolData)
      setBatteries(batteryData)
      setLoading(false)
    }

    load()
  }, [])

  const allItems = [...tools, ...batteries]
  const totalValue = allItems.reduce((sum, t) => sum + (parseFloat(t.purchase_price) || 0), 0)
  const itemsWithPrice = allItems.filter((t) => t.purchase_price).length

  async function handlePdf() {
    setExporting('pdf')
    try {
      const batteryItems = batteries.map((b) => ({ ...b, tool_type: `Battery${b.voltage ? ' (' + b.voltage + ')' : ''}` }))
      await exportPdf([...tools, ...batteryItems], user?.email)
      posthog.capture('export_downloaded', {
        export_format: 'pdf',
        tool_count: tools.length,
        battery_count: batteries.length,
        total_items: tools.length + batteries.length,
      })
    } finally {
      setExporting(null)
    }
  }

  function handleCsv() {
    setExporting('csv')
    try {
      const batteryItems = batteries.map((b) => ({ ...b, tool_type: `Battery${b.voltage ? ' (' + b.voltage + ')' : ''}` }))
      exportCsv([...tools, ...batteryItems])
      posthog.capture('export_downloaded', {
        export_format: 'csv',
        tool_count: tools.length,
        battery_count: batteries.length,
        total_items: tools.length + batteries.length,
      })
    } finally {
      setExporting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-fg mb-6">Insurance Export</h1>

      <div className="bg-card border border-bd rounded-xl p-6 mb-6">
        <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider mb-4">Collection Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-bold text-fg">{tools.length}</p>
            <p className="text-xs text-fg-muted">Tools</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-fg">{batteries.length}</p>
            <p className="text-xs text-fg-muted">Batteries</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-ok">${totalValue.toFixed(2)}</p>
            <p className="text-xs text-fg-muted">Total Value</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-fg">{itemsWithPrice}</p>
            <p className="text-xs text-fg-muted">With Price</p>
          </div>
        </div>
      </div>

      {allItems.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-fg-muted">Add tools or batteries to your collection to generate an export.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button
              onClick={handlePdf}
              disabled={exporting}
              className="flex flex-col items-center gap-3 p-6 bg-card border border-bd hover:border-accent rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {exporting === 'pdf' ? (
                <Loader2 size={32} className="text-accent animate-spin" />
              ) : (
                <FileText size={32} className="text-accent" />
              )}
              <div>
                <p className="text-fg font-medium">Download PDF</p>
                <p className="text-xs text-fg-muted">Formatted report for insurance</p>
              </div>
            </button>

            <button
              onClick={handleCsv}
              disabled={exporting}
              className="flex flex-col items-center gap-3 p-6 bg-card border border-bd hover:border-ok rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {exporting === 'csv' ? (
                <Loader2 size={32} className="text-ok animate-spin" />
              ) : (
                <FileSpreadsheet size={32} className="text-ok" />
              )}
              <div>
                <p className="text-fg font-medium">Download CSV</p>
                <p className="text-xs text-fg-muted">Spreadsheet for Excel / Sheets</p>
              </div>
            </button>
          </div>

          {/* What's included */}
          <div className="bg-card border border-bd rounded-xl p-6">
            <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider mb-4">What's Included</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-fg-muted">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-1.5" />
                <span>Tool & battery names, brands, and model numbers</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-1.5" />
                <span>Serial numbers for identification</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-1.5" />
                <span>Purchase dates, prices, and retailers</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-1.5" />
                <span>Condition, location, and warranty status</span>
              </div>
            </div>
            <p className="text-xs text-fg-faint mt-4">
              Tip: Keep purchase prices and serial numbers up to date for the most accurate insurance documentation.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
