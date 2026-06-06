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
  submitted_at: string // ISO timestamp
} & Record<SpeciesKey, number>

/** Payload sent on insert (server fills total_shot + submitted_at). */
export type BagReturnInsert = Omit<BagReturn, 'id' | 'total_shot' | 'submitted_at'>

/** A row in the Supabase `issue_reports` table. */
export type IssueReport = {
  id: string
  membership_number: string | null
  category: string
  location: string | null
  description: string
  submitted_at: string // ISO timestamp
}
