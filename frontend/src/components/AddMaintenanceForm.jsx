import { useState } from 'react'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { post } from '../lib/api'

const TYPES = ['Service', 'Repair', 'Blade Change', 'Calibration', 'Cleaning', 'Other']

export default function AddMaintenanceForm({ toolId, onAdded }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Service',
    cost: '',
    notes: '',
  })

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      await post('/tools/' + toolId + '/maintenance', {
        date: form.date,
        type: form.type,
        cost: form.cost ? parseFloat(form.cost) : null,
        notes: form.notes || null,
      })

      setForm({
        date: new Date().toISOString().split('T')[0],
        type: 'Service',
        cost: '',
        notes: '',
      })
      setSaving(false)
      setOpen(false)
      onAdded()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors cursor-pointer"
      >
        {open ? <ChevronUp size={16} /> : <Plus size={16} />}
        {open ? 'Cancel' : 'Add entry'}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-3 bg-surface border border-bd rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="maint-date" className="block text-xs text-fg-muted mb-1">Date</label>
              <input
                id="maint-date"
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-card border border-bd-input rounded-lg text-fg text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label htmlFor="maint-type" className="block text-xs text-fg-muted mb-1">Type</label>
              <select
                id="maint-type"
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-card border border-bd-input rounded-lg text-fg text-sm focus:outline-none focus:border-accent transition-colors"
              >
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="maint-cost" className="block text-xs text-fg-muted mb-1">Cost ($)</label>
            <input
              id="maint-cost"
              name="cost"
              type="number"
              step="0.01"
              min="0"
              value={form.cost}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-card border border-bd-input rounded-lg text-fg text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label htmlFor="maint-notes" className="block text-xs text-fg-muted mb-1">Notes</label>
            <textarea
              id="maint-notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 bg-card border border-bd-input rounded-lg text-fg text-sm focus:outline-none focus:border-accent transition-colors resize-none"
            />
          </div>

          {error && <p className="text-xs text-warn">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            {saving ? 'Saving...' : 'Add Entry'}
          </button>
        </form>
      )}
    </div>
  )
}
