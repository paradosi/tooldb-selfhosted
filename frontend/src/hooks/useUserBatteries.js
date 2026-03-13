import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export default function useUserBatteries({ search = '', brand = '', location = '', platform = '' } = {}) {
  const [batteries, setBatteries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchBatteries = useCallback(async () => {
    setLoading(true)
    setError(null)

    const PAGE = 1000
    let all = []
    let from = 0

    try {
      while (true) {
        let query = supabase
          .from('user_batteries')
          .select('*, user_battery_photos(url, is_primary, rotation), user_battery_tags(tag_id, user_tags(id, name, color))')
          .order('created_at', { ascending: false })
          .range(from, from + PAGE - 1)

        if (search) {
          query = query.or(
            `name.ilike.%${search}%,brand.ilike.%${search}%,model_number.ilike.%${search}%,serial_number.ilike.%${search}%,platform.ilike.%${search}%`
          )
        }
        if (brand) query = query.eq('brand', brand)
        if (location) query = query.eq('location', location)
        if (platform) query = query.eq('platform', platform)

        const { data, error: err } = await query
        if (err) throw err
        if (!data || data.length === 0) break
        all = all.concat(data)
        if (data.length < PAGE) break
        from += PAGE
      }
      setBatteries(all)
    } catch (err) {
      setError(err.message)
    }

    setLoading(false)
  }, [search, brand, location, platform])

  useEffect(() => {
    fetchBatteries()
  }, [fetchBatteries])

  return { batteries, loading, error, refetch: fetchBatteries }
}
