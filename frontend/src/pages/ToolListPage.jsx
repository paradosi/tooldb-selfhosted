import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, Wrench, Search, X, LayoutList, LayoutGrid, Upload, UserCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import useUserTools from '../hooks/useUserTools'
import ToolCard from '../components/ToolCard'

export default function ToolListPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [brand, setBrand] = useState('')
  const [location, setLocation] = useState('')
  const [toolType, setToolType] = useState('')
  const [brands, setBrands] = useState([])
  const [locations, setLocations] = useState([])
  const [toolTypes, setToolTypes] = useState([])
  const [lentOnly, setLentOnly] = useState(false)
  const [view, setView] = useState(() => localStorage.getItem('tooldb-view') || 'list')
  const timerRef = useRef(null)

  function toggleView() {
    const next = view === 'list' ? 'grid' : 'list'
    setView(next)
    localStorage.setItem('tooldb-view', next)
  }

  const { tools, loading, error } = useUserTools({
    search: debouncedSearch,
    brand,
    location,
    toolType,
  })

  // Debounce search input
  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timerRef.current)
  }, [search])

  // Load distinct brands and locations for filters
  useEffect(() => {
    async function loadFilters() {
      const [brandRes, locRes, typeRes] = await Promise.all([
        supabase
          .from('user_tools')
          .select('brand')
          .not('brand', 'is', null)
          .not('brand', 'eq', '')
          .order('brand')
          .limit(10000),
        supabase
          .from('user_tools')
          .select('location')
          .not('location', 'is', null)
          .not('location', 'eq', '')
          .order('location')
          .limit(10000),
        supabase
          .from('user_tools')
          .select('tool_type')
          .not('tool_type', 'is', null)
          .not('tool_type', 'eq', '')
          .order('tool_type')
          .limit(10000),
      ])

      if (brandRes.data) {
        setBrands([...new Set(brandRes.data.map((r) => r.brand))])
      }
      if (locRes.data) {
        setLocations([...new Set(locRes.data.map((r) => r.location))])
      }
      if (typeRes.data) {
        setToolTypes([...new Set(typeRes.data.map((r) => r.tool_type))])
      }
    }

    loadFilters()
  }, [tools])

  const hasFilters = search || brand || location || toolType || lentOnly

  function clearFilters() {
    setSearch('')
    setDebouncedSearch('')
    setBrand('')
    setLocation('')
    setToolType('')
    setLentOnly(false)
  }

  const filteredTools = lentOnly ? tools.filter((t) => t.lent_to) : tools

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="sticky top-0 z-30 bg-bg pt-1 pb-4 -mx-6 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-fg">Your Tools</h1>
          <button
            onClick={toggleView}
            className="text-fg-muted hover:text-fg transition-colors cursor-pointer"
            title={view === 'list' ? 'Grid view' : 'List view'}
          >
            {view === 'list' ? <LayoutGrid size={20} /> : <LayoutList size={20} />}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/import"
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-bd hover:bg-bd-input text-fg text-sm font-medium rounded-lg transition-colors"
          >
            <Upload size={18} />
            Import CSV
          </Link>
          <Link
            to="/tools/new"
            className="flex items-center gap-2 px-3 py-2 md:px-4 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
          >
            <PlusCircle size={18} />
            <span className="hidden sm:inline">Add Tool</span>
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, brand, model, or serial..."
            className="w-full pl-9 pr-9 py-2.5 bg-card border border-bd rounded-lg text-fg placeholder-fg-faint focus:outline-none focus:border-accent transition-colors"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setDebouncedSearch('') }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-faint hover:text-fg cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {(brands.length > 0 || locations.length > 0 || toolTypes.length > 0) && (
          <div className="flex flex-wrap gap-3">
            {brands.length > 0 && (
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="px-3 py-2 bg-card border border-bd rounded-lg text-sm text-fg focus:outline-none focus:border-accent transition-colors"
              >
                <option value="">All Brands</option>
                {brands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            )}

            {toolTypes.length > 0 && (
              <select
                value={toolType}
                onChange={(e) => setToolType(e.target.value)}
                className="px-3 py-2 bg-card border border-bd rounded-lg text-sm text-fg focus:outline-none focus:border-accent transition-colors"
              >
                <option value="">All Types</option>
                {toolTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}

            {locations.length > 0 && (
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="px-3 py-2 bg-card border border-bd rounded-lg text-sm text-fg focus:outline-none focus:border-accent transition-colors"
              >
                <option value="">All Locations</option>
                {locations.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            )}

            <button
              onClick={() => setLentOnly(!lentOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                lentOnly
                  ? 'bg-warn/15 text-warn border border-warn/30'
                  : 'bg-card border border-bd text-fg-muted hover:text-fg'
              }`}
            >
              <UserCheck size={14} />
              Lent Out
            </button>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-fg-muted hover:text-fg transition-colors cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
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
      ) : filteredTools.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-bd flex items-center justify-center mb-4">
            <Wrench size={28} className="text-fg-faint" />
          </div>
          <h2 className="text-lg font-medium text-fg mb-2">
            {hasFilters ? 'No matching tools' : 'No tools yet'}
          </h2>
          <p className="text-fg-muted mb-6">
            {hasFilters
              ? 'Try adjusting your search or filters.'
              : 'Add your first tool to start building your collection.'}
          </p>
          {hasFilters ? (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-bd hover:bg-bd-input text-fg text-sm rounded-lg transition-colors cursor-pointer"
            >
              Clear filters
            </button>
          ) : (
            <Link
              to="/tools/new"
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
            >
              <PlusCircle size={18} />
              Add Tool
            </Link>
          )}
        </div>
      ) : (
        <div className={view === 'grid'
          ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'
          : 'grid gap-3'
        }>
          {filteredTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} view={view} />
          ))}
        </div>
      )}
    </div>
  )
}
