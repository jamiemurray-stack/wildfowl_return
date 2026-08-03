import { useState } from 'react'
import { supabase, thrownMessage } from '../lib/supabase'
import {
  SPECIES,
  zeroCounts,
  sumCounts,
  type SpeciesCounts,
  type SpeciesKey,
} from '../data/species'
import { Stepper } from './Stepper'
import { Segmented } from './Segmented'
import { normalizeMembership } from '../lib/membership'
import type { BagReturn, LocationName } from '../types'

const LOCATIONS: readonly LocationName[] = ['Sands', 'Marshes']

export function EditReturn({
  record,
  onDone,
  onCancel,
}: {
  record: BagReturn
  onDone: () => void
  onCancel: () => void
}) {
  const [membership, setMembership] = useState(record.membership_number)
  const [dateOfVisit, setDateOfVisit] = useState(record.date_of_visit)
  const [location, setLocation] = useState<LocationName>(record.location)
  const [counts, setCounts] = useState<SpeciesCounts>(() => {
    const c = zeroCounts()
    for (const s of SPECIES) c[s.key] = record[s.key]
    return c
  })
  const [notes, setNotes] = useState(record.notes ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const total = sumCounts(counts)
  // Mirrors the Submit form: zero birds IS the nil return, no toggle.
  const isNil = total === 0

  const membershipValid = membership.trim() !== ''
  const dateValid = dateOfVisit !== ''
  const formValid = membershipValid && dateValid

  const setCount = (key: SpeciesKey, value: number) => {
    setCounts((c) => ({ ...c, [key]: value }))
  }

  const save = async () => {
    if (!formValid) {
      setShowErrors(true)
      return
    }
    setStatus('saving')
    setErrorMsg('')
    try {
      const { error } = await supabase
        .from('bag_returns')
        .update({
          membership_number: normalizeMembership(membership),
          date_of_visit: dateOfVisit,
          location,
          ...counts,
          nil_return: isNil,
          notes: notes.trim() || null,
        })
        .eq('id', record.id)
      if (error) throw new Error(error.message)
    } catch (e) {
      setStatus('error')
      setErrorMsg(thrownMessage(e))
      return
    }
    onDone()
  }

  const remove = async () => {
    setStatus('saving')
    setErrorMsg('')
    try {
      const { error } = await supabase
        .from('bag_returns')
        .delete()
        .eq('id', record.id)
      if (error) throw new Error(error.message)
    } catch (e) {
      setStatus('error')
      setErrorMsg(thrownMessage(e))
      return
    }
    onDone()
  }

  return (
    <div className="screen">
      <button type="button" className="back-btn" onClick={onCancel}>
        ‹ Cancel
      </button>
      <header className="list-header">
        <h1 className="screen-title">Edit return</h1>
      </header>

      {status === 'error' && (
        <div className="banner banner-error" role="alert">
          Couldn’t save: {errorMsg}
        </div>
      )}

      <section className="card">
        <label className="field">
          <span className="field-label">Membership Number</span>
          <input
            className="input"
            inputMode="numeric"
            value={membership}
            onChange={(e) => setMembership(e.target.value)}
          />
          {showErrors && !membershipValid && (
            <span className="field-error">
              Please enter the member’s membership number.
            </span>
          )}
        </label>
        <label className="field">
          <span className="field-label">Date of Visit</span>
          <input
            className="input"
            type="date"
            value={dateOfVisit}
            onChange={(e) => setDateOfVisit(e.target.value)}
          />
          {showErrors && !dateValid ? (
            <span className="field-error">Please enter the date of the visit.</span>
          ) : (
            <span className="field-hint">
              Changing the date may move this return to another season.
            </span>
          )}
        </label>
        <div className="field">
          <span className="field-label">Location</span>
          <Segmented
            options={LOCATIONS}
            value={location}
            onChange={setLocation}
            ariaLabel="Location"
          />
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Bag</h2>
        <div className="steppers">
          {SPECIES.map((s) => (
            <Stepper
              key={s.key}
              label={s.label}
              value={counts[s.key]}
              onChange={(v) => setCount(s.key, v)}
            />
          ))}
        </div>
        <div className="total-row">
          <span className="total-label">Total shot</span>
          <span className="total-value">{total}</span>
        </div>
        {isNil && (
          <p className="field-hint nil-hint">
            No birds entered - saving records this visit as a nil return.
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">
          Notes <span className="muted">(optional)</span>
        </h2>
        <textarea
          className="input textarea"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </section>

      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={save}
        disabled={status === 'saving'}
      >
        {status === 'saving'
          ? 'Saving…'
          : isNil
            ? 'Save as nil return - shot nothing'
            : 'Save changes'}
      </button>

      <section className="card">
        <h2 className="card-title">Danger zone</h2>
        {confirmDelete ? (
          <div className="confirm-row">
            <button
              type="button"
              className="btn btn-danger"
              onClick={remove}
              disabled={status === 'saving'}
            >
              Confirm delete
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-danger-outline btn-block"
            onClick={() => setConfirmDelete(true)}
          >
            Delete this return
          </button>
        )}
      </section>
    </div>
  )
}
