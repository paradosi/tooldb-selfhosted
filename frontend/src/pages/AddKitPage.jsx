import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import posthog from 'posthog-js'
import { supabase } from '../lib/supabase'

export default function AddKitPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'permanent',
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    async function load() {
      const { data } = await supabase
        .from('kits')
        .select('name, description, type')
        .eq('id', id)
        .single()
      if (data) {
        setForm({ name: data.name, description: data.description || '', type: data.type })
      }
      setLoading(false)
    }
    load()
  }, [id, isEdit])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)

    if (isEdit) {
      await supabase
        .from('kits')
        .update({ name: form.name.trim(), description: form.description.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', id)
      navigate(`/kits/${id}`)
    } else {
      const { data } = await supabase
        .from('kits')
        .insert({ name: form.name.trim(), description: form.description.trim() || null, type: form.type })
        .select()
        .single()
      if (data) {
        posthog.capture('kit_created', {
          kit_id: data.id,
          kit_name: form.name.trim(),
          kit_type: form.type,
        })
        navigate(`/kits/${data.id}`)
      }
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(isEdit ? `/kits/${id}` : '/kits')}
          className="text-fg-muted hover:text-fg transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-fg">{isEdit ? 'Edit Kit' : 'New Kit'}</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-card border border-bd rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Truck Tools, Bathroom Lighting..."
              autoFocus
              className="w-full px-3 py-2 bg-surface border border-bd-input rounded-lg text-fg placeholder-fg-faint text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional notes about this kit..."
              rows={3}
              className="w-full px-3 py-2 bg-surface border border-bd-input rounded-lg text-fg placeholder-fg-faint text-sm focus:outline-none focus:border-accent transition-colors resize-none"
            />
          </div>

          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-fg mb-2">Kit Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: 'permanent' })}
                  className={`p-4 rounded-lg border text-left transition-colors cursor-pointer ${
                    form.type === 'permanent'
                      ? 'border-accent bg-accent/10'
                      : 'border-bd hover:border-bd-input'
                  }`}
                >
                  <p className="text-sm font-medium text-fg">Permanent</p>
                  <p className="text-xs text-fg-muted mt-1">Organize tools into groups</p>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: 'job' })}
                  className={`p-4 rounded-lg border text-left transition-colors cursor-pointer ${
                    form.type === 'job'
                      ? 'border-accent bg-accent/10'
                      : 'border-bd hover:border-bd-input'
                  }`}
                >
                  <p className="text-sm font-medium text-fg">Job</p>
                  <p className="text-xs text-fg-muted mt-1">Gather tools for a task</p>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={!form.name.trim() || saving}
            className="w-full py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Kit'}
          </button>
        </div>
      </form>
    </div>
  )
}
