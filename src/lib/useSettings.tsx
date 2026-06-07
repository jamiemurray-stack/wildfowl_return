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
  addSeason: () => Promise<string | null>
  members: Record<string, string>
  memberName: (num: string) => string | undefined
  memberLabel: (num: string) => string
  setMember: (num: string, name: string) => Promise<string | null>
  removeMember: (num: string) => Promise<string | null>
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
  const [members, setMembers] = useState<Record<string, string>>({})

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

    // Surface any season that has returns but no config row, so it's visible
    // in the admin even if the row was never created.
    const { data: dataSeasons } = await supabase
      .from('species_season_totals')
      .select('season')
    for (const r of dataSeasons ?? []) {
      if (r.season && !list.some((s) => s.name === r.season)) {
        list.push({
          name: r.season,
          ...defaultSeasonDates(r.season),
          max_visits: null,
          max_total_birds: null,
        })
      }
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

    // Optional membership_number → name directory (table may not exist yet).
    const { data: memberRows } = await supabase
      .from('members')
      .select('membership_number, name')
    const mmap: Record<string, string> = {}
    for (const r of memberRows ?? []) mmap[r.membership_number] = r.name
    setMembers(mmap)

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

  const memberName = useCallback(
    (num: string): string | undefined => members[num],
    [members],
  )
  const memberLabel = useCallback(
    (num: string): string => (members[num] ? `${members[num]} (${num})` : num),
    [members],
  )
  const setMember = useCallback(
    async (num: string, name: string): Promise<string | null> => {
      const { error } = await supabase.from('members').upsert(
        { membership_number: num, name, updated_at: new Date().toISOString() },
        { onConflict: 'membership_number' },
      )
      if (error) return error.message
      setMembers((prev) => ({ ...prev, [num]: name }))
      return null
    },
    [],
  )
  const removeMember = useCallback(
    async (num: string): Promise<string | null> => {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('membership_number', num)
      if (error) return error.message
      setMembers((prev) => {
        const next = { ...prev }
        delete next[num]
        return next
      })
      return null
    },
    [],
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

  const addSeason = useCallback(async (): Promise<string | null> => {
    // Add the season after the latest one, carrying its caps + limits over.
    // Does NOT change the active season — that's a separate, explicit action.
    const latest =
      seasons.length > 0
        ? seasons.reduce((a, b) => (a.name >= b.name ? a : b))
        : fallbackSeason(activeName)
    const newName = nextSeasonName(latest.name)
    const dates = defaultSeasonDates(newName)

    const { error: insErr } = await supabase.from('seasons').upsert(
      {
        name: newName,
        ...dates,
        max_visits: latest.max_visits,
        max_total_birds: latest.max_total_birds,
      },
      { onConflict: 'name' },
    )
    if (insErr) return insErr.message

    const latestLims = limitsBySeason[latest.name] ?? emptyLimits()
    const rows = SPECIES.filter((s) => latestLims[s.key] != null).map((s) => ({
      season: newName,
      species: s.key,
      limit_value: latestLims[s.key],
    }))
    if (rows.length) {
      const { error: limErr } = await supabase
        .from('species_limits')
        .upsert(rows, { onConflict: 'season,species' })
      if (limErr) return limErr.message
    }

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
      addSeason,
      members,
      memberName,
      memberLabel,
      setMember,
      removeMember,
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
      addSeason,
      members,
      memberName,
      memberLabel,
      setMember,
      removeMember,
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
