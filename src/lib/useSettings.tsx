import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase, thrownMessage } from './supabase'
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
  /** Non-empty when the initial settings load failed — season dates and limits
   *  shown to the user are fallbacks, not club configuration. */
  loadError: string
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
  const [loadError, setLoadError] = useState('')
  const [activeName, setActiveName] = useState(DEFAULT_SEASON)
  const [seasons, setSeasons] = useState<SeasonConfig[]>([
    fallbackSeason(DEFAULT_SEASON),
  ])
  const [limitsBySeason, setLimitsBySeason] = useState<Record<string, Limits>>({})
  const [members, setMembers] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    const problems: string[] = []
    try {
      await loadInner(problems)
    } catch (e) {
      // A hard network failure rejects the fetch itself; without this catch the
      // whole load dies silently and the app never learns it's on fallbacks.
      problems.push(thrownMessage(e))
    }
    setLoadError(problems[0] ?? '')
    setLoaded(true)
  }, [])

  const loadInner = async (problems: string[]) => {
    // The five reads are independent — run them together so one load is one
    // round-trip, and a dead network settles in one retry cycle, not five.
    const [settingsRes, seasonsRes, dataSeasonsRes, limitsRes, membersRes] =
      await Promise.all([
        supabase
          .from('app_settings')
          .select('current_season')
          .eq('id', 1)
          .maybeSingle(),
        supabase.from('seasons').select('*'),
        supabase.from('species_season_totals').select('season'),
        supabase.from('species_limits').select('season, species, limit_value'),
        // Optional membership_number → name directory (table may not exist
        // yet) — its absence is not a load failure.
        supabase.from('members').select('membership_number, name'),
      ])

    if (settingsRes.error) problems.push(settingsRes.error.message)
    const name = settingsRes.data?.current_season ?? DEFAULT_SEASON

    if (seasonsRes.error) problems.push(seasonsRes.error.message)
    let list: SeasonConfig[] = (seasonsRes.data ?? []).map((r) => ({
      name: r.name,
      start_date: r.start_date,
      end_date: r.end_date,
      max_visits: r.max_visits,
      max_total_birds: r.max_total_birds,
    }))

    // Make sure the active season always exists as a row — but only when the
    // seasons query actually succeeded; an empty list from a failed read must
    // not trigger a write.
    if (!seasonsRes.error && !list.some((s) => s.name === name)) {
      const dates = defaultSeasonDates(name)
      await supabase.from('seasons').insert({ name, ...dates })
      list.push({ name, ...dates, max_visits: null, max_total_birds: null })
    }

    // Surface any season that has returns but no config row, so it's visible
    // in the admin even if the row was never created.
    for (const r of dataSeasonsRes.data ?? []) {
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

    if (limitsRes.error) problems.push(limitsRes.error.message)
    const map: Record<string, Limits> = {}
    for (const s of list) map[s.name] = emptyLimits()
    for (const r of limitsRes.data ?? []) {
      if (!map[r.season]) map[r.season] = emptyLimits()
      if (r.species in map[r.season]) {
        map[r.season][r.species as SpeciesKey] = r.limit_value
      }
    }
    setLimitsBySeason(map)

    const mmap: Record<string, string> = {}
    for (const r of membersRes.data ?? []) mmap[r.membership_number] = r.name
    setMembers(mmap)
  }

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
      try {
        const { error } = await supabase.from('members').upsert(
          { membership_number: num, name, updated_at: new Date().toISOString() },
          { onConflict: 'membership_number' },
        )
        if (error) return error.message
      } catch (e) {
        return thrownMessage(e)
      }
      setMembers((prev) => ({ ...prev, [num]: name }))
      return null
    },
    [],
  )
  const removeMember = useCallback(
    async (num: string): Promise<string | null> => {
      try {
        const { error } = await supabase
          .from('members')
          .delete()
          .eq('membership_number', num)
        if (error) return error.message
      } catch (e) {
        return thrownMessage(e)
      }
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
      try {
        const { error } = await supabase
          .from('seasons')
          .update(patch)
          .eq('name', name)
        if (error) return error.message
      } catch (e) {
        return thrownMessage(e)
      }
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
      try {
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
      } catch (e) {
        return thrownMessage(e)
      }
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
      try {
        const { error } = await supabase
          .from('app_settings')
          .update({ current_season: name, updated_at: new Date().toISOString() })
          .eq('id', 1)
        if (error) return error.message
      } catch (e) {
        return thrownMessage(e)
      }
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

    try {
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
    } catch (e) {
      return thrownMessage(e)
    }

    await load()
    return null
  }, [activeName, seasons, limitsBySeason, load])

  const value = useMemo<SettingsValue>(
    () => ({
      loaded,
      loadError,
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
      loadError,
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
