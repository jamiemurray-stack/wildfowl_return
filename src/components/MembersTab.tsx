import { useMemo, useState } from 'react'
import { useSettings } from '../lib/useSettings'
import { useBagReturns } from '../lib/useBagReturns'
import { normalizeMembership } from '../lib/membership'
import { scrollToTop } from '../lib/scroll'

type Saved = 'idle' | 'saving' | 'saved' | 'error'

export function MembersTab() {
  const { members, setMember, removeMember } = useSettings()
  const { data } = useBagReturns() // all seasons, to find numbers in use

  const [num, setNum] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<Saved>('idle')
  const [err, setErr] = useState('')
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  const namedNumbers = useMemo(() => Object.keys(members).sort(), [members])

  const unnamed = useMemo(() => {
    const seen = new Set(data.map((r) => r.membership_number))
    return [...seen].filter((n) => !(n in members)).sort()
  }, [data, members])

  const save = async () => {
    const n = normalizeMembership(num)
    const nm = name.trim()
    if (!n || !nm) {
      setStatus('error')
      setErr('Enter both a membership number and a name.')
      return
    }
    setStatus('saving')
    setErr('')
    const e = await setMember(n, nm)
    if (e) {
      setStatus('error')
      setErr(e)
    } else {
      setStatus('saved')
      setNum('')
      setName('')
    }
  }

  const edit = (n: string) => {
    setNum(n)
    setName(members[n] ?? '')
    setStatus('idle')
    scrollToTop()
  }

  const remove = async (n: string) => {
    await removeMember(n)
    setConfirmRemove(null)
  }

  return (
    <div className="screen admin-cols">
      <section className="card">
        <h2 className="card-title">Add / update member</h2>
        <p className="settings-note">
          Assign a name to a membership number. Names are shown alongside the number
          across the admin; numbers without a name just show the number.
        </p>
        <label className="field">
          <span className="field-label">Membership Number</span>
          <input
            className="input"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 27"
            value={num}
            onChange={(e) => {
              setNum(e.target.value)
              setStatus('idle')
            }}
          />
        </label>
        <label className="field">
          <span className="field-label">Name</span>
          <input
            className="input"
            type="text"
            placeholder="e.g. Mark Jones"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setStatus('idle')
            }}
          />
        </label>
        {status === 'error' && <p className="field-error">{err}</p>}
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={save}
          disabled={status === 'saving'}
        >
          {status === 'saving'
            ? 'Saving…'
            : status === 'saved'
              ? 'Saved ✓'
              : 'Save member'}
        </button>
      </section>

      <section className="card">
        <h2 className="card-title">Members</h2>
        {namedNumbers.length === 0 ? (
          <p className="settings-note">No names assigned yet.</p>
        ) : (
          <ul className="member-list">
            {namedNumbers.map((n) => (
              <li className="member-row" key={n}>
                <span className="member-info">
                  <span className="member-name">{members[n]}</span>
                  <span className="member-num">No. {n}</span>
                </span>
                <span className="member-actions">
                  <button type="button" className="btn-link" onClick={() => edit(n)}>
                    Edit
                  </button>
                  {confirmRemove === n ? (
                    <>
                      <button
                        type="button"
                        className="btn-link btn-link-danger"
                        onClick={() => remove(n)}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => setConfirmRemove(null)}
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn-link btn-link-danger"
                      onClick={() => setConfirmRemove(n)}
                    >
                      Remove
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {unnamed.length > 0 && (
        <section className="card">
          <h2 className="card-title">Seen in returns - no name yet</h2>
          <p className="settings-note">Tap a number to give it a name.</p>
          <div className="chip-row">
            {unnamed.map((n) => (
              <button
                type="button"
                className="chip"
                key={n}
                onClick={() => {
                  setNum(n)
                  setName('')
                  setStatus('idle')
                  scrollToTop()
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
