import { useState, useEffect, useCallback } from 'react'
import { get } from '../lib/api'

export default function useUserTools({ search = '', brand = '', location = '', toolType = '' } = {}) {
  const [tools, setTools] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTools = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (brand) params.set('brand', brand)
      if (location) params.set('location', location)
      if (toolType) params.set('tool_type', toolType)
      const qs = params.toString()
      const data = await get(`/tools${qs ? '?' + qs : ''}`)
      setTools(data || [])
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }, [search, brand, location, toolType])

  useEffect(() => { fetchTools() }, [fetchTools])
  return { tools, loading, error, refetch: fetchTools }
}
