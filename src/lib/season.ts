/** Season constants and date helpers for the 2025/26 wildfowling season. */
export const SEASON = {
  start: '2025-09-01',
  end: '2026-08-31',
  title: 'Grange and District Wildfowlers Association',
  subtitle: 'Bag Return 25/26 Season',
  caption: 'Season 01 Sep 2025 to 31 Aug 2026',
} as const

/** Today's date (yyyy-mm-dd) clamped to the season window. */
export function todayInSeason(): string {
  const now = new Date()
  // Local calendar date, not UTC, so the picker matches the user's day.
  const iso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  if (iso < SEASON.start) return SEASON.start
  if (iso > SEASON.end) return SEASON.end
  return iso
}

/** Format an ISO date (yyyy-mm-dd) as e.g. "06 Jun 2026". */
export function formatDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Format an ISO timestamp as e.g. "06 Jun 2026, 14:32". */
export function formatDateTime(iso: string): string {
  if (!iso) return ''
  const dt = new Date(iso)
  return dt.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}
