import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 10

export default function useCatalogSearch() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const timerRef = useRef(null)
  const queryRef = useRef('')

  async function fetchResults(query, from = 0) {
    const { data, error } = await supabase.rpc('search_tools', {
      query,
      page_size: PAGE_SIZE,
      page_offset: from
    })

    if (error) return []

    // Normalize shape to match what CatalogSearch expects
    return (data || []).map((r) => ({
      id: r.id,
      name: r.name,
      model_number: r.model_number,
      brands: { name: r.brand_name }
    }))
  }

  function search(query) {
    clearTimeout(timerRef.current)

    if (!query || query.length < 2) {
      setResults([])
      setHasMore(false)
      setOffset(0)
      setLoading(false)
      return
    }

    setLoading(true)
    queryRef.current = query

    timerRef.current = setTimeout(async () => {
      const data = await fetchResults(query, 0)
      setResults(data)
      setOffset(PAGE_SIZE)
      setHasMore(data.length === PAGE_SIZE)
      setLoading(false)
    }, 300)
  }

  async function loadMore() {
    if (!queryRef.current || loading) return
    setLoading(true)

    const data = await fetchResults(queryRef.current, offset)
    setResults((prev) => [...prev, ...data])
    setOffset((prev) => prev + PAGE_SIZE)
    setHasMore(data.length === PAGE_SIZE)
    setLoading(false)
  }

  function clear() {
    clearTimeout(timerRef.current)
    setResults([])
    setHasMore(false)
    setOffset(0)
    setLoading(false)
    queryRef.current = ''
  }

  return { results, loading, hasMore, search, loadMore, clear }
}
