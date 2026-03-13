import { useState, useEffect, useCallback } from 'react'
import { get } from '../lib/api'

export default function useUserKits({ status = '' } = {}) {
  const [kits, setKits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchKits = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      const qs = params.toString()
      const data = await get(`/kits${qs ? '?' + qs : ''}`)
      setKits(data || [])
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }, [status])

  useEffect(() => { fetchKits() }, [fetchKits])
  return { kits, loading, error, refetch: fetchKits }
}
