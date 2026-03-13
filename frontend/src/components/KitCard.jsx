import { Link } from 'react-router-dom'
import { Package, Briefcase, CheckCircle2 } from 'lucide-react'

export default function KitCard({ kit }) {
  const toolCount = kit.kit_tools?.length || 0
  const checkedCount = kit.kit_tools?.filter((t) => t.checked).length || 0
  const isJob = kit.type === 'job'
  const isComplete = kit.status === 'complete' || kit.status === 'archived'

  return (
    <Link
      to={`/kits/${kit.id}`}
      className="flex items-center gap-4 bg-card border border-bd rounded-lg p-4 hover:border-bd-input transition-colors cursor-pointer shadow-sm"
    >
      <div className="w-12 h-12 rounded-lg bg-bd flex items-center justify-center flex-shrink-0">
        {isJob ? <Briefcase size={22} className="text-fg-faint" /> : <Package size={22} className="text-fg-faint" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-fg font-medium truncate">{kit.name}</h3>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${
            isJob ? 'bg-accent/15 text-accent' : 'bg-bd text-fg-muted'
          }`}>
            {isJob ? 'Job' : 'Permanent'}
          </span>
          {isComplete && (
            <CheckCircle2 size={14} className="text-ok flex-shrink-0" />
          )}
        </div>
        <p className="text-sm text-fg-muted">
          {toolCount} {toolCount === 1 ? 'tool' : 'tools'}
          {isJob && toolCount > 0 && ` · ${checkedCount} of ${toolCount} gathered`}
        </p>
        {isJob && toolCount > 0 && (
          <div className="mt-1.5 h-1.5 bg-bd rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${(checkedCount / toolCount) * 100}%` }}
            />
          </div>
        )}
      </div>
    </Link>
  )
}
