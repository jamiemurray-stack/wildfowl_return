import type { SpeciesKey } from './data/species'

export type LocationName = 'Sands' | 'Marshes'

/** A row in the Supabase `bag_returns` table. */
export type BagReturn = {
  id: string
  membership_number: string
  date_of_visit: string // ISO date (yyyy-mm-dd)
  location: LocationName
  nil_return: boolean
  total_shot: number // generated column (sum of species)
  notes: string | null
  season: string // e.g. '2025/26' (set by DB trigger)
  submitted_at: string // ISO timestamp
} & Record<SpeciesKey, number>

/** Payload sent on insert (server fills total_shot, season, submitted_at). */
export type BagReturnInsert = Omit<
  BagReturn,
  'id' | 'total_shot' | 'submitted_at' | 'season'
>

/** A row in the Supabase `issue_reports` table. */
export type IssueReport = {
  id: string
  membership_number: string | null
  category: string
  location: string | null
  description: string
  submitted_at: string
}

/** A season's editable configuration (dates + season-level caps). */
export type SeasonConfig = {
  name: string
  start_date: string
  end_date: string
  max_visits: number | null
  max_total_birds: number | null
}

/** Aggregated totals for a season (from the species_season_totals view). */
export type SeasonTotals = Record<SpeciesKey, number> & {
  returns: number
  total_birds: number
}
