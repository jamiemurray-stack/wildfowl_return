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

/** "2026/27" → "2025/26" */
export function previousSeasonName(name: string): string {
  const { startYear } = parseSeason(name)
  return `${startYear - 1}/${String(startYear % 100).padStart(2, '0')}`
}

/** The natural season for a date — shooting seasons run autumn → winter, and
 *  the 3-month pre-season lead-in counts towards the coming season, so
 *  Jun–Dec belong to {year}/{year+1} and Jan–May to {year-1}/{year}. */
export function seasonNameForDate(iso: string): string {
  const y = parseInt(iso.slice(0, 4), 10)
  const m = parseInt(iso.slice(5, 7), 10)
  const startYear = m >= 6 ? y : y - 1
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`
}

/** Resolve the season a visit date belongs to: an existing season whose date
 *  window contains the date; else a season starting within the next 3 months
 *  (the pre-season lead-in files forward to the coming season); else the
 *  natural season for the date. Mirrors the DB filing trigger — keep in sync. */
export function resolveSeasonName(
  iso: string,
  seasons: { name: string; start_date: string; end_date: string }[],
): string {
  const matches = seasons
    .filter((s) => iso >= s.start_date && iso <= s.end_date)
    .sort((a, b) => (a.start_date < b.start_date ? 1 : -1))
  if (matches[0]) return matches[0].name
  const horizon = addMonths(iso, 3)
  const upcoming = seasons
    .filter((s) => s.start_date > iso && s.start_date <= horizon)
    .sort((a, b) => (a.start_date < b.start_date ? -1 : 1))
  return upcoming[0]?.name ?? seasonNameForDate(iso)
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
  return clampDate(todayISO(), start, end)
}

export function todayISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Shift an ISO date by N months (approximate; used for grace windows). */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1 + months, d))
  return dt.toISOString().slice(0, 10)
}

/** True if today is more than `monthsGrace` months outside [start, end]. */
export function isDateOutsideSeason(
  start: string,
  end: string,
  monthsGrace = 3,
): boolean {
  const today = todayISO()
  return today < addMonths(start, -monthsGrace) || today > addMonths(end, monthsGrace)
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
