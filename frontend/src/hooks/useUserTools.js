import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export default function useUserTools({ search = '', brand = '', location = '', toolType = '' } = {}) {
  const [tools, setTools] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTools = useCallback(async () => {
    setLoading(true)
    setError(null)

    const PAGE = 1000
    let all = []
    let from = 0

    try {
      while (true) {
        let query = supabase
          .from('user_tools')
          .select('*, user_tool_photos(url, is_primary, rotation), user_tool_tags(tag_id, user_tags(id, name, color)), tools:catalog_tool_id(tool_images(url, is_primary))')
          .order('created_at', { ascending: false })
          .range(from, from + PAGE - 1)

        if (search) {
          query = query.or(
            `name.ilike.%${search}%,brand.ilike.%${search}%,model_number.ilike.%${search}%,serial_number.ilike.%${search}%`
          )
        }
        if (brand) query = query.eq('brand', brand)
        if (location) query = query.eq('location', location)
        if (toolType) query = query.eq('tool_type', toolType)

        const { data, error: err } = await query
        if (err) throw err
        if (!data || data.length === 0) break
        all = all.concat(data)
        if (data.length < PAGE) break
        from += PAGE
      }
      setTools(all)
    } catch (err) {
      setError(err.message)
    }

    setLoading(false)
  }, [search, brand, location, toolType])

  useEffect(() => {
    fetchTools()
  }, [fetchTools])

  return { tools, loading, error, refetch: fetchTools }
}
