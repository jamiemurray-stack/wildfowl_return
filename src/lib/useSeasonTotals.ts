import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
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

/** Live per-species + visit + bird totals for a season (from the totals view). */
export function useSeasonTotals(season: string) {
  const [totals, setTotals] = useState<SeasonTotals>(zero)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('species_season_totals')
      .select('*')
      .eq('season', season)
      .maybeSingle()
    if (data) {
      const row = data as unknown as Record<string, number>
      const t = zero()
      for (const s of SPECIES) t[s.key] = row[s.key] ?? 0
      t.returns = row.returns ?? 0
      t.total_birds = row.total_birds ?? 0
      setTotals(t)
    } else {
      setTotals(zero())
    }
    setLoading(false)
  }, [season])

  useEffect(() => {
    reload()
  }, [reload])

  return { totals, loading, reload }
}
