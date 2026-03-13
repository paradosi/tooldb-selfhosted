import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, ArrowLeft, Check, Loader2 } from 'lucide-react'
import { get, post, put } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import useAutosave from '../hooks/useAutosave'
import BatteryPhotoUpload from '../components/BatteryPhotoUpload'
import BatteryReceiptUpload from '../components/BatteryReceiptUpload'
import TagPicker from '../components/TagPicker'

const EMPTY_FORM = {
  name: '',
  brand: '',
  platform: '',
  model_number: '',
  serial_number: '',
  voltage: '',
  capacity_ah: '',
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

export default function AddBatteryPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()

  const [form, setForm] = useState(EMPTY_FORM)
  const [locations, setLocations] = useState([])
  const [saving, setSaving] = useState(false)
  const [loadingBattery, setLoadingBattery] = useState(isEdit)
  const [formReady, setFormReady] = useState(!isEdit)
  const [error, setError] = useState(null)

  function buildRecord() {
    return {
      name: form.name,
      brand: form.brand || null,
      platform: form.platform || null,
      model_number: form.model_number || null,
      serial_number: form.serial_number || null,
      voltage: form.voltage || null,
      capacity_ah: form.capacity_ah || null,
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
      await put('/batteries/' + id, buildRecord())
      return {}
    } catch (err) {
      return { error: err }
    }
  }, [form, id])

  const { autoSaveStatus, clearDraft, loadDraft } = useAutosave(
    'tooldb-draft-battery',
    form,
    { isEdit, ready: formReady, onServerSave: handleServerAutosave }
  )

  // Restore draft for new batteries
  useEffect(() => {
    if (isEdit) return
    const draft = loadDraft()
    if (draft) setForm(draft)
    setFormReady(true)
  }, [isEdit, loadDraft])

  useEffect(() => {
    if (!isEdit) return

    async function loadBattery() {
      try {
        const data = await get('/batteries/' + id)
        setForm({
          name: data.name || '',
          brand: data.brand || '',
          platform: data.platform || '',
          model_number: data.model_number || '',
          serial_number: data.serial_number || '',
          voltage: data.voltage || '',
          capacity_ah: data.capacity_ah || '',
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
        setLoadingBattery(false)
        setFormReady(true)
      } catch {
        setError('Battery not found.')
        setLoadingBattery(false)
      }
    }

    loadBattery()
  }, [id, isEdit])

  useEffect(() => {
    async function loadLocations() {
      try {
        const batteries = await get('/batteries')
        if (batteries) {
          const unique = [...new Set(batteries.map((b) => b.location).filter(Boolean))].sort()
          setLocations(unique)
        }
      } catch {}
    }

    loadLocations()
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const record = buildRecord()
    try {
      let data
      if (isEdit) {
        data = await put('/batteries/' + id, record)
      } else {
        data = await post('/batteries', record)
      }

      setSaving(false)
      clearDraft()

      if (isEdit) {
        navigate(`/batteries/${data?.id || id}`)
      } else {
        navigate(`/batteries/${data.id}/edit`, { replace: true })
      }
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (loadingBattery) {
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
          {isEdit ? 'Edit Battery' : 'Add Battery'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-bd rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider">Details</h2>

          <Field label="Name" name="name" value={form.name} onChange={handleChange} required placeholder="e.g. M18 HD12.0 Battery" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Brand" name="brand" value={form.brand} onChange={handleChange} placeholder="e.g. Milwaukee" />
            <Field label="Platform" name="platform" value={form.platform} onChange={handleChange} placeholder="e.g. M18, 20V MAX, LXT" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Model Number" name="model_number" value={form.model_number} onChange={handleChange} />
            <Field label="Serial Number" name="serial_number" value={form.serial_number} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Voltage" name="voltage" value={form.voltage} onChange={handleChange} placeholder="e.g. 18V, 20V, 12V" />
            <Field label="Capacity (Ah)" name="capacity_ah" value={form.capacity_ah} onChange={handleChange} placeholder="e.g. 5.0, 8.0, 12.0" />
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
                list="battery-location-list"
                placeholder="Garage shelf, Packout #3, Van..."
                className="w-full px-3 py-2 bg-surface border border-bd-input rounded-lg text-fg placeholder-fg-faint focus:outline-none focus:border-accent transition-colors"
              />
              <datalist id="battery-location-list">
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
            <Field label="Label" name="custom_field_1_label" value={form.custom_field_1_label} onChange={handleChange} placeholder="e.g. Cell Type" />
            <Field label="Value" name="custom_field_1_value" value={form.custom_field_1_value} onChange={handleChange} placeholder="e.g. 21700" />
          </div>
          <div className="grid grid-cols-[1fr_2fr] gap-3">
            <Field label="Label" name="custom_field_2_label" value={form.custom_field_2_label} onChange={handleChange} placeholder="e.g. Cycle Count" />
            <Field label="Value" name="custom_field_2_value" value={form.custom_field_2_value} onChange={handleChange} placeholder="e.g. 150" />
          </div>
        </div>

        {isEdit && (
          <div className="bg-card border border-bd rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider">Tags</h2>
            <TagPicker itemId={id} itemType="battery" />
          </div>
        )}

        {isEdit && <BatteryPhotoUpload batteryId={id} />}
        {isEdit && <BatteryReceiptUpload batteryId={id} />}

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
            {saving ? 'Saving...' : isEdit ? 'Update Battery' : 'Save Battery'}
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
