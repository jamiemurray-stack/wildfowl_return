import { useEffect, useState } from 'react'
import { useSettings } from '../lib/useSettings'
import { SPECIES } from '../data/species'
import { nextSeasonName } from '../lib/season'

type Saved = 'idle' | 'saving' | 'saved' | 'error'

export function SettingsView() {
  const { season, limits, setSeasonConfig, setSpeciesLimit, startNextSeason } =
    useSettings()

  const [startDate, setStartDate] = useState(season.start_date)
  const [endDate, setEndDate] = useState(season.end_date)
  const [maxVisits, setMaxVisits] = useState(season.max_visits?.toString() ?? '')
  const [maxBirds, setMaxBirds] = useState(season.max_total_birds?.toString() ?? '')
  const [seasonStatus, setSeasonStatus] = useState<Saved>('idle')
  const [seasonErr, setSeasonErr] = useState('')

  const [limitInputs, setLimitInputs] = useState<Record<string, string>>({})
  const [limitsStatus, setLimitsStatus] = useState<Saved>('idle')
  const [limitsErr, setLimitsErr] = useState('')

  const [confirming, setConfirming] = useState(false)
  const [seasonChangeErr, setSeasonChangeErr] = useState('')

  useEffect(() => {
    setStartDate(season.start_date)
    setEndDate(season.end_date)
    setMaxVisits(season.max_visits?.toString() ?? '')
    setMaxBirds(season.max_total_birds?.toString() ?? '')
  }, [season])

  useEffect(() => {
    const next: Record<string, string> = {}
    for (const s of SPECIES) next[s.key] = limits[s.key]?.toString() ?? ''
    setLimitInputs(next)
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
    const err = await setSeasonConfig({
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
      const err = await setSpeciesLimit(s.key, parseLimit(limitInputs[s.key] ?? ''))
      if (err) {
        setLimitsStatus('error')
        setLimitsErr(err)
        return
      }
    }
    setLimitsStatus('saved')
  }

  const doStartNextSeason = async () => {
    setSeasonChangeErr('')
    const err = await startNextSeason()
    if (err) setSeasonChangeErr(err)
    else setConfirming(false)
  }

  const next = nextSeasonName(season.name)

  return (
    <div className="screen">
      <section className="card">
        <h2 className="card-title">Season — {season.name}</h2>
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
        <h2 className="card-title">New season</h2>
        <p className="settings-note">
          Start the <strong>{next}</strong> season. This season’s returns are kept
          (archived), but live totals, reports and limits reset to zero for {next}.
          You can adjust the new dates and limits afterwards.
        </p>
        {seasonChangeErr && <p className="field-error">{seasonChangeErr}</p>}
        {confirming ? (
          <div className="confirm-row">
            <button type="button" className="btn btn-danger" onClick={doStartNextSeason}>
              Confirm: start {next}
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
            Start {next} season →
          </button>
        )}
      </section>
    </div>
  )
}
