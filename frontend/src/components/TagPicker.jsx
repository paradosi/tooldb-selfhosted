import { useState, useEffect, useRef } from 'react'
import { Plus, X, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#fde047',
  '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#199bd6', '#6366f1', '#8b5cf6', '#ec4899',
  '#6b7280', '#ffffff', '#000000',
]

const BRAND_TAGS = [
  { name: 'Milwaukee', color: '#db0032' },
  { name: 'DeWalt', color: '#febd17' },
  { name: 'Makita', color: '#00a5b5' },
  { name: 'Bosch', color: '#005d9e' },
  { name: 'Festool', color: '#1a1a1a' },
  { name: 'Ridgid', color: '#f26522' },
  { name: 'Klein Tools', color: '#f26522' },
  { name: 'Knipex', color: '#cc0000' },
  { name: 'Wera', color: '#1a1a1a' },
  { name: 'Stabila', color: '#fdd000' },
  { name: 'Wiha', color: '#e30613' },
  { name: 'Stihl', color: '#f37a1f' },
  { name: 'Husqvarna', color: '#f26522' },
  { name: 'Metabo HPT', color: '#febd17' },
  { name: 'Metabo', color: '#005d32' },
  { name: 'EGO', color: '#4caf50' },
  { name: 'Greenworks', color: '#4caf50' },
  { name: 'Jet', color: '#1a3a5c' },
  { name: 'Toro', color: '#cc0000' },
  { name: 'GearWrench', color: '#f37a1f' },
  { name: 'Honda', color: '#cc0000' },
  { name: 'Knaack', color: '#d2691e' },
  { name: 'Generac', color: '#f26522' },
  { name: 'Weather Guard', color: '#cc0000' },
  { name: 'Rolair', color: '#005d32' },
  { name: 'SawStop', color: '#cc0000' },
  { name: 'Laguna', color: '#cc0000' },
  { name: 'Grizzly', color: '#005d32' },
  { name: 'Powermatic', color: '#febd17' },
  { name: 'Snap-on', color: '#cc0000' },
  { name: 'Matco', color: '#003da5' },
  { name: 'Mac Tools', color: '#cc0000' },
  { name: 'Hilti', color: '#cc0000' },
  { name: 'Stanley', color: '#febd17' },
  { name: 'Craftsman', color: '#cc0000' },
  { name: 'Ryobi', color: '#7ab51d' },
  { name: 'Kobalt', color: '#003da5' },
  { name: 'Harbor Freight', color: '#cc0000' },
  { name: 'Irwin', color: '#003da5' },
  { name: 'Channellock', color: '#003da5' },
  { name: 'Fluke', color: '#febd17' },
  { name: 'Leica', color: '#cc0000' },
  { name: 'Fein', color: '#f26522' },
  { name: 'Flex', color: '#febd17' },
  { name: 'Woodpeckers', color: '#cc0000' },
  { name: 'Bessey', color: '#cc0000' },
  { name: 'Dewalt Flexvolt', color: '#febd17' },
  { name: 'M12', color: '#db0032' },
  { name: 'M18', color: '#db0032' },
]

export default function TagPicker({ itemId, table = 'user_tool_tags', foreignKey = 'user_tool_id' }) {
  const { user } = useAuth()
  const [allTags, setAllTags] = useState([])
  const [assignedTagIds, setAssignedTagIds] = useState(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#3b82f6')
  const [showDropdown, setShowDropdown] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (!itemId) return
    loadTags()

    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false)
        setShowCreate(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [itemId])

  async function loadTags() {
    const [tagsRes, assignedRes] = await Promise.all([
      supabase
        .from('user_tags')
        .select('*')
        .eq('user_id', user.id)
        .order('name'),
      supabase
        .from(table)
        .select('tag_id')
        .eq(foreignKey, itemId),
    ])

    if (tagsRes.data) setAllTags(tagsRes.data)
    if (assignedRes.data) setAssignedTagIds(new Set(assignedRes.data.map((r) => r.tag_id)))
  }

  async function toggleTag(tagId) {
    if (assignedTagIds.has(tagId)) {
      await supabase
        .from(table)
        .delete()
        .eq(foreignKey, itemId)
        .eq('tag_id', tagId)
      setAssignedTagIds((prev) => {
        const next = new Set(prev)
        next.delete(tagId)
        return next
      })
    } else {
      await supabase
        .from(table)
        .insert({ [foreignKey]: itemId, tag_id: tagId })
      setAssignedTagIds((prev) => new Set(prev).add(tagId))
    }
  }

  async function createTag() {
    if (!newName.trim()) return

    const { data, error } = await supabase
      .from('user_tags')
      .insert({ user_id: user.id, name: newName.trim(), color: newColor })
      .select()
      .single()

    if (error) return
    if (data) {
      setAllTags((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      // Auto-assign to current item
      await supabase
        .from(table)
        .insert({ [foreignKey]: itemId, tag_id: data.id })
      setAssignedTagIds((prev) => new Set(prev).add(data.id))
    }

    setNewName('')
    setNewColor('#3b82f6')
    setShowCreate(false)
  }

  async function deleteTag(tagId) {
    await supabase.from('user_tags').delete().eq('id', tagId)
    setAllTags((prev) => prev.filter((t) => t.id !== tagId))
    setAssignedTagIds((prev) => {
      const next = new Set(prev)
      next.delete(tagId)
      return next
    })
  }

  async function addBrandTag(brand) {
    // Check if user already has this tag
    const existing = allTags.find((t) => t.name.toLowerCase() === brand.name.toLowerCase())
    if (existing) {
      if (!assignedTagIds.has(existing.id)) await toggleTag(existing.id)
      return
    }
    // Create and assign
    const { data, error } = await supabase
      .from('user_tags')
      .insert({ user_id: user.id, name: brand.name, color: brand.color })
      .select()
      .single()

    if (error || !data) return
    setAllTags((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    await supabase
      .from(table)
      .insert({ [foreignKey]: itemId, tag_id: data.id })
    setAssignedTagIds((prev) => new Set(prev).add(data.id))
  }

  if (!itemId) return null

  const assigned = allTags.filter((t) => assignedTagIds.has(t.id))
  const existingNames = new Set(allTags.map((t) => t.name.toLowerCase()))
  const suggestedBrands = BRAND_TAGS.filter(
    (b) => !existingNames.has(b.name.toLowerCase())
  )

  return (
    <div ref={wrapperRef} className="space-y-2">
      {/* Assigned tags */}
      <div className="flex flex-wrap gap-1.5">
        {assigned.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <button
              type="button"
              onClick={() => toggleTag(tag.id)}
              className="hover:opacity-70 cursor-pointer"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-fg-muted border border-dashed border-bd-input hover:border-accent hover:text-accent transition-colors cursor-pointer"
        >
          <Plus size={12} />
          Tag
        </button>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="bg-dropdown border border-bd-input rounded-lg shadow-lg p-2 space-y-1 max-h-80 overflow-y-auto">
          {allTags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleTag(tag.id)}
                className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-bd transition-colors cursor-pointer text-left"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-fg truncate">{tag.name}</span>
                {assignedTagIds.has(tag.id) && (
                  <Check size={14} className="text-accent ml-auto flex-shrink-0" />
                )}
              </button>
              <button
                type="button"
                onClick={() => deleteTag(tag.id)}
                className="text-fg-faint hover:text-warn p-1 cursor-pointer flex-shrink-0"
                title="Delete tag"
              >
                <X size={12} />
              </button>
            </div>
          ))}

          {suggestedBrands.length > 0 && (
            <div className="border-t border-bd pt-2 mt-1">
              <p className="text-[10px] text-fg-faint uppercase tracking-wider px-2 mb-1">Brand Tags</p>
              <div className="flex flex-wrap gap-1 px-1">
                {suggestedBrands.map((b) => (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => addBrandTag(b)}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium hover:opacity-80 transition-opacity cursor-pointer"
                    style={{ backgroundColor: b.color + '26', color: b.color }}
                  >
                    <Plus size={10} />
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!showCreate ? (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm text-fg-muted hover:text-accent hover:bg-bd transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Create new tag
            </button>
          ) : (
            <div className="border-t border-bd pt-2 mt-1 space-y-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createTag()}
                placeholder="Tag name..."
                autoFocus
                className="w-full px-2 py-1.5 bg-surface border border-bd-input rounded text-sm text-fg placeholder-fg-faint focus:outline-none focus:border-accent"
              />
              <div className="flex gap-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-5 h-5 rounded-full cursor-pointer border ${
                      newColor === c ? 'ring-2 ring-offset-1 ring-accent' : ''
                    } ${c === '#ffffff' || c === '#fde047' ? 'border-fg-faint' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setNewName('') }}
                  className="px-2 py-1 text-xs text-fg-muted hover:text-fg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={createTag}
                  disabled={!newName.trim()}
                  className="px-2 py-1 text-xs bg-accent text-white rounded disabled:opacity-50 cursor-pointer"
                >
                  Create
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
