import { useState, type ReactNode } from 'react'
import { isAdminUnlocked, tryAdminUnlock } from '../lib/adminGate'

/**
 * Wraps an admin-only screen. Shows a password prompt until the correct
 * password is entered; the unlock then persists for the browser session and
 * is shared across all admin screens.
 */
export function AdminGate({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  const [unlocked, setUnlocked] = useState(isAdminUnlocked)
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)

  if (unlocked) return <>{children}</>

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (tryAdminUnlock(pw)) {
      setUnlocked(true)
    } else {
      setError(true)
      setPw('')
    }
  }

  return (
    <div className="gate">
      <div className="gate-card">
        <div className="gate-lock" aria-hidden="true">
          🔒
        </div>
        <h2 className="gate-title">{title}</h2>
        <p className="gate-text">Enter the password to view this page.</p>
        <form onSubmit={handleSubmit} className="gate-form">
          <input
            type="password"
            className="input"
            placeholder="Password"
            value={pw}
            autoFocus
            autoComplete="current-password"
            onChange={(e) => {
              setPw(e.target.value)
              setError(false)
            }}
          />
          {error && <p className="field-error">Incorrect password. Try again.</p>}
          <button type="submit" className="btn btn-primary" disabled={!pw}>
            Unlock
          </button>
        </form>
      </div>
    </div>
  )
}
