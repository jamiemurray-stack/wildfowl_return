import { useEffect, useState } from 'react'
import { supabase, thrownMessage } from '../lib/supabase'
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
  formatDate,
  todayISO,
  yesterdayISO,
  resolveSeasonName,
} from '../lib/season'
import { useSettings } from '../lib/useSettings'
import { useSeasonTotals, fetchSeasonTotals } from '../lib/useSeasonTotals'
import { Stepper } from '../components/Stepper'
import { Segmented } from '../components/Segmented'
import type { LocationName } from '../types'
import {
  getRememberedMembership,
  rememberMembership,
  normalizeMembership,
} from '../lib/membership'
import { scrollToTop } from '../lib/scroll'

const LOCATIONS: readonly LocationName[] = ['Sands', 'Marshes']

/** Friendly wording for a failed network round-trip — the raw message
 *  ("Failed to fetch") means nothing on a marsh with one bar of signal. */
const friendlyError = (message: string): string =>
  /fetch|network|load failed/i.test(message)
    ? 'no connection. Your entries are still here — try again when you have signal.'
    : message

export function SubmitScreen() {
  const { activeName, seasons, seasonFor, limitsFor, loaded, loadError, memberName } =
    useSettings()

  const [membership, setMembership] = useState(getRememberedMembership)
  // A remembered number is shown as "Submitting as …" instead of an input —
  // returning members read their identity rather than re-typing it.
  const [editingMembership, setEditingMembership] = useState(
    () => getRememberedMembership() === '',
  )
  const [dateOfVisit, setDateOfVisit] = useState(todayISO)
  // No default location: a pre-selected answer looks already-answered and
  // gets skimmed past, silently filing wrong data. One tap keeps it honest.
  const [location, setLocation] = useState<LocationName | null>(null)
  const [counts, setCounts] = useState<SpeciesCounts>(zeroCounts)
  const [notes, setNotes] = useState('')

  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  )
  const [errorMsg, setErrorMsg] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  useEffect(() => {
    rememberMembership(membership)
  }, [membership])

  const clearStatus = () => {
    if (status !== 'idle') setStatus('idle')
  }

  // The database files each return by its visit date (authoritative trigger).
  // We mirror that here to show which season it lands in and apply its limits.
  // While the date field is cleared, fall back to the active season so the
  // header and limits stay sensible.
  const seasonName = dateOfVisit
    ? resolveSeasonName(dateOfVisit, seasons)
    : activeName
  const season = seasonFor(seasonName)
  const limits = limitsFor(seasonName)
  const {
    totals,
    error: totalsError,
    reload: reloadTotals,
  } = useSeasonTotals(seasonName)

  // Visit dates span the configured seasons: from the earliest season's start
  // to the furthest season's end, so a fat-fingered far-future year is caught.
  // Today is always allowed — a member logging today's visit must never be
  // blocked just because the next season hasn't been configured yet.
  const minDate = seasons.reduce(
    (min, s) => (s.start_date < min ? s.start_date : min),
    season.start_date,
  )
  const maxDate = seasons.reduce(
    (max, s) => (s.end_date > max ? s.end_date : max),
    todayISO(),
  )

  const total = sumCounts(counts)
  // A visit with nothing shot IS the nil return — no separate toggle to find.
  // The submit button announces it, so nothing is filed unknowingly.
  const isNil = total === 0

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
    clearStatus()
  }

  const resetAll = () => {
    setCounts(zeroCounts())
    clearStatus()
  }

  const normalizedMembership = normalizeMembership(membership)
  const knownName = memberName(normalizedMembership)

  const membershipValid = membership.trim() !== ''
  const dateInRange =
    dateOfVisit !== '' && dateOfVisit >= minDate && dateOfVisit <= maxDate
  const locationValid = location != null
  const birdsBudgetOk = birdsRemaining == null || total <= birdsRemaining
  const formValid =
    !seasonClosed && membershipValid && dateInRange && locationValid && birdsBudgetOk

  /** Re-check season and species limits against fresh totals just before
   *  inserting — the totals on screen may be minutes or days old. Returns an
   *  error message, or null when the bag still fits (or can't be verified,
   *  in which case the insert itself will surface any connection problem). */
  const recheckLimits = async (): Promise<string | null> => {
    let fresh
    try {
      fresh = await fetchSeasonTotals(seasonName)
    } catch {
      return null
    }
    if (season.max_visits != null && fresh.returns >= season.max_visits) {
      return `The ${season.name} season has reached its visit limit (${season.max_visits}).`
    }
    if (total > 0) {
      if (
        season.max_total_birds != null &&
        fresh.total_birds + total > season.max_total_birds
      ) {
        const left = Math.max(0, season.max_total_birds - fresh.total_birds)
        return `Only ${left} more bird${left === 1 ? '' : 's'} can be logged for the ${season.name} season.`
      }
      for (const s of SPECIES) {
        const cap = limits[s.key]
        if (cap != null && fresh[s.key] + counts[s.key] > cap) {
          const left = Math.max(0, cap - fresh[s.key])
          return `Only ${left} more ${s.label} can be logged for the ${season.name} season.`
        }
      }
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formValid) {
      setShowErrors(true)
      if (!membershipValid) setEditingMembership(true)
      return
    }
    setStatus('saving')
    setErrorMsg('')

    const limitProblem = await recheckLimits()
    if (limitProblem) {
      setStatus('error')
      setErrorMsg(limitProblem)
      reloadTotals()
      return
    }

    try {
      const { error } = await supabase.from('bag_returns').insert({
        membership_number: normalizedMembership,
        date_of_visit: dateOfVisit,
        location,
        ...counts,
        nil_return: isNil,
        notes: notes.trim() || null,
        // season is set by the DB trigger from date_of_visit
      })
      if (error) throw new Error(error.message)
    } catch (e) {
      setStatus('error')
      setErrorMsg(friendlyError(thrownMessage(e)))
      return
    }

    setStatus('saved')
    setShowErrors(false)
    setEditingMembership(false)
    setDateOfVisit(todayISO())
    setLocation(null)
    setCounts(zeroCounts())
    setNotes('')
    reloadTotals()
    scrollToTop()
  }

  const setDate = (iso: string) => {
    setDateOfVisit(iso)
    clearStatus()
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

      {loadError && (
        <div className="banner banner-warn" role="status">
          Season settings couldn’t be loaded — showing defaults. Check your
          connection and reload before submitting.
        </div>
      )}
      {!loadError && totalsError && (
        <div className="banner banner-warn" role="status">
          Season totals couldn’t be loaded, so remaining limits shown may be out
          of date. Limits are checked again when you submit.
        </div>
      )}
      {seasonClosed && (
        <div className="banner banner-error" role="alert">
          {visitsReached
            ? `The ${season.name} season has reached its visit limit (${season.max_visits}). No more visits can be logged for it.`
            : `The ${season.name} season has reached its bird limit (${season.max_total_birds}). No more visits can be logged for it.`}
        </div>
      )}
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
          {editingMembership ? (
            <label className="field">
              <span className="field-label">Membership Number</span>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 27"
                value={membership}
                onChange={(e) => {
                  setMembership(e.target.value)
                  clearStatus()
                }}
              />
              {showErrors && !membershipValid && (
                <span className="field-error">
                  Please enter your membership number.
                </span>
              )}
              {knownName && <span className="field-hint">{knownName}</span>}
            </label>
          ) : (
            <div className="field identity-row">
              <span className="identity-text">
                Submitting as{' '}
                <strong>
                  {knownName
                    ? `${knownName} (No. ${normalizedMembership})`
                    : `member No. ${normalizedMembership}`}
                </strong>
              </span>
              <button
                type="button"
                className="btn-link"
                onClick={() => setEditingMembership(true)}
              >
                Not you?
              </button>
            </div>
          )}
          <div className="field">
            <span className="field-label" id="date-label">
              Date of Visit
            </span>
            <div className="chip-row date-chips" aria-labelledby="date-label">
              <button
                type="button"
                className={`chip${dateOfVisit === todayISO() ? ' is-active' : ''}`}
                onClick={() => setDate(todayISO())}
              >
                Today
              </button>
              <button
                type="button"
                className={`chip${dateOfVisit === yesterdayISO() ? ' is-active' : ''}`}
                onClick={() => setDate(yesterdayISO())}
              >
                Yesterday
              </button>
            </div>
            <input
              className="input"
              type="date"
              aria-labelledby="date-label"
              value={dateOfVisit}
              min={minDate}
              max={maxDate}
              onChange={(e) => setDate(e.target.value)}
            />
            {showErrors && !dateInRange ? (
              <span className="field-error">
                {dateOfVisit === ''
                  ? 'Please enter the date of your visit.'
                  : `Visit dates must fall between ${formatDate(minDate)} and ${formatDate(maxDate)}.`}
              </span>
            ) : (
              <span className="field-hint">
                Filed under the {season.name} season.
              </span>
            )}
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Location</h2>
          <Segmented
            options={LOCATIONS}
            value={location}
            onChange={(loc) => {
              setLocation(loc)
              clearStatus()
            }}
            ariaLabel="Location"
          />
          {showErrors && !locationValid && (
            <p className="field-error">Please choose where you went.</p>
          )}
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
                  disabled={seasonClosed || reached}
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

          <div className="total-row">
            <span className="total-label">Total shot</span>
            <span className="total-value">{total}</span>
          </div>
          {isNil && !seasonClosed && (
            <p className="field-hint nil-hint">
              Shot nothing? Leave the counts at zero — the button below files it
              as a nil return.
            </p>
          )}

          {showErrors && !birdsBudgetOk && (
            <p className="field-error">
              Only {birdsRemaining} more bird{birdsRemaining === 1 ? '' : 's'} can be
              logged for the {season.name} season.
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
            onChange={(e) => {
              setNotes(e.target.value)
              clearStatus()
            }}
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
              : isNil
                ? 'Submit nil return — shot nothing'
                : 'Submit bag return'}
        </button>
      </form>
    </div>
  )
}
