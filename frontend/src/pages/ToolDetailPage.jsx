import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, FileText, Image, BookOpen, Wrench, Youtube, ExternalLink, UserCheck, Copy, HandHelping, Undo2, ShieldAlert, Package } from 'lucide-react'
import posthog from 'posthog-js'
import { supabase } from '../lib/supabase'
import PhotoGallery from '../components/PhotoGallery'
import MaintenanceTimeline from '../components/MaintenanceTimeline'
import AddMaintenanceForm from '../components/AddMaintenanceForm'
import AddToKitModal from '../components/AddToKitModal'

export default function ToolDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tool, setTool] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLendModal, setShowLendModal] = useState(false)
  const [lendName, setLendName] = useState('')
  const [lending, setLending] = useState(false)
  const [showKitModal, setShowKitModal] = useState(false)

  const fetchTool = useCallback(async () => {
    const { data, error } = await supabase
      .from('user_tools')
      .select('*, user_tool_photos(*), user_tool_receipts(*), user_maintenance_logs(*), user_tool_tags(tag_id, user_tags(id, name, color)), tools:catalog_tool_id(tool_images(url, is_primary))')
      .eq('id', id)
      .single()

    if (error || !data) {
      navigate('/', { replace: true })
      return
    }

    setTool(data)
    setLoading(false)
  }, [id, navigate])

  useEffect(() => {
    fetchTool()
  }, [fetchTool])

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('user_tools').delete().eq('id', id)
    posthog.capture('tool_deleted', {
      tool_id: id,
      tool_name: tool.name,
      tool_brand: tool.brand,
      tool_type: tool.tool_type,
    })
    navigate('/', { replace: true })
  }

  async function handleDuplicate() {
    setDuplicating(true)
    const { data, error } = await supabase
      .from('user_tools')
      .insert({
        user_id: tool.user_id,
        catalog_tool_id: tool.catalog_tool_id,
        upc: tool.upc,
        name: tool.name,
        brand: tool.brand,
        model_number: tool.model_number,
        serial_number: null,
        tool_type: tool.tool_type,
        purchase_date: tool.purchase_date,
        purchase_price: tool.purchase_price,
        retailer: tool.retailer,
        warranty_expiry: tool.warranty_expiry,
        condition: tool.condition,
        location: tool.location,
        notes: tool.notes,
        custom_field_1_label: tool.custom_field_1_label,
        custom_field_1_value: tool.custom_field_1_value,
        custom_field_2_label: tool.custom_field_2_label,
        custom_field_2_value: tool.custom_field_2_value,
      })
      .select()
      .single()

    if (!error && data) {
      posthog.capture('tool_duplicated', {
        original_tool_id: id,
        new_tool_id: data.id,
        tool_name: tool.name,
        tool_brand: tool.brand,
        tool_type: tool.tool_type,
      })
      navigate(`/tools/${data.id}/edit`)
    }
    setDuplicating(false)
  }

  async function handleLend() {
    if (!lendName.trim()) return
    setLending(true)
    await supabase
      .from('user_tools')
      .update({ lent_to: lendName.trim(), lent_date: new Date().toISOString().slice(0, 10) })
      .eq('id', id)
    posthog.capture('tool_lent', {
      tool_id: id,
      tool_name: tool.name,
      tool_brand: tool.brand,
      tool_type: tool.tool_type,
    })
    setShowLendModal(false)
    setLendName('')
    setLending(false)
    fetchTool()
  }

  async function handleReturn() {
    await supabase
      .from('user_tools')
      .update({ lent_to: null, lent_date: null })
      .eq('id', id)
    posthog.capture('tool_returned', {
      tool_id: id,
      tool_name: tool.name,
      tool_brand: tool.brand,
      tool_type: tool.tool_type,
    })
    fetchTool()
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
            onClick={() => navigate('/')}
            className="text-fg-muted hover:text-fg transition-colors cursor-pointer mt-1 flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-fg break-words">{tool.name}</h1>
            {(tool.brand || tool.model_number) && (
              <p className="text-sm text-fg-muted">
                {[tool.brand, tool.model_number].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            title="Duplicate tool"
            className="flex items-center gap-2 px-3 py-2 bg-bd hover:bg-bd-input text-fg text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <Copy size={16} />
            <span className="hidden sm:inline">{duplicating ? 'Duplicating...' : 'Duplicate'}</span>
          </button>
          <Link
            to={`/tools/${id}/edit`}
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

      {/* Tags, Lent Out & Quick Actions */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {tool.lent_to ? (
          <>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-warn/15 text-warn">
              <UserCheck size={12} />
              Lent to {tool.lent_to}
              {tool.lent_date && (
                <span className="text-warn/70 ml-1">
                  {new Date(tool.lent_date).toLocaleDateString()}
                </span>
              )}
            </span>
            <button
              onClick={handleReturn}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-ok/15 text-ok hover:bg-ok/25 transition-colors cursor-pointer"
            >
              <Undo2 size={12} />
              Mark Returned
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowLendModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-bd text-fg-muted hover:text-fg hover:bg-bd-input transition-colors cursor-pointer"
          >
            <HandHelping size={12} />
            Lend Tool
          </button>
        )}
        <button
          onClick={() => setShowKitModal(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-bd text-fg-muted hover:text-fg hover:bg-bd-input transition-colors cursor-pointer"
        >
          <Package size={12} />
          Add to Kit
        </button>
        {tool.user_tool_tags?.map((tt) => (
          <span
            key={tt.user_tags.id}
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: tt.user_tags.color }}
          >
            {tt.user_tags.name}
          </span>
        ))}
      </div>

      {/* Photos */}
      {tool.user_tool_photos?.length > 0 ? (
        <div className="mb-6">
          <PhotoGallery photos={tool.user_tool_photos} />
        </div>
      ) : tool.tools?.tool_images?.length > 0 && (
        <div className="mb-6">
          <img
            src={(tool.tools.tool_images.find((p) => p.is_primary) || tool.tools.tool_images[0]).url}
            alt={tool.name}
            className="w-full max-w-md rounded-xl object-contain bg-surface border border-bd"
          />
        </div>
      )}

      {/* Details */}
      <div className="bg-card border border-bd rounded-xl p-6 mb-6">
        <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider mb-4">Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailField label="Serial Number" value={tool.serial_number} />
          <DetailField label="Tool Type" value={tool.tool_type} />
          <DetailField label="Condition" value={tool.condition} />
          <DetailField label="Location" value={tool.location} />
          <DetailField label="Purchase Date" value={tool.purchase_date && new Date(tool.purchase_date).toLocaleDateString()} />
          <DetailField label="Purchase Price" value={tool.purchase_price && `$${parseFloat(tool.purchase_price).toFixed(2)}`} />
          <DetailField label="Retailer" value={tool.retailer} />
          {tool.warranty_expiry && (
            <div>
              <p className="text-xs text-fg-muted mb-0.5">Warranty Expiry</p>
              {new Date(tool.warranty_expiry) < new Date() ? (
                <p className="text-sm text-warn flex items-center gap-1">
                  <ShieldAlert size={14} />
                  {new Date(tool.warranty_expiry).toLocaleDateString()} — Expired
                </p>
              ) : (
                <p className="text-sm text-ok">{new Date(tool.warranty_expiry).toLocaleDateString()}</p>
              )}
            </div>
          )}
          <DetailField label="Lent To" value={tool.lent_to} />
          <DetailField label="Lent Date" value={tool.lent_date && new Date(tool.lent_date).toLocaleDateString()} />
          <DetailField label={tool.custom_field_1_label} value={tool.custom_field_1_value} />
          <DetailField label={tool.custom_field_2_label} value={tool.custom_field_2_value} />
        </div>
        {tool.notes && (
          <div className="mt-4 pt-4 border-t border-bd">
            <p className="text-xs text-fg-muted mb-1">Notes</p>
            <p className="text-sm text-fg-secondary whitespace-pre-wrap">{tool.notes}</p>
          </div>
        )}
      </div>

      {/* Quick Links */}
      {(tool.brand || tool.model_number) && (
        <div className="bg-card border border-bd rounded-xl p-6 mb-6">
          <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider mb-4">Resources</h2>
          <div className="flex flex-wrap gap-2">
            <QuickLink
              icon={BookOpen}
              label="Find Manual"
              href={`https://www.manualslib.com/search/?q=${encodeURIComponent([tool.brand, tool.model_number].filter(Boolean).join(' '))}`}
            />
            <QuickLink
              icon={Wrench}
              label="Find Parts"
              href={`https://www.ereplacementparts.com/search?q=${encodeURIComponent([tool.brand, tool.model_number].filter(Boolean).join(' '))}`}
            />
            <QuickLink
              icon={Youtube}
              label="Repair Videos"
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent([tool.brand, tool.model_number, 'repair'].filter(Boolean).join(' '))}`}
            />
          </div>
        </div>
      )}

      {/* Receipts */}
      {tool.user_tool_receipts?.length > 0 && (
        <div className="bg-card border border-bd rounded-xl p-6 mb-6">
          <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider mb-4">Receipts & Documents</h2>
          <div className="space-y-2">
            {tool.user_tool_receipts.map((receipt) => (
              <a
                key={receipt.id}
                href={receipt.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-surface border border-bd rounded-lg px-4 py-3 hover:border-bd-input transition-colors"
              >
                {receipt.file_type === 'application/pdf' ? (
                  <FileText size={18} className="text-warn flex-shrink-0" />
                ) : (
                  <Image size={18} className="text-accent flex-shrink-0" />
                )}
                <span className="text-sm text-fg">{receipt.label}</span>
                <span className="text-xs text-fg-faint ml-auto">View</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Maintenance Log */}
      <div className="bg-card border border-bd rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider">Maintenance Log</h2>
        </div>
        <MaintenanceTimeline logs={tool.user_maintenance_logs} />
        <div className="mt-4">
          <AddMaintenanceForm toolId={id} onAdded={fetchTool} />
        </div>
      </div>

      {/* Lend Modal */}
      {showLendModal && (
        <div className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-4">
          <div className="bg-card border border-bd rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-fg mb-2">Lend Tool</h3>
            <p className="text-sm text-fg-muted mb-4">Who are you lending this to?</p>
            <input
              type="text"
              value={lendName}
              onChange={(e) => setLendName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLend()}
              placeholder="Name..."
              autoFocus
              className="w-full px-3 py-2 bg-surface border border-bd-input rounded-lg text-fg placeholder-fg-faint text-sm focus:outline-none focus:border-accent transition-colors mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowLendModal(false); setLendName('') }}
                className="flex-1 py-2 bg-bd hover:bg-bd-input text-fg text-sm rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleLend}
                disabled={!lendName.trim() || lending}
                className="flex-1 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                {lending ? 'Saving...' : 'Lend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Kit Modal */}
      {showKitModal && (
        <AddToKitModal toolId={id} onClose={() => setShowKitModal(false)} />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-4">
          <div className="bg-card border border-bd rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-fg mb-2">Delete {tool.name}?</h3>
            <p className="text-sm text-fg-muted mb-6">
              This will permanently delete this tool and all its photos, receipts, and maintenance records. This cannot be undone.
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

function QuickLink({ icon: Icon, label, href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 bg-surface border border-bd rounded-lg text-sm text-fg-muted hover:text-fg hover:border-bd-input transition-colors"
    >
      <Icon size={16} />
      {label}
      <ExternalLink size={12} className="ml-auto" />
    </a>
  )
}

function DetailField({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-fg-muted mb-0.5">{label}</p>
      <p className="text-sm text-fg">{value}</p>
    </div>
  )
}
