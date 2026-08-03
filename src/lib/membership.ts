// The member's number is remembered on their device so they don't have to
// retype it on the Submit and Report Issue forms. Shared key, single source.
const KEY = 'gdwa_membership_number'

/** Canonical form of a membership number, so "07", " 7" and "7" are one
 *  member everywhere (leaderboard, directory, exports). Purely numeric
 *  values lose leading zeros; anything else is just trimmed. */
export function normalizeMembership(value: string): string {
  const trimmed = value.trim()
  return /^\d+$/.test(trimmed) ? String(parseInt(trimmed, 10)) : trimmed
}

export function getRememberedMembership(): string {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export function rememberMembership(value: string): void {
  try {
    const trimmed = value.trim()
    if (trimmed) localStorage.setItem(KEY, trimmed)
  } catch {
    /* ignore unavailable storage */
  }
}
