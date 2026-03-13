import { useState, useEffect } from 'react'
import { X, Check, Plus, Package, Briefcase } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function AddToKitModal({ toolId, onClose }) {
  const [kits, setKits] = useState([])
  const [memberOf, setMemberOf] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)

  useEffect(() => {
    async function load() {
      const [kitsRes, memberRes] = await Promise.all([
        supabase
          .from('kits')
          .select('id, name, type, status')
          .eq('status', 'active')
          .order('updated_at', { ascending: false }),
        supabase
          .from('kit_tools')
          .select('kit_id')
          .eq('tool_id', toolId),
      ])

      setKits(kitsRes.data || [])
      setMemberOf(new Set((memberRes.data || []).map((r) => r.kit_id)))
      setLoading(false)
    }
    load()
  }, [toolId])

  async function toggleKit(kitId) {
    setSaving(kitId)
    if (memberOf.has(kitId)) {
      await supabase
        .from('kit_tools')
        .delete()
        .eq('kit_id', kitId)
        .eq('tool_id', toolId)
      setMemberOf((prev) => {
        const next = new Set(prev)
        next.delete(kitId)
        return next
      })
    } else {
      await supabase
        .from('kit_tools')
        .insert({ kit_id: kitId, tool_id: toolId })
      setMemberOf((prev) => new Set(prev).add(kitId))
    }
    setSaving(null)
  }

  return (
    <div className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-4">
      <div className="bg-card border border-bd rounded-xl w-full max-w-sm max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-bd">
          <h3 className="text-lg font-semibold text-fg">Add to Kit</h3>
          <button onClick={onClose} className="text-fg-muted hover:text-fg cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : kits.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-fg-muted mb-3">No active kits.</p>
              <a
                href="/kits/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-accent hover:bg-accent/10 rounded-lg transition-colors"
              >
                <Plus size={16} />
                Create a Kit
              </a>
            </div>
          ) : (
            kits.map((kit) => {
              const inKit = memberOf.has(kit.id)
              const isJob = kit.type === 'job'

              return (
                <button
                  key={kit.id}
                  onClick={() => toggleKit(kit.id)}
                  disabled={saving === kit.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-bd transition-colors cursor-pointer disabled:opacity-50"
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                    inKit ? 'bg-accent border-accent' : 'border-bd-input'
                  }`}>
                    {inKit && <Check size={14} className="text-white" />}
                  </div>
                  {isJob ? (
                    <Briefcase size={16} className="text-fg-faint flex-shrink-0" />
                  ) : (
                    <Package size={16} className="text-fg-faint flex-shrink-0" />
                  )}
                  <span className="text-sm text-fg truncate">{kit.name}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
                    isJob ? 'bg-accent/15 text-accent' : 'bg-bd text-fg-muted'
                  }`}>
                    {isJob ? 'Job' : 'Perm'}
                  </span>
                </button>
              )
            })
          )}
        </div>

        <div className="p-4 border-t border-bd">
          <button
            onClick={onClose}
            className="w-full py-2 bg-bd hover:bg-bd-input text-fg text-sm rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
