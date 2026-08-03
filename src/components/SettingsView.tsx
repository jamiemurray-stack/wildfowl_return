import { useEffect, useState } from 'react'
import { useSettings } from '../lib/useSettings'
import { SPECIES } from '../data/species'
import { formatDate, nextSeasonName, previousSeasonName } from '../lib/season'
import type { SeasonConfig } from '../types'
import type { SpeciesKey } from '../data/species'

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
    seasons,
    seasonFor,
    limitsFor,
    setSeasonConfig,
    setSpeciesLimit,
    setActiveSeason,
    addSeason,
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

  const [copyStatus, setCopyStatus] = useState<Saved>('idle')
  const [copyErr, setCopyErr] = useState('')

  const [switchingTo, setSwitchingTo] = useState<string | null>(null)
  const [activeErr, setActiveErr] = useState('')

  const [addStatus, setAddStatus] = useState<Saved>('idle')
  const [addErr, setAddErr] = useState('')

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
    setCopyStatus('idle')
  }, [limits])

  /** A limit box holds a whole number or is blank (no limit). Anything else —
   *  "1O0", "-5", "ten" — is a typo that must not silently become "no limit". */
  const parseLimit = (v: string): { ok: boolean; value: number | null } => {
    const t = v.trim()
    if (t === '') return { ok: true, value: null }
    if (!/^\d+$/.test(t)) return { ok: false, value: null }
    return { ok: true, value: parseInt(t, 10) }
  }

  const saveSeason = async () => {
    const visits = parseLimit(maxVisits)
    const birds = parseLimit(maxBirds)
    if (!visits.ok || !birds.ok) {
      setSeasonStatus('error')
      setSeasonErr(
        `“${!visits.ok ? maxVisits : maxBirds}” isn’t a number — enter a whole number, or clear the box for no limit.`,
      )
      return
    }
    if (!startDate || !endDate) {
      setSeasonStatus('error')
      setSeasonErr('Enter both a start and an end date.')
      return
    }
    if (endDate <= startDate) {
      setSeasonStatus('error')
      setSeasonErr('The end date must be after the start date.')
      return
    }
    setSeasonStatus('saving')
    setSeasonErr('')
    const err = await setSeasonConfig(season.name, {
      start_date: startDate,
      end_date: endDate,
      max_visits: visits.value,
      max_total_birds: birds.value,
    })
    if (err) {
      setSeasonStatus('error')
      setSeasonErr(err)
    } else {
      setSeasonStatus('saved')
    }
  }

  const saveLimits = async () => {
    for (const s of SPECIES) {
      const parsed = parseLimit(limitInputs[s.key] ?? '')
      if (!parsed.ok) {
        setLimitsStatus('error')
        setLimitsErr(
          `“${limitInputs[s.key]}” isn’t a number for ${s.label} — enter a whole number, or clear the box for no limit.`,
        )
        return
      }
    }
    setLimitsStatus('saving')
    setLimitsErr('')
    for (const s of SPECIES) {
      const err = await setSpeciesLimit(
        season.name,
        s.key,
        parseLimit(limitInputs[s.key] ?? '').value,
      )
      if (err) {
        setLimitsStatus('error')
        setLimitsErr(err)
        return
      }
    }
    setLimitsStatus('saved')
  }

  const prevName = previousSeasonName(season.name)
  const prevExists = seasons.some((s) => s.name === prevName)

  const copyFromPrev = async () => {
    setCopyStatus('saving')
    setCopyErr('')
    const prevCfg = seasonFor(prevName)
    const prevLims = limitsFor(prevName)
    let err = await setSeasonConfig(season.name, {
      max_visits: prevCfg.max_visits,
      max_total_birds: prevCfg.max_total_birds,
    })
    if (!err) {
      for (const s of SPECIES) {
        err = await setSpeciesLimit(season.name, s.key, prevLims[s.key])
        if (err) break
      }
    }
    if (err) {
      setCopyStatus('error')
      setCopyErr(err)
    } else {
      setCopyStatus('saved')
    }
  }

  const makeActive = async (name: string) => {
    setSwitchingTo(name)
    setActiveErr('')
    const err = await setActiveSeason(name)
    setSwitchingTo(null)
    if (err) setActiveErr(err)
  }

  const doAddSeason = async () => {
    setAddStatus('saving')
    setAddErr('')
    const err = await addSeason()
    if (err) {
      setAddStatus('error')
      setAddErr(err)
    } else {
      setAddStatus('saved')
    }
  }

  const isActive = season.name === activeName
  const latestName = seasons[0]?.name ?? activeName
  const addName = nextSeasonName(latestName)
  const addExists = seasons.some((s) => s.name === addName)

  return (
    <div className="screen admin-cols">
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
        {prevExists && (
          <>
            {copyStatus === 'error' && <p className="field-error">{copyErr}</p>}
            <button
              type="button"
              className="btn btn-secondary btn-block btn-stack"
              onClick={copyFromPrev}
              disabled={copyStatus === 'saving'}
            >
              {copyStatus === 'saving'
                ? 'Copying…'
                : copyStatus === 'saved'
                  ? `Copied from ${prevName} ✓`
                  : `Copy all limits from ${prevName}`}
            </button>
          </>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">Seasons</h2>
        <p className="settings-note">
          New bag returns are recorded against the <strong>active</strong> season.
        </p>
        {activeErr && <p className="field-error">{activeErr}</p>}
        <ul className="season-table">
          {seasons.map((s) => (
            <li className="season-row" key={s.name}>
              <span className="season-row-main">
                <span className="season-row-name">{s.name}</span>
                <span className="season-row-dates">
                  {formatDate(s.start_date)} – {formatDate(s.end_date)}
                </span>
              </span>
              {s.name === activeName ? (
                <span className="pill pill-active">Active</span>
              ) : (
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => makeActive(s.name)}
                  disabled={switchingTo !== null}
                >
                  {switchingTo === s.name ? 'Switching…' : 'Make active'}
                </button>
              )}
            </li>
          ))}
        </ul>

        <div className="settings-divider" />

        <p className="settings-note">
          Add the next season (<strong>{addName}</strong>) as a new row. It copies{' '}
          {latestName}’s dates &amp; limits and starts empty; use{' '}
          <strong>Make active</strong> above when you’re ready to switch to it.
        </p>
        {addErr && <p className="field-error">{addErr}</p>}
        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={doAddSeason}
          disabled={addStatus === 'saving' || addExists}
        >
          {addStatus === 'saving'
            ? 'Adding…'
            : addExists
              ? `${addName} already added`
              : `+ Add ${addName} season`}
        </button>
      </section>
    </div>
  )
}
