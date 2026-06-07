import { useEffect, useState } from 'react'
import { useSettings } from '../lib/useSettings'
import { SPECIES, type SpeciesKey } from '../data/species'
import { nextSeasonName } from '../lib/season'
import type { SeasonConfig } from '../types'

type Saved = 'idle' | 'saving' | 'saved' | 'error'

export function SettingsView({
  season,
  limits,
}: {
  season: SeasonConfig
  limits: Record<SpeciesKey, number | null>
}) {
  const {
    activeName,
    setSeasonConfig,
    setSpeciesLimit,
    setActiveSeason,
    startNextSeason,
  } = useSettings()

  const [startDate, setStartDate] = useState(season.start_date)
  const [endDate, setEndDate] = useState(season.end_date)
  const [maxVisits, setMaxVisits] = useState(season.max_visits?.toString() ?? '')
  const [maxBirds, setMaxBirds] = useState(season.max_total_birds?.toString() ?? '')
  const [seasonStatus, setSeasonStatus] = useState<Saved>('idle')
  const [seasonErr, setSeasonErr] = useState('')

  const [limitInputs, setLimitInputs] = useState<Record<string, string>>({})
  const [limitsStatus, setLimitsStatus] = useState<Saved>('idle')
  const [limitsErr, setLimitsErr] = useState('')

  const [activeStatus, setActiveStatus] = useState<Saved>('idle')
  const [activeErr, setActiveErr] = useState('')

  const [confirming, setConfirming] = useState(false)
  const [seasonChangeErr, setSeasonChangeErr] = useState('')

  useEffect(() => {
    setStartDate(season.start_date)
    setEndDate(season.end_date)
    setMaxVisits(season.max_visits?.toString() ?? '')
    setMaxBirds(season.max_total_birds?.toString() ?? '')
    setSeasonStatus('idle')
  }, [season])

  useEffect(() => {
    const next: Record<string, string> = {}
    for (const s of SPECIES) next[s.key] = limits[s.key]?.toString() ?? ''
    setLimitInputs(next)
    setLimitsStatus('idle')
  }, [limits])

  const parseLimit = (v: string): number | null => {
    const t = v.trim()
    if (t === '') return null
    const n = parseInt(t, 10)
    return isNaN(n) || n < 0 ? null : n
  }

  const saveSeason = async () => {
    setSeasonStatus('saving')
    setSeasonErr('')
    const err = await setSeasonConfig(season.name, {
      start_date: startDate,
      end_date: endDate,
      max_visits: parseLimit(maxVisits),
      max_total_birds: parseLimit(maxBirds),
    })
    if (err) {
      setSeasonStatus('error')
      setSeasonErr(err)
    } else {
      setSeasonStatus('saved')
    }
  }

  const saveLimits = async () => {
    setLimitsStatus('saving')
    setLimitsErr('')
    for (const s of SPECIES) {
      const err = await setSpeciesLimit(
        season.name,
        s.key,
        parseLimit(limitInputs[s.key] ?? ''),
      )
      if (err) {
        setLimitsStatus('error')
        setLimitsErr(err)
        return
      }
    }
    setLimitsStatus('saved')
  }

  const makeActive = async () => {
    setActiveStatus('saving')
    setActiveErr('')
    const err = await setActiveSeason(season.name)
    if (err) {
      setActiveStatus('error')
      setActiveErr(err)
    } else {
      setActiveStatus('saved')
    }
  }

  const doStartNextSeason = async () => {
    setSeasonChangeErr('')
    const err = await startNextSeason()
    if (err) setSeasonChangeErr(err)
    else setConfirming(false)
  }

  const isActive = season.name === activeName
  const nextName = nextSeasonName(activeName)

  return (
    <div className="screen">
      <section className="card">
        <h2 className="card-title">
          Season — {season.name}
          {isActive && <span className="tag-active">active</span>}
        </h2>
        <label className="field">
          <span className="field-label">Start date</span>
          <input
            className="input"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value)
              setSeasonStatus('idle')
            }}
          />
        </label>
        <label className="field">
          <span className="field-label">End date</span>
          <input
            className="input"
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value)
              setSeasonStatus('idle')
            }}
          />
        </label>
        <label className="field">
          <span className="field-label">
            Max visits <span className="muted">(blank = no limit)</span>
          </span>
          <input
            className="input"
            type="number"
            min="0"
            inputMode="numeric"
            value={maxVisits}
            placeholder="—"
            onChange={(e) => {
              setMaxVisits(e.target.value)
              setSeasonStatus('idle')
            }}
          />
        </label>
        <label className="field">
          <span className="field-label">
            Max total birds <span className="muted">(blank = no limit)</span>
          </span>
          <input
            className="input"
            type="number"
            min="0"
            inputMode="numeric"
            value={maxBirds}
            placeholder="—"
            onChange={(e) => {
              setMaxBirds(e.target.value)
              setSeasonStatus('idle')
            }}
          />
        </label>
        {seasonStatus === 'error' && <p className="field-error">{seasonErr}</p>}
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={saveSeason}
          disabled={seasonStatus === 'saving'}
        >
          {seasonStatus === 'saving'
            ? 'Saving…'
            : seasonStatus === 'saved'
              ? 'Saved ✓'
              : 'Save season settings'}
        </button>
      </section>

      <section className="card">
        <h2 className="card-title">
          Species limits <span className="muted">(blank = no limit)</span>
        </h2>
        <div className="limit-edit-list">
          {SPECIES.map((s) => (
            <label className="limit-edit-row" key={s.key}>
              <span className="limit-edit-name">{s.label}</span>
              <input
                className="input limit-input"
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="—"
                value={limitInputs[s.key] ?? ''}
                onChange={(e) => {
                  setLimitInputs((p) => ({ ...p, [s.key]: e.target.value }))
                  setLimitsStatus('idle')
                }}
              />
            </label>
          ))}
        </div>
        {limitsStatus === 'error' && <p className="field-error">{limitsErr}</p>}
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={saveLimits}
          disabled={limitsStatus === 'saving'}
        >
          {limitsStatus === 'saving'
            ? 'Saving…'
            : limitsStatus === 'saved'
              ? 'Saved ✓'
              : 'Save species limits'}
        </button>
      </section>

      <section className="card">
        <h2 className="card-title">Season management</h2>
        <p className="settings-note">
          New returns are recorded against the active season:{' '}
          <strong>{activeName}</strong>.
        </p>

        {isActive ? (
          <p className="settings-note">You’re viewing the active season.</p>
        ) : (
          <>
            <p className="settings-note">
              You’re viewing <strong>{season.name}</strong>, which isn’t active. Make
              it active to send new returns here (use this to undo an accidental
              season change).
            </p>
            {activeErr && <p className="field-error">{activeErr}</p>}
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={makeActive}
              disabled={activeStatus === 'saving'}
            >
              {activeStatus === 'saving'
                ? 'Switching…'
                : `Make ${season.name} the active season`}
            </button>
          </>
        )}

        <div className="settings-divider" />

        <p className="settings-note">
          Start the <strong>{nextName}</strong> season. {activeName}’s data is kept
          (archived); live totals reset to zero and its dates &amp; limits carry over
          to {nextName} (adjust them afterwards).
        </p>
        {seasonChangeErr && <p className="field-error">{seasonChangeErr}</p>}
        {confirming ? (
          <div className="confirm-row">
            <button type="button" className="btn btn-danger" onClick={doStartNextSeason}>
              Confirm: start {nextName}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => setConfirming(true)}
          >
            Start {nextName} season →
          </button>
        )}
      </section>
    </div>
  )
}
