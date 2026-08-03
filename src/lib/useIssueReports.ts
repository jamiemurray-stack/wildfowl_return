import { useCallback, useEffect, useState } from 'react'
import { supabase, thrownMessage } from './supabase'
import type { IssueReport } from '../types'
import type { LoadState } from './useBagReturns'

/** Fetches all reported issues, newest first. Used by the admin panel. */
export function useIssueReports() {
  const [data, setData] = useState<IssueReport[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setState('loading')
    setError('')
    try {
      const { data, error } = await supabase
        .from('issue_reports')
        .select('*')
        .order('submitted_at', { ascending: false })
      if (error) throw new Error(error.message)
      setData((data ?? []) as IssueReport[])
      setState('ready')
    } catch (e) {
      setError(thrownMessage(e))
      setState('error')
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, state, error, reload }
}
