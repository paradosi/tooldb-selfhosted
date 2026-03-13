import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, Package, ChevronDown, ChevronRight } from 'lucide-react'
import useUserKits from '../hooks/useUserKits'
import KitCard from '../components/KitCard'

export default function KitListPage() {
  const { kits, loading, error } = useUserKits()
  const [showArchived, setShowArchived] = useState(false)

  const activeKits = kits.filter((k) => k.status === 'active')
  const archivedKits = kits.filter((k) => k.status === 'complete' || k.status === 'archived')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="sticky top-0 z-30 bg-bg pt-1 pb-4 -mx-6 px-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-fg">Kits</h1>
        <Link
          to="/kits/new"
          className="flex items-center gap-2 px-3 py-2 md:px-4 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
        >
          <PlusCircle size={18} />
          <span className="hidden sm:inline">New Kit</span>
        </Link>
      </div>

      {error && (
        <div className="bg-warn/10 border border-warn/30 rounded-lg p-4 mb-6">
          <p className="text-warn text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : kits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-bd flex items-center justify-center mb-4">
            <Package size={28} className="text-fg-faint" />
          </div>
          <h2 className="text-lg font-medium text-fg mb-2">No kits yet</h2>
          <p className="text-fg-muted mb-6">
            Create a kit to group tools for a job or organize your collection.
          </p>
          <Link
            to="/kits/new"
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
          >
            <PlusCircle size={18} />
            New Kit
          </Link>
        </div>
      ) : (
        <>
          {/* Active Kits */}
          <div className="mb-8">
            <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider mb-4">
              Active Kits ({activeKits.length})
            </h2>
            {activeKits.length === 0 ? (
              <p className="text-sm text-fg-muted py-4">No active kits.</p>
            ) : (
              <div className="grid gap-3">
                {activeKits.map((kit) => (
                  <KitCard key={kit.id} kit={kit} />
                ))}
              </div>
            )}
          </div>

          {/* Archived Kits */}
          {archivedKits.length > 0 && (
            <div>
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="flex items-center gap-2 text-sm font-medium text-fg-muted uppercase tracking-wider mb-4 cursor-pointer hover:text-fg transition-colors"
              >
                {showArchived ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                Archived ({archivedKits.length})
              </button>
              {showArchived && (
                <div className="grid gap-3">
                  {archivedKits.map((kit) => (
                    <KitCard key={kit.id} kit={kit} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
