export function exportCsv(tools) {
  const headers = [
    'Name', 'Brand', 'Model', 'Serial Number', 'Tool Type', 'Purchase Date',
    'Purchase Price', 'Retailer', 'Condition', 'Location', 'Warranty Expiry',
  ]

  const rows = tools.map((t) => [
    t.name || '',
    t.brand || '',
    t.model_number || '',
    t.serial_number || '',
    t.tool_type || '',
    t.purchase_date || '',
    t.purchase_price ? parseFloat(t.purchase_price).toFixed(2) : '',
    t.retailer || '',
    t.condition || '',
    t.location || '',
    t.warranty_expiry || '',
  ])

  const total = tools.reduce((sum, t) => sum + (parseFloat(t.purchase_price) || 0), 0)
  rows.push(['', '', '', '', '', '', total.toFixed(2), '', '', '', ''])

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const date = new Date().toISOString().split('T')[0]
  downloadFile(csvContent, `tooldb-export-${date}.csv`, 'text/csv')
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
