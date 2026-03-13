import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export default function useUserKits({ status = '' } = {}) {
  const [kits, setKits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchKits = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('kits')
      .select('*, kit_tools(id, checked)')
      .order('updated_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data, error: err } = await query

    if (err) {
      setError(err.message)
    } else {
      setKits(data)
    }

    setLoading(false)
  }, [status])

  useEffect(() => {
    fetchKits()
  }, [fetchKits])

  return { kits, loading, error, refetch: fetchKits }
}
