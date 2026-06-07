import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from './supabase'
import { SPECIES, type SpeciesKey } from '../data/species'
import { DEFAULT_SEASON, defaultSeasonDates, nextSeasonName } from './season'
import type { SeasonConfig } from '../types'

type Limits = Record<SpeciesKey, number | null>

const emptyLimits = (): Limits =>
  Object.fromEntries(SPECIES.map((s) => [s.key, null])) as Limits

const fallbackSeason = (): SeasonConfig => ({
  name: DEFAULT_SEASON,
  ...defaultSeasonDates(DEFAULT_SEASON),
  max_visits: null,
  max_total_birds: null,
})

type SeasonPatch = Partial<
  Pick<SeasonConfig, 'start_date' | 'end_date' | 'max_visits' | 'max_total_birds'>
>

type SettingsValue = {
  loaded: boolean
  season: SeasonConfig
  limits: Limits
  reload: () => Promise<void>
  setSpeciesLimit: (species: SpeciesKey, value: number | null) => Promise<string | null>
  setSeasonConfig: (patch: SeasonPatch) => Promise<string | null>
  startNextSeason: () => Promise<string | null>
}

const SettingsContext = createContext<SettingsValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false)
  const [season, setSeason] = useState<SeasonConfig>(fallbackSeason)
  const [limits, setLimits] = useState<Limits>(emptyLimits)

  const load = useCallback(async () => {
    const { data: settings } = await supabase
      .from('app_settings')
      .select('current_season')
      .eq('id', 1)
      .maybeSingle()
    const name = settings?.current_season ?? DEFAULT_SEASON

    const { data: srow } = await supabase
      .from('seasons')
      .select('*')
      .eq('name', name)
      .maybeSingle()

    if (srow) {
      setSeason({
        name: srow.name,
        start_date: srow.start_date,
        end_date: srow.end_date,
        max_visits: srow.max_visits,
        max_total_birds: srow.max_total_birds,
      })
    } else {
      const dates = defaultSeasonDates(name)
      setSeason({ name, ...dates, max_visits: null, max_total_birds: null })
      await supabase.from('seasons').insert({ name, ...dates })
    }

    const { data: lrows } = await supabase
      .from('species_limits')
      .select('species, limit_value')
      .eq('season', name)
    const next = emptyLimits()
    for (const r of lrows ?? []) {
      if (r.species in next) next[r.species as SpeciesKey] = r.limit_value
    }
    setLimits(next)
    setLoaded(true)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const setSpeciesLimit = useCallback(
    async (species: SpeciesKey, value: number | null): Promise<string | null> => {
      const { error } = await supabase.from('species_limits').upsert(
        {
          season: season.name,
          species,
          limit_value: value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'season,species' },
      )
      if (error) return error.message
      setLimits((prev) => ({ ...prev, [species]: value }))
      return null
    },
    [season.name],
  )

  const setSeasonConfig = useCallback(
    async (patch: SeasonPatch): Promise<string | null> => {
      const { error } = await supabase
        .from('seasons')
        .update(patch)
        .eq('name', season.name)
      if (error) return error.message
      setSeason((prev) => ({ ...prev, ...patch }))
      return null
    },
    [season.name],
  )

  const startNextSeason = useCallback(async (): Promise<string | null> => {
    const nextName = nextSeasonName(season.name)
    const dates = defaultSeasonDates(nextName)
    const { error: insErr } = await supabase
      .from('seasons')
      .upsert({ name: nextName, ...dates }, { onConflict: 'name' })
    if (insErr) return insErr.message
    const { error: updErr } = await supabase
      .from('app_settings')
      .update({ current_season: nextName, updated_at: new Date().toISOString() })
      .eq('id', 1)
    if (updErr) return updErr.message
    await load()
    return null
  }, [season.name, load])

  return (
    <SettingsContext.Provider
      value={{
        loaded,
        season,
        limits,
        reload: load,
        setSpeciesLimit,
        setSeasonConfig,
        startNextSeason,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
