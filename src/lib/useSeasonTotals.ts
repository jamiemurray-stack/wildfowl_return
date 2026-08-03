import { useCallback, useEffect, useState } from 'react'
import { supabase, thrownMessage } from './supabase'
import { SPECIES } from '../data/species'
import type { SeasonTotals } from '../types'

const zero = (): SeasonTotals =>
  ({
    ...(Object.fromEntries(SPECIES.map((s) => [s.key, 0])) as Record<
      (typeof SPECIES)[number]['key'],
      number
    >),
    returns: 0,
    total_birds: 0,
  }) as SeasonTotals

const rowToTotals = (row: Record<string, number>): SeasonTotals => {
  const t = zero()
  for (const s of SPECIES) t[s.key] = row[s.key] ?? 0
  t.returns = row.returns ?? 0
  t.total_birds = row.total_birds ?? 0
  return t
}

/** One-shot fetch of a season's totals — used to re-check limits at the moment
 *  of submission. Throws on query failure so callers can tell "no returns yet"
 *  (zeros) apart from "couldn't check". */
export async function fetchSeasonTotals(season: string): Promise<SeasonTotals> {
  const { data, error } = await supabase
    .from('species_season_totals')
    .select('*')
    .eq('season', season)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? rowToTotals(data as unknown as Record<string, number>) : zero()
}

/** Live per-species + visit + bird totals for a season (from the totals view). */
export function useSeasonTotals(season: string) {
  const [totals, setTotals] = useState<SeasonTotals>(zero)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('species_season_totals')
        .select('*')
        .eq('season', season)
        .maybeSingle()
      if (error) throw new Error(error.message)
      setError('')
      setTotals(
        data ? rowToTotals(data as unknown as Record<string, number>) : zero(),
      )
    } catch (e) {
      // Keep whatever we last knew rather than pretending the season is empty —
      // zeroed totals would silently reopen every limit.
      setError(thrownMessage(e))
    }
    setLoading(false)
  }, [season])

  useEffect(() => {
    reload()
  }, [reload])

  return { totals, loading, error, reload }
}
