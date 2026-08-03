import { useCallback, useEffect, useState } from 'react'
import { supabase, thrownMessage } from './supabase'
import type { BagReturn } from '../types'

export type LoadState = 'loading' | 'ready' | 'error'

/** Fetches bag returns (optionally for one season), newest visit first. */
export function useBagReturns(season?: string) {
  const [data, setData] = useState<BagReturn[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setState('loading')
    setError('')
    try {
      let query = supabase.from('bag_returns').select('*')
      if (season) query = query.eq('season', season)
      const { data, error } = await query
        .order('date_of_visit', { ascending: false })
        .order('submitted_at', { ascending: false })
      if (error) throw new Error(error.message)
      setData((data ?? []) as BagReturn[])
      setState('ready')
    } catch (e) {
      setError(thrownMessage(e))
      setState('error')
    }
  }, [season])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, state, error, reload }
}
