import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, FileText, Image, Battery, UserCheck, Copy, HandHelping, Undo2, ShieldAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PhotoGallery from '../components/PhotoGallery'

export default function BatteryDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [battery, setBattery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLendModal, setShowLendModal] = useState(false)
  const [lendName, setLendName] = useState('')
  const [lending, setLending] = useState(false)

  const fetchBattery = useCallback(async () => {
    const { data, error } = await supabase
      .from('user_batteries')
      .select('*, user_battery_photos(*), user_battery_receipts(*), user_battery_tags(tag_id, user_tags(id, name, color))')
      .eq('id', id)
      .single()

    if (error || !data) {
      navigate('/batteries', { replace: true })
      return
    }

    setBattery(data)
    setLoading(false)
  }, [id, navigate])

  useEffect(() => {
    fetchBattery()
  }, [fetchBattery])

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('user_batteries').delete().eq('id', id)
    navigate('/batteries', { replace: true })
  }

  async function handleDuplicate() {
    setDuplicating(true)
    const { data, error } = await supabase
      .from('user_batteries')
      .insert({
        user_id: battery.user_id,
        name: battery.name,
        brand: battery.brand,
        platform: battery.platform,
        model_number: battery.model_number,
        serial_number: null,
        voltage: battery.voltage,
        capacity_ah: battery.capacity_ah,
        purchase_date: battery.purchase_date,
        purchase_price: battery.purchase_price,
        retailer: battery.retailer,
        warranty_expiry: battery.warranty_expiry,
        condition: battery.condition,
        location: battery.location,
        notes: battery.notes,
        custom_field_1_label: battery.custom_field_1_label,
        custom_field_1_value: battery.custom_field_1_value,
        custom_field_2_label: battery.custom_field_2_label,
        custom_field_2_value: battery.custom_field_2_value,
      })
      .select()
      .single()

    if (!error && data) {
      navigate(`/batteries/${data.id}/edit`)
    }
    setDuplicating(false)
  }

  async function handleLend() {
    if (!lendName.trim()) return
    setLending(true)
    await supabase
      .from('user_batteries')
      .update({ lent_to: lendName.trim(), lent_date: new Date().toISOString().slice(0, 10) })
      .eq('id', id)
    setShowLendModal(false)
    setLendName('')
    setLending(false)
    fetchBattery()
  }

  async function handleReturn() {
    await supabase
      .from('user_batteries')
      .update({ lent_to: null, lent_date: null })
      .eq('id', id)
    fetchBattery()
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
            onClick={() => navigate('/batteries')}
            className="text-fg-muted hover:text-fg transition-colors cursor-pointer mt-1 flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-fg break-words">{battery.name}</h1>
            {(battery.brand || battery.platform || battery.voltage) && (
              <p className="text-sm text-fg-muted">
                {[battery.brand, battery.platform, battery.voltage].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            title="Duplicate battery"
            className="flex items-center gap-2 px-3 py-2 bg-bd hover:bg-bd-input text-fg text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <Copy size={16} />
            <span className="hidden sm:inline">{duplicating ? 'Duplicating...' : 'Duplicate'}</span>
          </button>
          <Link
            to={`/batteries/${id}/edit`}
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
        {battery.lent_to ? (
          <>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-warn/15 text-warn">
              <UserCheck size={12} />
              Lent to {battery.lent_to}
              {battery.lent_date && (
                <span className="text-warn/70 ml-1">
                  {new Date(battery.lent_date).toLocaleDateString()}
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
            Lend Battery
          </button>
        )}
        {battery.user_battery_tags?.map((bt) => (
          <span
            key={bt.user_tags.id}
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: bt.user_tags.color }}
          >
            {bt.user_tags.name}
          </span>
        ))}
      </div>

      {/* Photos */}
      {battery.user_battery_photos?.length > 0 && (
        <div className="mb-6">
          <PhotoGallery photos={battery.user_battery_photos} />
        </div>
      )}

      {/* Details */}
      <div className="bg-card border border-bd rounded-xl p-6 mb-6">
        <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider mb-4">Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailField label="Model Number" value={battery.model_number} />
          <DetailField label="Serial Number" value={battery.serial_number} />
          <DetailField label="Voltage" value={battery.voltage} />
          <DetailField label="Capacity" value={battery.capacity_ah && `${battery.capacity_ah} Ah`} />
          <DetailField label="Condition" value={battery.condition} />
          <DetailField label="Location" value={battery.location} />
          <DetailField label="Purchase Date" value={battery.purchase_date && new Date(battery.purchase_date).toLocaleDateString()} />
          <DetailField label="Purchase Price" value={battery.purchase_price && `$${parseFloat(battery.purchase_price).toFixed(2)}`} />
          <DetailField label="Retailer" value={battery.retailer} />
          {battery.warranty_expiry && (
            <div>
              <p className="text-xs text-fg-muted mb-0.5">Warranty Expiry</p>
              {new Date(battery.warranty_expiry) < new Date() ? (
                <p className="text-sm text-warn flex items-center gap-1">
                  <ShieldAlert size={14} />
                  {new Date(battery.warranty_expiry).toLocaleDateString()} — Expired
                </p>
              ) : (
                <p className="text-sm text-ok">{new Date(battery.warranty_expiry).toLocaleDateString()}</p>
              )}
            </div>
          )}
          <DetailField label="Lent To" value={battery.lent_to} />
          <DetailField label="Lent Date" value={battery.lent_date && new Date(battery.lent_date).toLocaleDateString()} />
          <DetailField label={battery.custom_field_1_label} value={battery.custom_field_1_value} />
          <DetailField label={battery.custom_field_2_label} value={battery.custom_field_2_value} />
        </div>
        {battery.notes && (
          <div className="mt-4 pt-4 border-t border-bd">
            <p className="text-xs text-fg-muted mb-1">Notes</p>
            <p className="text-sm text-fg-secondary whitespace-pre-wrap">{battery.notes}</p>
          </div>
        )}
      </div>

      {/* Receipts */}
      {battery.user_battery_receipts?.length > 0 && (
        <div className="bg-card border border-bd rounded-xl p-6 mb-6">
          <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider mb-4">Receipts & Documents</h2>
          <div className="space-y-2">
            {battery.user_battery_receipts.map((receipt) => (
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

      {/* Lend Modal */}
      {showLendModal && (
        <div className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-4">
          <div className="bg-card border border-bd rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-fg mb-2">Lend Battery</h3>
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

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-4">
          <div className="bg-card border border-bd rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-fg mb-2">Delete {battery.name}?</h3>
            <p className="text-sm text-fg-muted mb-6">
              This will permanently delete this battery and all its photos and receipts. This cannot be undone.
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

function DetailField({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-fg-muted mb-0.5">{label}</p>
      <p className="text-sm text-fg">{value}</p>
    </div>
  )
}
