import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

const fallbackSeason = (name: string): SeasonConfig => ({
  name,
  ...defaultSeasonDates(name),
  max_visits: null,
  max_total_birds: null,
})

type SeasonPatch = Partial<
  Pick<SeasonConfig, 'start_date' | 'end_date' | 'max_visits' | 'max_total_birds'>
>

type SettingsValue = {
  loaded: boolean
  activeName: string
  seasons: SeasonConfig[]
  activeSeason: SeasonConfig
  activeLimits: Limits
  seasonFor: (name: string) => SeasonConfig
  limitsFor: (name: string) => Limits
  reload: () => Promise<void>
  setSeasonConfig: (name: string, patch: SeasonPatch) => Promise<string | null>
  setSpeciesLimit: (
    name: string,
    species: SpeciesKey,
    value: number | null,
  ) => Promise<string | null>
  setActiveSeason: (name: string) => Promise<string | null>
  startNextSeason: () => Promise<string | null>
}

const byNameDesc = (a: SeasonConfig, b: SeasonConfig) =>
  a.name < b.name ? 1 : a.name > b.name ? -1 : 0

const SettingsContext = createContext<SettingsValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false)
  const [activeName, setActiveName] = useState(DEFAULT_SEASON)
  const [seasons, setSeasons] = useState<SeasonConfig[]>([
    fallbackSeason(DEFAULT_SEASON),
  ])
  const [limitsBySeason, setLimitsBySeason] = useState<Record<string, Limits>>({})

  const load = useCallback(async () => {
    const { data: settings } = await supabase
      .from('app_settings')
      .select('current_season')
      .eq('id', 1)
      .maybeSingle()
    const name = settings?.current_season ?? DEFAULT_SEASON

    const { data: seasonRows } = await supabase.from('seasons').select('*')
    let list: SeasonConfig[] = (seasonRows ?? []).map((r) => ({
      name: r.name,
      start_date: r.start_date,
      end_date: r.end_date,
      max_visits: r.max_visits,
      max_total_birds: r.max_total_birds,
    }))

    // Make sure the active season always exists as a row.
    if (!list.some((s) => s.name === name)) {
      const dates = defaultSeasonDates(name)
      await supabase.from('seasons').insert({ name, ...dates })
      list.push({ name, ...dates, max_visits: null, max_total_birds: null })
    }
    list.sort(byNameDesc)
    setSeasons(list)
    setActiveName(name)

    const { data: limitRows } = await supabase
      .from('species_limits')
      .select('season, species, limit_value')
    const map: Record<string, Limits> = {}
    for (const s of list) map[s.name] = emptyLimits()
    for (const r of limitRows ?? []) {
      if (!map[r.season]) map[r.season] = emptyLimits()
      if (r.species in map[r.season]) {
        map[r.season][r.species as SpeciesKey] = r.limit_value
      }
    }
    setLimitsBySeason(map)
    setLoaded(true)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const seasonFor = useCallback(
    (name: string): SeasonConfig =>
      seasons.find((s) => s.name === name) ?? fallbackSeason(name),
    [seasons],
  )
  const limitsFor = useCallback(
    (name: string): Limits => limitsBySeason[name] ?? emptyLimits(),
    [limitsBySeason],
  )

  const setSeasonConfig = useCallback(
    async (name: string, patch: SeasonPatch): Promise<string | null> => {
      const { error } = await supabase.from('seasons').update(patch).eq('name', name)
      if (error) return error.message
      setSeasons((prev) => prev.map((s) => (s.name === name ? { ...s, ...patch } : s)))
      return null
    },
    [],
  )

  const setSpeciesLimit = useCallback(
    async (
      name: string,
      species: SpeciesKey,
      value: number | null,
    ): Promise<string | null> => {
      const { error } = await supabase.from('species_limits').upsert(
        {
          season: name,
          species,
          limit_value: value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'season,species' },
      )
      if (error) return error.message
      setLimitsBySeason((prev) => ({
        ...prev,
        [name]: { ...(prev[name] ?? emptyLimits()), [species]: value },
      }))
      return null
    },
    [],
  )

  const setActiveSeason = useCallback(
    async (name: string): Promise<string | null> => {
      const { error } = await supabase
        .from('app_settings')
        .update({ current_season: name, updated_at: new Date().toISOString() })
        .eq('id', 1)
      if (error) return error.message
      setActiveName(name)
      return null
    },
    [],
  )

  const startNextSeason = useCallback(async (): Promise<string | null> => {
    const nextName = nextSeasonName(activeName)
    const dates = defaultSeasonDates(nextName)
    const activeCfg = seasons.find((s) => s.name === activeName) ?? fallbackSeason(activeName)

    // Create the next season, carrying over the season-level caps.
    const { error: insErr } = await supabase.from('seasons').upsert(
      {
        name: nextName,
        ...dates,
        max_visits: activeCfg.max_visits,
        max_total_birds: activeCfg.max_total_birds,
      },
      { onConflict: 'name' },
    )
    if (insErr) return insErr.message

    // Carry over the per-species limits too.
    const activeLims = limitsBySeason[activeName] ?? emptyLimits()
    const rows = SPECIES.filter((s) => activeLims[s.key] != null).map((s) => ({
      season: nextName,
      species: s.key,
      limit_value: activeLims[s.key],
    }))
    if (rows.length) {
      const { error: limErr } = await supabase
        .from('species_limits')
        .upsert(rows, { onConflict: 'season,species' })
      if (limErr) return limErr.message
    }

    const { error: updErr } = await supabase
      .from('app_settings')
      .update({ current_season: nextName, updated_at: new Date().toISOString() })
      .eq('id', 1)
    if (updErr) return updErr.message

    await load()
    return null
  }, [activeName, seasons, limitsBySeason, load])

  const value = useMemo<SettingsValue>(
    () => ({
      loaded,
      activeName,
      seasons,
      activeSeason: seasonFor(activeName),
      activeLimits: limitsFor(activeName),
      seasonFor,
      limitsFor,
      reload: load,
      setSeasonConfig,
      setSpeciesLimit,
      setActiveSeason,
      startNextSeason,
    }),
    [
      loaded,
      activeName,
      seasons,
      seasonFor,
      limitsFor,
      load,
      setSeasonConfig,
      setSpeciesLimit,
      setActiveSeason,
      startNextSeason,
    ],
  )

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  )
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
