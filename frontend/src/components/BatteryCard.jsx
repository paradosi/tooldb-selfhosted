import { Link } from 'react-router-dom'
import { Battery, UserCheck } from 'lucide-react'

export default function BatteryCard({ battery, view = 'list' }) {
  const primaryPhoto = battery.user_battery_photos?.find((p) => p.is_primary)
  const anyPhoto = primaryPhoto || battery.user_battery_photos?.[0]

  if (view === 'grid') {
    return (
      <Link
        to={`/batteries/${battery.id}`}
        className="bg-card border border-bd rounded-lg overflow-hidden hover:border-bd-input transition-colors cursor-pointer shadow-sm"
      >
        {anyPhoto ? (
          <img
            src={anyPhoto.url}
            alt={battery.name}
            style={anyPhoto.rotation ? { transform: `rotate(${anyPhoto.rotation}deg) scale(1.2)` } : undefined}
            className="w-full aspect-square object-cover"
          />
        ) : (
          <div className="w-full aspect-square bg-bd flex items-center justify-center">
            <Battery size={32} className="text-fg-faint" />
          </div>
        )}
        <div className="p-3">
          <h3 className="text-fg text-sm font-medium truncate">{battery.name}</h3>
          {(battery.brand || battery.voltage) && (
            <p className="text-xs text-fg-muted truncate">
              {[battery.brand, battery.voltage].filter(Boolean).join(' · ')}
            </p>
          )}
          {(battery.lent_to || battery.user_battery_tags?.length > 0) && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {battery.lent_to && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-warn/15 text-warn">
                  <UserCheck size={10} />
                  Lent
                </span>
              )}
              {battery.user_battery_tags?.map((bt) => (
                <span
                  key={bt.user_tags.id}
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: bt.user_tags.color }}
                  title={bt.user_tags.name}
                />
              ))}
            </div>
          )}
        </div>
      </Link>
    )
  }

  return (
    <Link
      to={`/batteries/${battery.id}`}
      className="flex items-center gap-4 bg-card border border-bd rounded-lg p-4 hover:border-bd-input transition-colors cursor-pointer shadow-sm"
    >
      {anyPhoto ? (
        <img
          src={anyPhoto.url}
          alt={battery.name}
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-bd flex items-center justify-center flex-shrink-0">
          <Battery size={24} className="text-fg-faint" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-fg font-medium truncate">{battery.name}</h3>
          {battery.lent_to && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-warn/15 text-warn flex-shrink-0">
              <UserCheck size={10} />
              Lent
            </span>
          )}
        </div>
        {(battery.brand || battery.platform || battery.voltage) && (
          <p className="text-sm text-fg-muted truncate">
            {[battery.brand, battery.platform, battery.voltage].filter(Boolean).join(' · ')}
          </p>
        )}
        {(battery.location || battery.user_battery_tags?.length > 0) && (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {battery.location && (
              <span className="text-xs text-fg-faint">{battery.location}</span>
            )}
            {battery.user_battery_tags?.map((bt) => (
              <span
                key={bt.user_tags.id}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{ backgroundColor: bt.user_tags.color + '26', color: bt.user_tags.color }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: bt.user_tags.color }}
                />
                {bt.user_tags.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
