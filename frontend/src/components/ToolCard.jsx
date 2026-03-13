import { Link } from 'react-router-dom'
import { Wrench, UserCheck } from 'lucide-react'

export default function ToolCard({ tool, view = 'list' }) {
  const primaryPhoto = tool.user_tool_photos?.find((p) => p.is_primary)
  const anyPhoto = primaryPhoto || tool.user_tool_photos?.[0] || null

  if (view === 'grid') {
    return (
      <Link
        to={`/tools/${tool.id}`}
        className="bg-card border border-bd rounded-lg overflow-hidden hover:border-bd-input transition-colors cursor-pointer shadow-sm"
      >
        {anyPhoto ? (
          <img
            src={anyPhoto.url}
            alt={tool.name}
            style={anyPhoto.rotation ? { transform: `rotate(${anyPhoto.rotation}deg) scale(1.2)` } : undefined}
            className="w-full aspect-square object-cover"
          />
        ) : (
          <div className="w-full aspect-square bg-bd flex items-center justify-center">
            <Wrench size={32} className="text-fg-faint" />
          </div>
        )}
        <div className="p-3">
          <h3 className="text-fg text-sm font-medium truncate">{tool.name}</h3>
          {(tool.brand || tool.model_number) && (
            <p className="text-xs text-fg-muted truncate">
              {[tool.brand, tool.model_number].filter(Boolean).join(' · ')}
            </p>
          )}
          {(tool.lent_to || tool.user_tool_tags?.length > 0) && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {tool.lent_to && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-warn/15 text-warn">
                  <UserCheck size={10} />
                  Lent
                </span>
              )}
              {tool.user_tool_tags?.map((tt) => (
                <span
                  key={tt.user_tags.id}
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tt.user_tags.color }}
                  title={tt.user_tags.name}
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
      to={`/tools/${tool.id}`}
      className="flex items-center gap-4 bg-card border border-bd rounded-lg p-4 hover:border-bd-input transition-colors cursor-pointer shadow-sm"
    >
      {anyPhoto ? (
        <img
          src={anyPhoto.url}
          alt={tool.name}
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-bd flex items-center justify-center flex-shrink-0">
          <Wrench size={24} className="text-fg-faint" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-fg font-medium truncate">{tool.name}</h3>
          {tool.lent_to && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-warn/15 text-warn flex-shrink-0">
              <UserCheck size={10} />
              Lent
            </span>
          )}
        </div>
        {(tool.brand || tool.model_number) && (
          <p className="text-sm text-fg-muted truncate">
            {[tool.brand, tool.model_number].filter(Boolean).join(' · ')}
          </p>
        )}
        {(tool.location || tool.user_tool_tags?.length > 0) && (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {tool.location && (
              <span className="text-xs text-fg-faint">{tool.location}</span>
            )}
            {tool.user_tool_tags?.map((tt) => (
              <span
                key={tt.user_tags.id}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{ backgroundColor: tt.user_tags.color + '26', color: tt.user_tags.color }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tt.user_tags.color }}
                />
                {tt.user_tags.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
