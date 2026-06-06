import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { BagReturn } from '../types'

export type LoadState = 'loading' | 'ready' | 'error'

/** Fetches all bag returns, newest visit first. Shared by Report & History. */
export function useBagReturns() {
  const [data, setData] = useState<BagReturn[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setState('loading')
    setError('')
    const { data, error } = await supabase
      .from('bag_returns')
      .select('*')
      .order('date_of_visit', { ascending: false })
      .order('submitted_at', { ascending: false })
    if (error) {
      setError(error.message)
      setState('error')
      return
    }
    setData((data ?? []) as BagReturn[])
    setState('ready')
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, state, error, reload }
}
