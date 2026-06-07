import { useMemo } from 'react'
import { useSeasonTotals } from '../lib/useSeasonTotals'
import { useBagReturns } from '../lib/useBagReturns'
import { SPECIES, type SpeciesKey } from '../data/species'
import { captionFromDates, monthsBetween } from '../lib/season'
import { rowsToCsv, downloadCsv } from '../lib/csv'
import type { LocationName, SeasonConfig } from '../types'

const LOCATIONS: LocationName[] = ['Sands', 'Marshes']

type Status = 'none' | 'ok' | 'approaching' | 'reached'

function statusOf(value: number, limit: number | null): Status {
  if (limit == null) return 'none'
  if (value >= limit) return 'reached'
  if (value >= limit * 0.8) return 'approaching'
  return 'ok'
}

function pct(value: number, limit: number | null): number {
  if (!limit) return 0
  return Math.min(100, Math.round((value / limit) * 100))
}

export function AdminOverview({
  season,
  limits,
}: {
  season: SeasonConfig
  limits: Record<SpeciesKey, number | null>
}) {
  const { totals, reload: reloadTotals } = useSeasonTotals(season.name)
  const { data, state, error, reload: reloadData } = useBagReturns(season.name)

  const extra = useMemo(() => {
    const byLocation: Record<string, { returns: number; birds: number }> = {
      Sands: { returns: 0, birds: 0 },
      Marshes: { returns: 0, birds: 0 },
    }
    const months = monthsBetween(season.start_date, season.end_date)
    const monthBirds: Record<string, number> = {}
    for (const m of months) monthBirds[m.key] = 0
    let nilReturns = 0
    for (const r of data) {
      if (r.nil_return) nilReturns++
      const loc = byLocation[r.location]
      if (loc) {
        loc.returns++
        loc.birds += r.total_shot
      }
      const mk = r.date_of_visit.slice(0, 7)
      if (mk in monthBirds) monthBirds[mk] += r.total_shot
    }
    const monthly = months.map((m) => ({ ...m, birds: monthBirds[m.key] }))
    return {
      byLocation,
      nilReturns,
      monthly,
      maxMonth: Math.max(1, ...monthly.map((m) => m.birds)),
      maxLocBirds: Math.max(1, byLocation.Sands.birds, byLocation.Marshes.birds),
    }
  }, [data, season.start_date, season.end_date])

  const speciesRows = useMemo(
    () =>
      SPECIES.map((s) => ({ ...s, total: totals[s.key] })).sort(
        (a, b) => b.total - a.total,
      ),
    [totals],
  )
  const maxSpecies = Math.max(1, ...speciesRows.map((s) => s.total))

  const alerts = useMemo(() => {
    const reached: string[] = []
    const approaching: string[] = []
    const check = (label: string, value: number, limit: number | null) => {
      const st = statusOf(value, limit)
      if (st === 'reached') reached.push(`${label} (${value}/${limit})`)
      else if (st === 'approaching') approaching.push(`${label} (${value}/${limit})`)
    }
    check('Visits', totals.returns, season.max_visits)
    check('Total birds', totals.total_birds, season.max_total_birds)
    for (const s of SPECIES) check(s.label, totals[s.key], limits[s.key])
    return { reached, approaching }
  }, [totals, limits, season.max_visits, season.max_total_birds])

  const limitRows: { label: string; value: number; limit: number | null }[] = [
    { label: 'Visits', value: totals.returns, limit: season.max_visits },
    { label: 'Total birds', value: totals.total_birds, limit: season.max_total_birds },
    ...SPECIES.map((s) => ({
      label: s.label,
      value: totals[s.key],
      limit: limits[s.key],
    })),
  ].filter((row) => row.limit != null)

  const refresh = () => {
    reloadTotals()
    reloadData()
  }

  const exportCsv = () => {
    const today = new Date().toISOString().slice(0, 10)
    const rows: (string | number | null)[][] = [
      ['Grange & District Wildfowlers — Season Report'],
      [`Season ${season.name}`],
      [captionFromDates(season.start_date, season.end_date)],
      ['Generated', today],
      [],
      ['Metric', 'Value', 'Limit'],
      ['Visits', totals.returns, season.max_visits ?? ''],
      ['Total birds', totals.total_birds, season.max_total_birds ?? ''],
      ['Nil returns', extra.nilReturns, ''],
      [],
      ['Species', 'Total', 'Limit'],
      ...SPECIES.map((s) => [s.label, totals[s.key], limits[s.key] ?? '']),
      [],
      ['Location', 'Returns', 'Birds'],
      ...LOCATIONS.map((loc) => [
        loc,
        extra.byLocation[loc].returns,
        extra.byLocation[loc].birds,
      ]),
      [],
      ['Month', 'Birds'],
      ...extra.monthly.map((m) => [m.label, m.birds]),
    ]
    downloadCsv(`season-report-${season.name.replace('/', '-')}.csv`, rowsToCsv(rows))
  }

  return (
    <div className="screen">
      <div className="subhead">
        <p className="app-caption">
          {season.name} · {captionFromDates(season.start_date, season.end_date)}
        </p>
        <div className="subhead-actions">
          <button
            type="button"
            className="btn-link"
            onClick={exportCsv}
            disabled={totals.returns === 0}
          >
            ⬇ Export CSV
          </button>
          <button type="button" className="btn-link" onClick={refresh}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {alerts.reached.length > 0 && (
        <div className="banner banner-error" role="alert">
          🛑 Limit reached — {alerts.reached.join(', ')}
        </div>
      )}
      {alerts.approaching.length > 0 && (
        <div className="banner banner-warn" role="status">
          ⚠️ Approaching limit — {alerts.approaching.join(', ')}
        </div>
      )}

      <div className="stat-grid">
        <div className="stat">
          <span className="stat-value">{totals.returns}</span>
          <span className="stat-label">Visits</span>
        </div>
        <div className="stat">
          <span className="stat-value">{totals.total_birds}</span>
          <span className="stat-label">Birds shot</span>
        </div>
        <div className="stat">
          <span className="stat-value">{extra.nilReturns}</span>
          <span className="stat-label">Nil returns</span>
        </div>
      </div>

      <section className="card">
        <h2 className="card-title">Limit status</h2>
        {limitRows.length === 0 ? (
          <p className="settings-note">
            No limits set for this season — add them in the Settings tab.
          </p>
        ) : (
          <ul className="limit-list">
          {limitRows.map((row) => {
            const st = statusOf(row.value, row.limit)
            return (
              <li className="limit-row" key={row.label}>
                <div className="limit-top">
                  <span className="limit-name">{row.label}</span>
                  <span className="limit-val">
                    {row.limit == null
                      ? `${row.value} · no limit`
                      : `${row.value} / ${row.limit}`}
                  </span>
                </div>
                <span className="limit-track">
                  <span
                    className={`limit-fill is-${st}`}
                    style={{ width: `${pct(row.value, row.limit)}%` }}
                  />
                </span>
              </li>
            )
          })}
          </ul>
        )}
      </section>

      {state === 'error' && (
        <p className="state state-error">Couldn’t load returns: {error}</p>
      )}
      {state === 'ready' && data.length === 0 && (
        <p className="state">No returns yet this season.</p>
      )}

      {state === 'ready' && data.length > 0 && (
        <>
          <section className="card">
            <h2 className="card-title">Birds by species</h2>
            <ul className="bars">
              {speciesRows.map((s) => (
                <li className="bar-row" key={s.key}>
                  <span className="bar-label">{s.label}</span>
                  <span className="bar-track">
                    <span
                      className="bar-fill"
                      style={{
                        width:
                          s.total === 0
                            ? '0%'
                            : `${Math.max(4, (s.total / maxSpecies) * 100)}%`,
                      }}
                    />
                  </span>
                  <span className="bar-value">{s.total}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h2 className="card-title">By location</h2>
            <ul className="bars">
              {LOCATIONS.map((loc) => (
                <li className="bar-row" key={loc}>
                  <span className="bar-label">
                    {loc}
                    <small className="bar-sub">
                      {extra.byLocation[loc].returns} return
                      {extra.byLocation[loc].returns === 1 ? '' : 's'}
                    </small>
                  </span>
                  <span className="bar-track">
                    <span
                      className="bar-fill bar-fill-alt"
                      style={{
                        width:
                          extra.byLocation[loc].birds === 0
                            ? '0%'
                            : `${Math.max(4, (extra.byLocation[loc].birds / extra.maxLocBirds) * 100)}%`,
                      }}
                    />
                  </span>
                  <span className="bar-value">{extra.byLocation[loc].birds}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h2 className="card-title">Birds by month</h2>
            <div className="months">
              {extra.monthly.map((m) => (
                <div className="month-col" key={m.key}>
                  <span className="month-value">{m.birds}</span>
                  <div className="month-bar-wrap">
                    <div
                      className="month-bar"
                      style={{
                        height:
                          m.birds === 0
                            ? '0%'
                            : `${Math.max(6, (m.birds / extra.maxMonth) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="month-label">{m.label}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
