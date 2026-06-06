// The member's number is remembered on their device so they don't have to
// retype it on the Submit and Report Issue forms. Shared key, single source.
const KEY = 'gdwa_membership_number'

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
