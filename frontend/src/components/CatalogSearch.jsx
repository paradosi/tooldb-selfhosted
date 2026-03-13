import { useState, useRef, useEffect } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import useCatalogSearch from '../hooks/useCatalogSearch'

export default function CatalogSearch({ onSelect }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [toolCount, setToolCount] = useState('81,000+')
  const { results, loading, hasMore, search, loadMore, clear } = useCatalogSearch()
  const wrapperRef = useRef(null)

  useEffect(() => {
    supabase.from('tools').select('id', { count: 'exact', head: true }).then(({ count }) => {
      if (count) setToolCount(count.toLocaleString() + '+')
    })
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleChange(e) {
    const val = e.target.value
    setQuery(val)
    search(val)
    setOpen(true)
  }

  function handleSelect(tool) {
    onSelect({
      catalog_tool_id: tool.id,
      name: tool.name,
      brand: tool.brands?.name || '',
      model_number: tool.model_number || '',
    })
    setQuery('')
    clear()
    setOpen(false)
  }

  function handleClear() {
    setQuery('')
    clear()
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm text-fg-muted mb-1">
        Search ToolDB catalog
      </label>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={`Search ${toolCount} tools to auto-fill...`}
          className="w-full pl-9 pr-9 py-2 bg-surface border border-bd-input rounded-lg text-fg placeholder-fg-faint focus:outline-none focus:border-accent transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-faint hover:text-fg cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {open && (results.length > 0 || loading) && (
        <div className="absolute z-20 w-full mt-1 bg-dropdown border border-bd-input rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {loading && results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-fg-muted">Searching...</div>
          ) : (
            <>
              {results.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => handleSelect(tool)}
                  className="w-full text-left px-4 py-3 hover:bg-bd transition-colors cursor-pointer"
                >
                  <div className="text-sm text-fg font-medium truncate">{tool.name}</div>
                  <div className="text-xs text-fg-muted truncate">
                    {[tool.brands?.name, tool.model_number].filter(Boolean).join(' · ')}
                  </div>
                </button>
              ))}
              {hasMore && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm text-accent hover:bg-bd transition-colors cursor-pointer border-t border-bd"
                >
                  <ChevronDown size={14} />
                  {loading ? 'Loading...' : 'Show more results'}
                </button>
              )}
              {hasMore && (
                <p className="px-4 py-2 text-xs text-fg-faint border-t border-bd">
                  Tip: Be more specific, e.g. "M12 Drill" or "2904-20"
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
