/**
 * The seven quarry species tracked on a bag return. The `key` matches the
 * column name in the Supabase `bag_returns` table; `label` is shown in the UI.
 */
export const SPECIES = [
  { key: 'pink_footed_goose', label: 'Pink-Footed Goose', short: 'Pinkfoot' },
  { key: 'greylag_goose', label: 'Greylag Goose', short: 'Greylag' },
  { key: 'canada_goose', label: 'Canada Goose', short: 'Canada' },
  { key: 'mallard', label: 'Mallard', short: 'Mallard' },
  { key: 'wigeon', label: 'Wigeon', short: 'Wigeon' },
  { key: 'teal', label: 'Teal', short: 'Teal' },
  { key: 'snipe', label: 'Snipe', short: 'Snipe' },
] as const

export type SpeciesKey = (typeof SPECIES)[number]['key']

export type SpeciesCounts = Record<SpeciesKey, number>

export const zeroCounts = (): SpeciesCounts => ({
  pink_footed_goose: 0,
  greylag_goose: 0,
  canada_goose: 0,
  mallard: 0,
  wigeon: 0,
  teal: 0,
  snipe: 0,
})

export const sumCounts = (counts: SpeciesCounts): number =>
  SPECIES.reduce((total, s) => total + (counts[s.key] || 0), 0)
