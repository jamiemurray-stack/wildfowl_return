import { useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  SPECIES,
  zeroCounts,
  sumCounts,
  type SpeciesCounts,
  type SpeciesKey,
} from '../data/species'
import { defaultSeasonDates } from '../lib/season'
import { Stepper } from './Stepper'
import { Segmented } from './Segmented'
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
  const [nilReturn, setNilReturn] = useState(record.nil_return)
  const [notes, setNotes] = useState(record.notes ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const bounds = defaultSeasonDates(record.season)
  const total = sumCounts(counts)

  const setCount = (key: SpeciesKey, value: number) => {
    setCounts((c) => ({ ...c, [key]: value }))
    if (value > 0 && nilReturn) setNilReturn(false)
  }
  const toggleNil = () =>
    setNilReturn((prev) => {
      const next = !prev
      if (next) setCounts(zeroCounts())
      return next
    })

  const save = async () => {
    setStatus('saving')
    setErrorMsg('')
    const { error } = await supabase
      .from('bag_returns')
      .update({
        membership_number: membership.trim(),
        date_of_visit: dateOfVisit,
        location,
        ...counts,
        nil_return: nilReturn,
        notes: notes.trim() || null,
      })
      .eq('id', record.id)
    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
      return
    }
    onDone()
  }

  const remove = async () => {
    setStatus('saving')
    setErrorMsg('')
    const { error } = await supabase.from('bag_returns').delete().eq('id', record.id)
    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
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
            value={membership}
            onChange={(e) => setMembership(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">Date of Visit</span>
          <input
            className="input"
            type="date"
            value={dateOfVisit}
            min={bounds.start_date}
            max={bounds.end_date}
            onChange={(e) => setDateOfVisit(e.target.value)}
          />
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
              disabled={nilReturn}
              onChange={(v) => setCount(s.key, v)}
            />
          ))}
        </div>
        <label className="toggle-row">
          <span className="toggle-label">Nil return (shot nothing)</span>
          <span className={`switch${nilReturn ? ' is-on' : ''}`}>
            <input
              type="checkbox"
              checked={nilReturn}
              onChange={toggleNil}
              aria-label="Nil return (shot nothing)"
            />
            <span className="switch-track" aria-hidden="true">
              <span className="switch-thumb" />
            </span>
          </span>
        </label>
        <div className="total-row">
          <span className="total-label">Total shot</span>
          <span className="total-value">{nilReturn ? 0 : total}</span>
        </div>
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
        {status === 'saving' ? 'Saving…' : 'Save changes'}
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
