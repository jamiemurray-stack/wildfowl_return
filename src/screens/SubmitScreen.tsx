import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  SPECIES,
  zeroCounts,
  sumCounts,
  type SpeciesCounts,
  type SpeciesKey,
} from '../data/species'
import { SEASON, todayInSeason } from '../lib/season'
import { Stepper } from '../components/Stepper'
import { Segmented } from '../components/Segmented'
import type { LocationName } from '../types'
import { getRememberedMembership, rememberMembership } from '../lib/membership'

const LOCATIONS: readonly LocationName[] = ['Sands', 'Marshes']

export function SubmitScreen() {
  const [membership, setMembership] = useState(getRememberedMembership)
  const [dateOfVisit, setDateOfVisit] = useState(todayInSeason)
  const [location, setLocation] = useState<LocationName>('Sands')
  const [counts, setCounts] = useState<SpeciesCounts>(zeroCounts)
  const [nilReturn, setNilReturn] = useState(false)
  const [notes, setNotes] = useState('')

  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  )
  const [errorMsg, setErrorMsg] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  const total = sumCounts(counts)

  // Remember the membership number on this device for next time.
  useEffect(() => {
    rememberMembership(membership)
  }, [membership])

  const setCount = (key: SpeciesKey, value: number) => {
    setCounts((c) => ({ ...c, [key]: value }))
    if (value > 0 && nilReturn) setNilReturn(false)
    if (status !== 'idle') setStatus('idle')
  }

  const toggleNil = () => {
    setNilReturn((prev) => {
      const next = !prev
      if (next) setCounts(zeroCounts())
      return next
    })
    if (status !== 'idle') setStatus('idle')
  }

  const resetAll = () => {
    setCounts(zeroCounts())
    if (status !== 'idle') setStatus('idle')
  }

  const membershipValid = membership.trim() !== ''
  const bagValid = total > 0 || nilReturn
  const formValid = membershipValid && dateOfVisit !== '' && bagValid

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formValid) {
      setShowErrors(true)
      return
    }
    setStatus('saving')
    setErrorMsg('')

    const { error } = await supabase.from('bag_returns').insert({
      membership_number: membership.trim(),
      date_of_visit: dateOfVisit,
      location,
      ...counts,
      nil_return: nilReturn,
      notes: notes.trim() || null,
    })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
      return
    }

    // Success: keep the membership number, reset the rest for the next entry.
    setStatus('saved')
    setShowErrors(false)
    setDateOfVisit(todayInSeason())
    setLocation('Sands')
    setCounts(zeroCounts())
    setNilReturn(false)
    setNotes('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="screen">
      <header className="app-header">
        <h1 className="app-title">{SEASON.title}</h1>
        <p className="app-subtitle">{SEASON.subtitle}</p>
        <p className="app-caption">{SEASON.caption}</p>
      </header>

      {status === 'saved' && (
        <div className="banner banner-success" role="status">
          ✓ Bag return submitted. Thank you!
        </div>
      )}
      {status === 'error' && (
        <div className="banner banner-error" role="alert">
          Couldn’t submit: {errorMsg || 'please check your connection and try again.'}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <section className="card">
          <h2 className="card-title">Visit Details</h2>
          <label className="field">
            <span className="field-label">Membership Number</span>
            <input
              className="input"
              type="text"
              placeholder="e.g. 1234"
              value={membership}
              onChange={(e) => setMembership(e.target.value)}
            />
            {showErrors && !membershipValid && (
              <span className="field-error">
                Please enter your membership number.
              </span>
            )}
          </label>
          <label className="field">
            <span className="field-label">Date of Visit</span>
            <input
              className="input"
              type="date"
              value={dateOfVisit}
              min={SEASON.start}
              max={SEASON.end}
              onChange={(e) => setDateOfVisit(e.target.value)}
            />
          </label>
        </section>

        <section className="card">
          <h2 className="card-title">Location</h2>
          <Segmented
            options={LOCATIONS}
            value={location}
            onChange={setLocation}
            ariaLabel="Location"
          />
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Bag</h2>
            <button type="button" className="btn-link" onClick={resetAll}>
              Reset all
            </button>
          </div>

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

          {showErrors && !bagValid && (
            <p className="field-error">
              Add at least one bird, or switch on “Nil return”.
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
            placeholder="Weather, conditions, anything worth noting…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </section>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={status === 'saving'}
        >
          {status === 'saving' ? 'Submitting…' : 'Submit bag return'}
        </button>
      </form>
    </div>
  )
}
