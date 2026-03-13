const TYPE_COLORS = {
  Service: 'bg-accent/20 text-accent',
  Repair: 'bg-warn/20 text-warn',
  'Blade Change': 'bg-[#a855f7]/20 text-[#a855f7]',
  Calibration: 'bg-[#10b981]/20 text-ok',
  Cleaning: 'bg-[#06b6d4]/20 text-[#06b6d4]',
  Other: 'bg-[#666]/20 text-fg-muted',
}

export default function MaintenanceTimeline({ logs }) {
  if (!logs || logs.length === 0) {
    return <p className="text-sm text-fg-faint">No maintenance entries yet.</p>
  }

  const sorted = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div className="space-y-3">
      {sorted.map((log) => (
        <div
          key={log.id}
          className="bg-surface border border-bd rounded-lg px-4 py-3"
        >
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm text-fg-muted">
              {new Date(log.date).toLocaleDateString()}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[log.type] || TYPE_COLORS.Other}`}>
              {log.type}
            </span>
            {log.cost && (
              <span className="text-sm text-ok ml-auto">${parseFloat(log.cost).toFixed(2)}</span>
            )}
          </div>
          {log.notes && (
            <p className="text-sm text-fg-secondary">{log.notes}</p>
          )}
        </div>
      ))}
    </div>
  )
}
