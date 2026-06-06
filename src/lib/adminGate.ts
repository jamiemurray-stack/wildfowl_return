// Lightweight, client-side gate for the Report & History tabs. This protects
// the admin views from casual access only — the password lives in the bundle.
// (Per the brief, History is gated with this password; Report shares the gate
// because it also aggregates every member's returns.)
const PASSWORD = 'M4rkJ0n3s'
const STORAGE_KEY = 'gdwa_admin_unlocked'

export function isAdminUnlocked(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === 'yes'
  } catch {
    return false
  }
}

export function tryAdminUnlock(input: string): boolean {
  if (input === PASSWORD) {
    try {
      sessionStorage.setItem(STORAGE_KEY, 'yes')
    } catch {
      /* sessionStorage unavailable — unlock for this render only */
    }
    return true
  }
  return false
}

export function lockAdmin(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
