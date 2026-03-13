import { useState, useEffect, useCallback } from 'react'
import { get } from '../lib/api'

export default function useUserBatteries({ search = '', brand = '', location = '', platform = '' } = {}) {
  const [batteries, setBatteries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchBatteries = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (brand) params.set('brand', brand)
      if (location) params.set('location', location)
      if (platform) params.set('platform', platform)
      const qs = params.toString()
      const data = await get(`/batteries${qs ? '?' + qs : ''}`)
      setBatteries(data || [])
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }, [search, brand, location, platform])

  useEffect(() => { fetchBatteries() }, [fetchBatteries])
  return { batteries, loading, error, refetch: fetchBatteries }
}
