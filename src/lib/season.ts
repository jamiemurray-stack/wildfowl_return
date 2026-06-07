/** Club + season helpers. Season dates are admin-editable (stored per season);
 *  these helpers derive labels and sensible defaults from a season name. */

export const CLUB_TITLE = 'Grange and District Wildfowlers Association'
export const DEFAULT_SEASON = '2025/26'

// Default season window: 1 Sep → 20 Feb (admin can change per season).
const DEFAULT_START_MMDD = '09-01'
const DEFAULT_END_MMDD = '02-20'

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function parseSeason(name: string): { startYear: number; endYear: number } {
  const startYear = parseInt(name.slice(0, 4), 10)
  return { startYear, endYear: startYear + 1 }
}

/** "2025/26" → "25/26" */
export function seasonShort(name: string): string {
  const { startYear, endYear } = parseSeason(name)
  return `${String(startYear).slice(2)}/${String(endYear).slice(2)}`
}

export function seasonSubtitle(name: string): string {
  return `Bag Return ${seasonShort(name)} Season`
}

/** "2025/26" → "2026/27" */
export function nextSeasonName(name: string): string {
  const { startYear, endYear } = parseSeason(name)
  return `${startYear + 1}/${String((endYear + 1) % 100).padStart(2, '0')}`
}

export function defaultSeasonDates(name: string): {
  start_date: string
  end_date: string
} {
  const { startYear, endYear } = parseSeason(name)
  return {
    start_date: `${startYear}-${DEFAULT_START_MMDD}`,
    end_date: `${endYear}-${DEFAULT_END_MMDD}`,
  }
}

export function captionFromDates(start: string, end: string): string {
  return `Season ${formatDate(start)} to ${formatDate(end)}`
}

export function clampDate(iso: string, start: string, end: string): string {
  if (iso < start) return start
  if (iso > end) return end
  return iso
}

export function todayClamped(start: string, end: string): string {
  const now = new Date()
  const iso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  return clampDate(iso, start, end)
}

/** Calendar months spanned by a date range, e.g. Sep..Feb, for the chart. */
export function monthsBetween(
  start: string,
  end: string,
): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = []
  let y = parseInt(start.slice(0, 4), 10)
  let m = parseInt(start.slice(5, 7), 10)
  const ey = parseInt(end.slice(0, 4), 10)
  const em = parseInt(end.slice(5, 7), 10)
  let guard = 0
  while ((y < ey || (y === ey && m <= em)) && guard < 36) {
    out.push({ key: `${y}-${pad(m)}`, label: MONTHS[m - 1] })
    m++
    if (m > 12) {
      m = 1
      y++
    }
    guard++
  }
  return out
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
