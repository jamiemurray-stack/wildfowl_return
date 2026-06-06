import { useMemo } from 'react'
import { useBagReturns } from '../lib/useBagReturns'
import { SPECIES } from '../data/species'
import { SEASON } from '../lib/season'
import type { LocationName } from '../types'

const LOCATIONS: LocationName[] = ['Sands', 'Marshes']

// The huntable months of the season, in order, for the monthly chart.
const MONTHS = [
  { key: '2025-09', label: 'Sep' },
  { key: '2025-10', label: 'Oct' },
  { key: '2025-11', label: 'Nov' },
  { key: '2025-12', label: 'Dec' },
  { key: '2026-01', label: 'Jan' },
  { key: '2026-02', label: 'Feb' },
]

export function SeasonReport() {
  const { data, state, error, reload } = useBagReturns()

  const stats = useMemo(() => {
    const speciesTotals: Record<string, number> = {}
    for (const s of SPECIES) speciesTotals[s.key] = 0

    const byLocation: Record<string, { returns: number; birds: number }> = {
      Sands: { returns: 0, birds: 0 },
      Marshes: { returns: 0, birds: 0 },
    }

    const monthBirds: Record<string, number> = {}
    for (const m of MONTHS) monthBirds[m.key] = 0

    let totalBirds = 0
    let nilReturns = 0

    for (const r of data) {
      totalBirds += r.total_shot
      if (r.nil_return) nilReturns += 1
      for (const s of SPECIES) speciesTotals[s.key] += r[s.key] ?? 0
      const loc = byLocation[r.location]
      if (loc) {
        loc.returns += 1
        loc.birds += r.total_shot
      }
      const mk = r.date_of_visit.slice(0, 7)
      if (mk in monthBirds) monthBirds[mk] += r.total_shot
    }

    const species = SPECIES.map((s) => ({
      label: s.label,
      key: s.key,
      total: speciesTotals[s.key],
    })).sort((a, b) => b.total - a.total)

    const months = MONTHS.map((m) => ({ ...m, birds: monthBirds[m.key] }))

    return {
      species,
      months,
      byLocation,
      totalBirds,
      nilReturns,
      totalReturns: data.length,
      maxSpecies: Math.max(1, ...species.map((s) => s.total)),
      maxMonth: Math.max(1, ...months.map((m) => m.birds)),
      maxLocBirds: Math.max(1, byLocation.Sands.birds, byLocation.Marshes.birds),
    }
  }, [data])

  if (state === 'loading') return <p className="state">Loading…</p>
  if (state === 'error')
    return <p className="state state-error">Couldn’t load returns: {error}</p>

  return (
    <div className="screen">
      <div className="subhead">
        <p className="app-caption">{SEASON.caption}</p>
        <button type="button" className="btn-link" onClick={reload}>
          ↻ Refresh
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <span className="stat-value">{stats.totalReturns}</span>
          <span className="stat-label">Returns</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stats.totalBirds}</span>
          <span className="stat-label">Birds shot</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stats.nilReturns}</span>
          <span className="stat-label">Nil returns</span>
        </div>
      </div>

      {stats.totalReturns === 0 ? (
        <p className="state">No returns submitted yet this season.</p>
      ) : (
        <>
          <section className="card">
            <h2 className="card-title">Birds by species</h2>
            <ul className="bars">
              {stats.species.map((s) => (
                <li className="bar-row" key={s.key}>
                  <span className="bar-label">{s.label}</span>
                  <span className="bar-track">
                    <span
                      className="bar-fill"
                      style={{
                        width:
                          s.total === 0
                            ? '0%'
                            : `${Math.max(4, (s.total / stats.maxSpecies) * 100)}%`,
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
                      {stats.byLocation[loc].returns} return
                      {stats.byLocation[loc].returns === 1 ? '' : 's'}
                    </small>
                  </span>
                  <span className="bar-track">
                    <span
                      className="bar-fill bar-fill-alt"
                      style={{
                        width:
                          stats.byLocation[loc].birds === 0
                            ? '0%'
                            : `${Math.max(
                                4,
                                (stats.byLocation[loc].birds / stats.maxLocBirds) * 100,
                              )}%`,
                      }}
                    />
                  </span>
                  <span className="bar-value">{stats.byLocation[loc].birds}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h2 className="card-title">Birds by month</h2>
            <div className="months">
              {stats.months.map((m) => (
                <div className="month-col" key={m.key}>
                  <span className="month-value">{m.birds}</span>
                  <div className="month-bar-wrap">
                    <div
                      className="month-bar"
                      style={{
                        height:
                          m.birds === 0
                            ? '0%'
                            : `${Math.max(6, (m.birds / stats.maxMonth) * 100)}%`,
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
