import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, ArrowLeft, Check, Loader2 } from 'lucide-react'
import { get, post, put } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import useAutosave from '../hooks/useAutosave'
import UpcScanner from '../components/UpcScanner'
import PhotoUpload from '../components/PhotoUpload'
import ReceiptUpload from '../components/ReceiptUpload'
import TagPicker from '../components/TagPicker'
import ImportCSV from '../components/ImportCSV'

const TOOL_TYPES = [
  'Track Saw', 'Circular Saw', 'Table Saw', 'Miter Saw', 'Band Saw', 'Jig Saw',
  'Drill', 'Impact Driver', 'Hammer Drill', 'Drill Press',
  'Router', 'Planer', 'Jointer', 'Sander', 'Grinder', 'Lathe',
  'Reciprocating Saw', 'Oscillating Multi-Tool', 'Rotary Tool',
  'Nailer', 'Stapler', 'Heat Gun', 'Blower', 'Vacuum', 'Dust Collector',
  'Wrench', 'Socket Set', 'Pliers', 'Screwdriver', 'Hex Key Set', 'Impact Wrench',
  'Level', 'Tape Measure', 'Square', 'Clamp', 'Vise', 'Laser Level',
  'Chisel', 'Hand Saw', 'Hand Plane', 'File', 'Hammer',
  'Chainsaw', 'Hedge Trimmer', 'String Trimmer', 'Lawn Mower', 'Snow Blower',
  'Pressure Washer', 'Generator', 'Air Compressor', 'Welder',
  'Multimeter', 'Flashlight', 'Knife', 'Other',
]

const EMPTY_FORM = {
  upc: '',
  name: '',
  brand: '',
  model_number: '',
  serial_number: '',
  tool_type: '',
  purchase_date: '',
  purchase_price: '',
  retailer: '',
  warranty_expiry: '',
  condition: 'New',
  location: '',
  lent_to: '',
  lent_date: '',
  notes: '',
  custom_field_1_label: '',
  custom_field_1_value: '',
  custom_field_2_label: '',
  custom_field_2_value: '',
}

export default function AddToolPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()

  const [form, setForm] = useState(EMPTY_FORM)
  const [locations, setLocations] = useState([])
  const [allToolTypes, setAllToolTypes] = useState(TOOL_TYPES)
  const [saving, setSaving] = useState(false)
  const [loadingTool, setLoadingTool] = useState(isEdit)
  const [formReady, setFormReady] = useState(!isEdit)
  const [error, setError] = useState(null)

  function buildRecord() {
    return {
      upc: form.upc || null,
      name: form.name,
      brand: form.brand || null,
      model_number: form.model_number || null,
      serial_number: form.serial_number || null,
      tool_type: form.tool_type || null,
      purchase_date: form.purchase_date || null,
      purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
      retailer: form.retailer || null,
      warranty_expiry: form.warranty_expiry || null,
      condition: form.condition,
      location: form.location || null,
      lent_to: form.lent_to || null,
      lent_date: form.lent_date || null,
      notes: form.notes || null,
      custom_field_1_label: form.custom_field_1_label || null,
      custom_field_1_value: form.custom_field_1_value || null,
      custom_field_2_label: form.custom_field_2_label || null,
      custom_field_2_value: form.custom_field_2_value || null,
    }
  }

  const handleServerAutosave = useCallback(async () => {
    if (!id || !form.name) return {}
    try {
      await put('/tools/' + id, buildRecord())
      return {}
    } catch (err) {
      return { error: err }
    }
  }, [form, id])

  const { autoSaveStatus, clearDraft, loadDraft } = useAutosave(
    'tooldb-draft-tool',
    form,
    { isEdit, ready: formReady, onServerSave: handleServerAutosave }
  )

  // Restore draft for new tools
  useEffect(() => {
    if (isEdit) return
    const draft = loadDraft()
    if (draft) setForm(draft)
    setFormReady(true)
  }, [isEdit, loadDraft])

  // Load existing tool for edit mode
  useEffect(() => {
    if (!isEdit) return

    async function loadTool() {
      try {
        const data = await get('/tools/' + id)
        setForm({
          upc: data.upc || '',
          name: data.name || '',
          brand: data.brand || '',
          model_number: data.model_number || '',
          serial_number: data.serial_number || '',
          tool_type: data.tool_type || '',
          purchase_date: data.purchase_date || '',
          purchase_price: data.purchase_price ?? '',
          retailer: data.retailer || '',
          warranty_expiry: data.warranty_expiry || '',
          condition: data.condition || 'New',
          location: data.location || '',
          lent_to: data.lent_to || '',
          lent_date: data.lent_date || '',
          notes: data.notes || '',
          custom_field_1_label: data.custom_field_1_label || '',
          custom_field_1_value: data.custom_field_1_value || '',
          custom_field_2_label: data.custom_field_2_label || '',
          custom_field_2_value: data.custom_field_2_value || '',
        })
        setLoadingTool(false)
        setFormReady(true)
      } catch {
        setError('Tool not found.')
        setLoadingTool(false)
      }
    }

    loadTool()
  }, [id, isEdit])

  // Load distinct locations and custom tool types for autocomplete
  useEffect(() => {
    async function loadAutocomplete() {
      try {
        const tools = await get('/tools')
        if (tools) {
          const locs = [...new Set(tools.map((t) => t.location).filter(Boolean))].sort()
          setLocations(locs)
          const userTypes = tools.map((t) => t.tool_type).filter(Boolean)
          const merged = [...new Set([...TOOL_TYPES, ...userTypes])].sort()
          setAllToolTypes(merged)
        }
      } catch {}
    }

    loadAutocomplete()
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleUpcResult(result) {
    setForm((prev) => ({
      ...prev,
      upc: result.upc,
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const record = buildRecord()
    try {
      let data
      if (isEdit) {
        data = await put('/tools/' + id, record)
      } else {
        data = await post('/tools', record)
      }

      setSaving(false)
      clearDraft()

      if (isEdit) {
        navigate(`/tools/${data?.id || id}`)
      } else {
        navigate(`/tools/${data.id}/edit`, { replace: true })
      }
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (loadingTool) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-fg-muted hover:text-fg transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-fg">
          {isEdit ? 'Edit Tool' : 'Add Tool'}
        </h1>
      </div>

      {!isEdit && (
        <div className="mb-6 space-y-4">
          <div className="flex items-end">
            <UpcScanner onResult={handleUpcResult} />
          </div>
          <p className="text-xs text-fg-faint">
            Scan a barcode or enter details manually below.
          </p>
          <ImportCSV onComplete={() => navigate('/')} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-bd rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider">Details</h2>

          <Field label="Name" name="name" value={form.name} onChange={handleChange} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Brand" name="brand" value={form.brand} onChange={handleChange} />
            <Field label="Model Number" name="model_number" value={form.model_number} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Serial Number" name="serial_number" value={form.serial_number} onChange={handleChange} />
            <div>
              <label htmlFor="tool_type" className="block text-sm text-fg-muted mb-1">Tool Type</label>
              <input
                id="tool_type"
                name="tool_type"
                value={form.tool_type}
                onChange={handleChange}
                list="tool-type-list"
                placeholder="Select or type custom..."
                className="w-full px-3 py-2 bg-surface border border-bd-input rounded-lg text-fg placeholder-fg-faint focus:outline-none focus:border-accent transition-colors"
              />
              <datalist id="tool-type-list">
                {allToolTypes.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
          </div>
        </div>

        <div className="bg-card border border-bd rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider">Purchase Info</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Purchase Date" name="purchase_date" type="date" value={form.purchase_date} onChange={handleChange} />
            <Field label="Purchase Price ($)" name="purchase_price" type="number" step="0.01" min="0" value={form.purchase_price} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Retailer" name="retailer" value={form.retailer} onChange={handleChange} />
            <Field label="Warranty Expiry" name="warranty_expiry" type="date" value={form.warranty_expiry} onChange={handleChange} />
          </div>
        </div>

        <div className="bg-card border border-bd rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider">Status</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="condition" className="block text-sm text-fg-muted mb-1">Condition</label>
              <select
                id="condition"
                name="condition"
                value={form.condition}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-surface border border-bd-input rounded-lg text-fg focus:outline-none focus:border-accent transition-colors"
              >
                <option value="New">New</option>
                <option value="Used">Used</option>
                <option value="Refurbished">Refurbished</option>
              </select>
            </div>

            <div>
              <label htmlFor="location" className="block text-sm text-fg-muted mb-1">Location</label>
              <input
                id="location"
                name="location"
                value={form.location}
                onChange={handleChange}
                list="location-list"
                placeholder="Garage shelf, Packout #3, Van..."
                className="w-full px-3 py-2 bg-surface border border-bd-input rounded-lg text-fg placeholder-fg-faint focus:outline-none focus:border-accent transition-colors"
              />
              <datalist id="location-list">
                {locations.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Lent To" name="lent_to" value={form.lent_to} onChange={handleChange} placeholder="Name of person..." />
            <Field label="Lent Date" name="lent_date" type="date" value={form.lent_date} onChange={handleChange} />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm text-fg-muted mb-1">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 bg-surface border border-bd-input rounded-lg text-fg placeholder-fg-faint focus:outline-none focus:border-accent transition-colors resize-none"
            />
          </div>
        </div>

        <div className="bg-card border border-bd rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider">Custom Fields</h2>
          <div className="grid grid-cols-[1fr_2fr] gap-3">
            <Field label="Label" name="custom_field_1_label" value={form.custom_field_1_label} onChange={handleChange} placeholder="e.g. Blade Size" />
            <Field label="Value" name="custom_field_1_value" value={form.custom_field_1_value} onChange={handleChange} placeholder="e.g. 10 inch" />
          </div>
          <div className="grid grid-cols-[1fr_2fr] gap-3">
            <Field label="Label" name="custom_field_2_label" value={form.custom_field_2_label} onChange={handleChange} placeholder="e.g. Collet Size" />
            <Field label="Value" name="custom_field_2_value" value={form.custom_field_2_value} onChange={handleChange} placeholder="e.g. 1/2 inch" />
          </div>
        </div>

        {isEdit && (
          <div className="bg-card border border-bd rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider">Tags</h2>
            <TagPicker itemId={id} itemType="tool" />
          </div>
        )}

        {isEdit && <PhotoUpload toolId={id} />}
        {isEdit && <ReceiptUpload toolId={id} />}

        {error && (
          <div className="bg-warn/10 border border-warn/30 rounded-lg p-4">
            <p className="text-warn text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          {isEdit && autoSaveStatus && (
            <p className="text-center text-xs text-fg-faint flex items-center justify-center gap-1.5">
              {autoSaveStatus === 'saving' && <><Loader2 size={12} className="animate-spin" /> Auto-saving...</>}
              {autoSaveStatus === 'saved' && <><Check size={12} className="text-green-500" /> Auto-saved</>}
              {autoSaveStatus === 'error' && <span className="text-warn">Auto-save failed</span>}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 w-full py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-medium rounded-lg transition-colors cursor-pointer"
          >
            <Save size={18} />
            {saving ? 'Saving...' : isEdit ? 'Update Tool' : 'Save Tool'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, name, value, onChange, required, type = 'text', ...rest }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm text-fg-muted mb-1">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-3 py-2 bg-surface border border-bd-input rounded-lg text-fg placeholder-fg-faint focus:outline-none focus:border-accent transition-colors"
        {...rest}
      />
    </div>
  )
}
