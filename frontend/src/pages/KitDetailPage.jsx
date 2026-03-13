import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, Plus, CheckCircle2, Circle, Archive, RotateCcw, X } from 'lucide-react'
import posthog from 'posthog-js'
import { supabase } from '../lib/supabase'
import ToolPickerModal from '../components/ToolPickerModal'

export default function KitDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [kit, setKit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showToolPicker, setShowToolPicker] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState(null)

  const fetchKit = useCallback(async () => {
    const { data, error } = await supabase
      .from('kits')
      .select('*, kit_tools(id, tool_id, checked, user_tools(id, name, brand, model_number, user_tool_photos(url)))')
      .eq('id', id)
      .single()

    if (error || !data) {
      navigate('/kits', { replace: true })
      return
    }

    setKit(data)
    setLoading(false)
  }, [id, navigate])

  useEffect(() => {
    fetchKit()
  }, [fetchKit])

  const isJob = kit?.type === 'job'
  const isActive = kit?.status === 'active'
  const tools = kit?.kit_tools || []
  const checkedCount = tools.filter((t) => t.checked).length
  const totalCount = tools.length

  async function toggleChecked(kitToolId, currentChecked) {
    setTogglingId(kitToolId)
    await supabase
      .from('kit_tools')
      .update({ checked: !currentChecked })
      .eq('id', kitToolId)

    setKit((prev) => ({
      ...prev,
      kit_tools: prev.kit_tools.map((kt) =>
        kt.id === kitToolId ? { ...kt, checked: !currentChecked } : kt
      ),
    }))
    setTogglingId(null)
  }

  async function removeTool(kitToolId) {
    await supabase.from('kit_tools').delete().eq('id', kitToolId)
    setKit((prev) => ({
      ...prev,
      kit_tools: prev.kit_tools.filter((kt) => kt.id !== kitToolId),
    }))
  }

  async function markComplete() {
    await supabase
      .from('kits')
      .update({ status: 'complete', updated_at: new Date().toISOString() })
      .eq('id', id)
    posthog.capture('kit_completed', {
      kit_id: id,
      kit_name: kit.name,
      kit_type: kit.type,
      tool_count: tools.length,
    })
    setKit((prev) => ({ ...prev, status: 'complete' }))
  }

  async function reactivate() {
    await supabase
      .from('kits')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', id)
    setKit((prev) => ({ ...prev, status: 'active' }))
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('kits').delete().eq('id', id)
    navigate('/kits', { replace: true })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="flex items-start gap-3 min-w-0">
          <button
            onClick={() => navigate('/kits')}
            className="text-fg-muted hover:text-fg transition-colors cursor-pointer mt-1 flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-fg break-words">{kit.name}</h1>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${
                isJob ? 'bg-accent/15 text-accent' : 'bg-bd text-fg-muted'
              }`}>
                {isJob ? 'Job' : 'Permanent'}
              </span>
              {!isActive && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-ok/15 text-ok flex-shrink-0">
                  Complete
                </span>
              )}
            </div>
            {kit.description && (
              <p className="text-sm text-fg-muted mt-1">{kit.description}</p>
            )}
            {isJob && totalCount > 0 && (
              <p className="text-sm text-fg-muted mt-1">
                {checkedCount} of {totalCount} gathered
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isJob && isActive && (
            <button
              onClick={markComplete}
              className="flex items-center gap-2 px-3 py-2 bg-ok hover:bg-ok/80 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              <CheckCircle2 size={16} />
              <span className="hidden sm:inline">Complete</span>
            </button>
          )}
          {!isActive && (
            <button
              onClick={reactivate}
              className="flex items-center gap-2 px-3 py-2 bg-bd hover:bg-bd-input text-fg text-sm rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw size={16} />
              <span className="hidden sm:inline">Reactivate</span>
            </button>
          )}
          <Link
            to={`/kits/${id}/edit`}
            className="flex items-center gap-2 px-3 py-2 bg-bd hover:bg-bd-input text-fg text-sm rounded-lg transition-colors"
          >
            <Pencil size={16} />
            <span className="hidden sm:inline">Edit</span>
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-3 py-2 text-warn hover:bg-warn/10 text-sm rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Progress bar for job kits */}
      {isJob && totalCount > 0 && (
        <div className="mb-6">
          <div className="h-2 bg-bd rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${(checkedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* All gathered prompt */}
      {isJob && isActive && totalCount > 0 && checkedCount === totalCount && (
        <div className="bg-ok/10 border border-ok/30 rounded-lg p-4 mb-6 flex items-center justify-between">
          <p className="text-sm text-ok font-medium">All tools gathered!</p>
          <button
            onClick={markComplete}
            className="px-3 py-1.5 bg-ok hover:bg-ok/80 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            Mark Complete
          </button>
        </div>
      )}

      {/* Tool List */}
      <div className="bg-card border border-bd rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider">
            Tools ({totalCount})
          </h2>
          {isActive && (
            <button
              onClick={() => setShowToolPicker(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-accent hover:bg-accent/10 rounded-lg transition-colors cursor-pointer"
            >
              <Plus size={16} />
              Add Tools
            </button>
          )}
        </div>

        {totalCount === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-fg-muted mb-3">No tools in this kit yet.</p>
            {isActive && (
              <button
                onClick={() => setShowToolPicker(true)}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                Add Tools
              </button>
            )}
          </div>
        ) : isJob ? (
          /* Job Kit: Checklist View */
          <div className="space-y-1">
            {tools.map((kt) => {
              const tool = kt.user_tools
              if (!tool) return null
              const photo = tool.user_tool_photos?.[0]?.url

              return (
                <div
                  key={kt.id}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group ${
                    kt.checked ? 'opacity-60' : ''
                  }`}
                >
                  <button
                    onClick={() => isActive && toggleChecked(kt.id, kt.checked)}
                    disabled={!isActive || togglingId === kt.id}
                    className="flex-shrink-0 cursor-pointer disabled:cursor-default"
                  >
                    {kt.checked ? (
                      <CheckCircle2 size={22} className="text-ok" />
                    ) : (
                      <Circle size={22} className="text-fg-faint hover:text-accent transition-colors" />
                    )}
                  </button>

                  {photo && (
                    <img
                      src={photo}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                  )}

                  <Link to={`/tools/${tool.id}`} className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${kt.checked ? 'text-fg-muted line-through' : 'text-fg'}`}>
                      {tool.name}
                    </p>
                    <p className="text-xs text-fg-muted truncate">
                      {[tool.brand, tool.model_number].filter(Boolean).join(' · ')}
                    </p>
                  </Link>

                  {isActive && (
                    <button
                      onClick={() => removeTool(kt.id)}
                      className="opacity-0 group-hover:opacity-100 text-fg-faint hover:text-warn transition-all cursor-pointer flex-shrink-0"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          /* Permanent Kit: Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tools.map((kt) => {
              const tool = kt.user_tools
              if (!tool) return null
              const photo = tool.user_tool_photos?.[0]?.url

              return (
                <div
                  key={kt.id}
                  className="flex items-center gap-3 bg-surface border border-bd rounded-lg p-3 group"
                >
                  {photo ? (
                    <img
                      src={photo}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-bd flex items-center justify-center flex-shrink-0">
                      <span className="text-xs text-fg-faint">No img</span>
                    </div>
                  )}

                  <Link to={`/tools/${tool.id}`} className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg truncate">{tool.name}</p>
                    <p className="text-xs text-fg-muted truncate">
                      {[tool.brand, tool.model_number].filter(Boolean).join(' · ')}
                    </p>
                  </Link>

                  {isActive && (
                    <button
                      onClick={() => removeTool(kt.id)}
                      className="opacity-0 group-hover:opacity-100 text-fg-faint hover:text-warn transition-all cursor-pointer flex-shrink-0"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Tool Picker Modal */}
      {showToolPicker && (
        <ToolPickerModal
          kitId={id}
          existingToolIds={tools.map((kt) => kt.tool_id)}
          onClose={() => setShowToolPicker(false)}
          onAdded={fetchKit}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-4">
          <div className="bg-card border border-bd rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-fg mb-2">Delete {kit.name}?</h3>
            <p className="text-sm text-fg-muted mb-6">
              This will delete the kit. Tools in this kit will not be removed from your collection.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 bg-bd hover:bg-bd-input text-fg text-sm rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 bg-warn hover:bg-warn/80 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
