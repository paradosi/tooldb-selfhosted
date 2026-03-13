/**
 * Parse a CSV file into an array of tool records ready for Supabase insert.
 * Expects headers matching the export format:
 * Name, Brand, Model, Serial Number, Tool Type, Purchase Date,
 * Purchase Price, Retailer, Condition, Location, Warranty Expiry
 */
export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.')

  const headers = parseRow(lines[0]).map((h) => h.trim().toLowerCase())

  const COL_MAP = {
    'name': 'name',
    'brand': 'brand',
    'model': 'model_number',
    'model number': 'model_number',
    'serial': 'serial_number',
    'serial number': 'serial_number',
    'tool type': 'tool_type',
    'type': 'tool_type',
    'purchase date': 'purchase_date',
    'purchase price': 'purchase_price',
    'price': 'purchase_price',
    'retailer': 'retailer',
    'condition': 'condition',
    'location': 'location',
    'warranty expiry': 'warranty_expiry',
    'warranty': 'warranty_expiry',
  }

  const colIndex = {}
  headers.forEach((h, i) => {
    const mapped = COL_MAP[h]
    if (mapped) colIndex[mapped] = i
  })

  if (colIndex.name === undefined) {
    throw new Error('CSV must have a "Name" column.')
  }

  const tools = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseRow(lines[i])
    const name = cells[colIndex.name]?.trim()
    if (!name) continue // skip empty rows (like totals row)

    const tool = {
      name,
      brand: getCell(cells, colIndex.brand),
      model_number: getCell(cells, colIndex.model_number),
      serial_number: getCell(cells, colIndex.serial_number),
      tool_type: getCell(cells, colIndex.tool_type),
      purchase_date: getCell(cells, colIndex.purchase_date) || null,
      purchase_price: parsePrice(getCell(cells, colIndex.purchase_price)),
      retailer: getCell(cells, colIndex.retailer),
      condition: getCell(cells, colIndex.condition) || 'New',
      location: getCell(cells, colIndex.location),
      warranty_expiry: getCell(cells, colIndex.warranty_expiry) || null,
    }

    tools.push(tool)
  }

  if (tools.length === 0) throw new Error('No valid tool rows found in CSV.')

  return tools
}

function getCell(cells, index) {
  if (index === undefined) return null
  const val = cells[index]?.trim()
  return val || null
}

function parsePrice(val) {
  if (!val) return null
  const num = parseFloat(val.replace(/[$,]/g, ''))
  return isNaN(num) ? null : num
}

/**
 * Parse a single CSV row, handling quoted fields with commas and escaped quotes.
 */
function parseRow(line) {
  const cells = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        cells.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  cells.push(current)
  return cells
}
