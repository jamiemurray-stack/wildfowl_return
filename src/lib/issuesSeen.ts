// Tracks (per device) the newest issue the admin has seen, so the Issues tab can
// show a badge for issues reported since then. Cleared when the tab is opened.
const KEY = 'gdwa_issues_last_seen'

export function getIssuesLastSeen(): string {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export function setIssuesLastSeen(iso: string): void {
  try {
    localStorage.setItem(KEY, iso)
  } catch {
    /* ignore unavailable storage */
  }
}
