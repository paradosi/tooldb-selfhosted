import { useState, useEffect, useRef } from 'react'
import { X, Search, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ToolPickerModal({ kitId, existingToolIds = [], onClose, onAdded }) {
  const [search, setSearch] = useState('')
  const [tools, setTools] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    fetchTools('')
  }, [])

  async function fetchTools(query) {
    setLoading(true)
    let q = supabase
      .from('user_tools')
      .select('id, name, brand, model_number')
      .order('name')
      .limit(50)

    if (query.length >= 2) {
      q = q.or(`name.ilike.%${query}%,brand.ilike.%${query}%,model_number.ilike.%${query}%`)
    }

    const { data } = await q
    setTools(data || [])
    setLoading(false)
  }

  function handleSearch(value) {
    setSearch(value)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchTools(value), 300)
  }

  function toggleTool(toolId) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(toolId)) next.delete(toolId)
      else next.add(toolId)
      return next
    })
  }

  async function handleAdd() {
    if (selected.size === 0) return
    setSaving(true)

    const rows = [...selected].map((tool_id) => ({ kit_id: kitId, tool_id }))
    await supabase.from('kit_tools').insert(rows)

    setSaving(false)
    onAdded()
    onClose()
  }

  const existingSet = new Set(existingToolIds)

  return (
    <div className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-4">
      <div className="bg-card border border-bd rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-bd">
          <h3 className="text-lg font-semibold text-fg">Add Tools</h3>
          <button onClick={onClose} className="text-fg-muted hover:text-fg cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-bd">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search your tools..."
              className="w-full pl-9 pr-4 py-2 bg-surface border border-bd-input rounded-lg text-fg placeholder-fg-faint text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          {selected.size > 0 && (
            <p className="text-xs text-accent mt-2">{selected.size} tool{selected.size !== 1 ? 's' : ''} selected</p>
          )}
        </div>

        {/* Tool List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tools.length === 0 ? (
            <p className="text-sm text-fg-muted text-center py-8">No tools found.</p>
          ) : (
            tools.map((tool) => {
              const alreadyInKit = existingSet.has(tool.id)
              const isSelected = selected.has(tool.id)

              return (
                <button
                  key={tool.id}
                  onClick={() => !alreadyInKit && toggleTool(tool.id)}
                  disabled={alreadyInKit}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                    alreadyInKit
                      ? 'opacity-40 cursor-not-allowed'
                      : isSelected
                        ? 'bg-accent/10 border border-accent/30'
                        : 'hover:bg-bd border border-transparent'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-accent border-accent' : alreadyInKit ? 'bg-bd border-bd' : 'border-bd-input'
                  }`}>
                    {(isSelected || alreadyInKit) && <Check size={14} className="text-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg truncate">{tool.name}</p>
                    <p className="text-xs text-fg-muted truncate">
                      {[tool.brand, tool.model_number].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-bd flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-bd hover:bg-bd-input text-fg text-sm rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={selected.size === 0 || saving}
            className="flex-1 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            {saving ? 'Adding...' : `Add ${selected.size || ''} Tool${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
