import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  SPECIES,
  zeroCounts,
  sumCounts,
  type SpeciesCounts,
  type SpeciesKey,
} from '../data/species'
import {
  CLUB_TITLE,
  seasonSubtitle,
  captionFromDates,
  todayClamped,
  clampDate,
} from '../lib/season'
import { useSettings } from '../lib/useSettings'
import { useSeasonTotals } from '../lib/useSeasonTotals'
import { Stepper } from '../components/Stepper'
import { Segmented } from '../components/Segmented'
import type { LocationName } from '../types'
import { getRememberedMembership, rememberMembership } from '../lib/membership'

const LOCATIONS: readonly LocationName[] = ['Sands', 'Marshes']

export function SubmitScreen() {
  const { activeSeason: season, activeLimits: limits, loaded } = useSettings()
  const { totals, reload: reloadTotals } = useSeasonTotals(season.name)

  const [membership, setMembership] = useState(getRememberedMembership)
  const [dateOfVisit, setDateOfVisit] = useState(() =>
    todayClamped(season.start_date, season.end_date),
  )
  const [location, setLocation] = useState<LocationName>('Sands')
  const [counts, setCounts] = useState<SpeciesCounts>(zeroCounts)
  const [nilReturn, setNilReturn] = useState(false)
  const [notes, setNotes] = useState('')

  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  )
  const [errorMsg, setErrorMsg] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  // Keep the chosen date inside the (possibly admin-changed) season window.
  useEffect(() => {
    setDateOfVisit((d) => clampDate(d, season.start_date, season.end_date))
  }, [season.start_date, season.end_date])

  useEffect(() => {
    rememberMembership(membership)
  }, [membership])

  const total = sumCounts(counts)

  const visitsReached =
    season.max_visits != null && totals.returns >= season.max_visits
  const birdsReached =
    season.max_total_birds != null && totals.total_birds >= season.max_total_birds
  const seasonClosed = loaded && (visitsReached || birdsReached)
  const birdsRemaining =
    season.max_total_birds != null
      ? Math.max(0, season.max_total_birds - totals.total_birds)
      : null

  const remainingFor = (key: SpeciesKey): number | null =>
    limits[key] != null ? Math.max(0, (limits[key] as number) - totals[key]) : null

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
  const birdsBudgetOk =
    nilReturn || birdsRemaining == null || total <= birdsRemaining
  const formValid =
    !seasonClosed &&
    membershipValid &&
    dateOfVisit !== '' &&
    bagValid &&
    birdsBudgetOk

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

    setStatus('saved')
    setShowErrors(false)
    setDateOfVisit(todayClamped(season.start_date, season.end_date))
    setLocation('Sands')
    setCounts(zeroCounts())
    setNilReturn(false)
    setNotes('')
    reloadTotals()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="screen">
      <header className="app-header">
        <h1 className="app-title">{CLUB_TITLE}</h1>
        <p className="app-subtitle">{seasonSubtitle(season.name)}</p>
        <p className="app-caption">
          {captionFromDates(season.start_date, season.end_date)}
        </p>
      </header>

      {seasonClosed && (
        <div className="banner banner-error" role="alert">
          {visitsReached
            ? `Season visit limit reached (${season.max_visits}). No further visits can be logged.`
            : `Season bird limit reached (${season.max_total_birds}). No further visits can be logged.`}
        </div>
      )}
      {status === 'saved' && !seasonClosed && (
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
              placeholder="e.g. 27"
              value={membership}
              disabled={seasonClosed}
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
              min={season.start_date}
              max={season.end_date}
              disabled={seasonClosed}
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
            <button
              type="button"
              className="btn-link"
              onClick={resetAll}
              disabled={seasonClosed}
            >
              Reset all
            </button>
          </div>

          <div className="steppers">
            {SPECIES.map((s) => {
              const rem = remainingFor(s.key)
              const reached = rem === 0
              return (
                <Stepper
                  key={s.key}
                  label={s.label}
                  value={counts[s.key]}
                  disabled={nilReturn || seasonClosed || reached}
                  max={rem ?? undefined}
                  hint={
                    seasonClosed
                      ? undefined
                      : reached
                        ? 'Limit reached'
                        : rem != null
                          ? `${rem} left`
                          : undefined
                  }
                  onChange={(v) => setCount(s.key, v)}
                />
              )
            })}
          </div>

          <label className="toggle-row">
            <span className="toggle-label">Nil return (shot nothing)</span>
            <span className={`switch${nilReturn ? ' is-on' : ''}`}>
              <input
                type="checkbox"
                checked={nilReturn}
                onChange={toggleNil}
                disabled={seasonClosed}
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
          {showErrors && bagValid && !birdsBudgetOk && (
            <p className="field-error">
              Only {birdsRemaining} more bird{birdsRemaining === 1 ? '' : 's'} can be
              logged this season.
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
            disabled={seasonClosed}
            onChange={(e) => setNotes(e.target.value)}
          />
        </section>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={status === 'saving' || seasonClosed}
        >
          {seasonClosed
            ? 'Season closed'
            : status === 'saving'
              ? 'Submitting…'
              : 'Submit bag return'}
        </button>
      </form>
    </div>
  )
}
