import { useMemo } from 'react'
import { AdminGate } from '../components/AdminGate'
import { useBagReturns } from '../lib/useBagReturns'
import { SPECIES } from '../data/species'
import { SEASON } from '../lib/season'
import type { LocationName } from '../types'

export function ReportScreen() {
  return (
    <AdminGate title="Season Report">
      <ReportContent />
    </AdminGate>
  )
}

const LOCATIONS: LocationName[] = ['Sands', 'Marshes']

function ReportContent() {
  const { data, state, error, reload } = useBagReturns()

  const summary = useMemo(() => {
    const speciesTotals: Record<string, number> = {}
    for (const s of SPECIES) speciesTotals[s.key] = 0

    const byLocation: Record<string, { returns: number; birds: number }> = {
      Sands: { returns: 0, birds: 0 },
      Marshes: { returns: 0, birds: 0 },
    }

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
    }

    return {
      speciesTotals,
      byLocation,
      totalBirds,
      nilReturns,
      totalReturns: data.length,
    }
  }, [data])

  return (
    <div className="screen">
      <header className="list-header">
        <div>
          <h1 className="screen-title">Season Report</h1>
          <p className="app-caption">{SEASON.caption}</p>
        </div>
        <button type="button" className="btn-link" onClick={reload}>
          ↻ Refresh
        </button>
      </header>

      {state === 'loading' && <p className="state">Loading…</p>}
      {state === 'error' && (
        <p className="state state-error">Couldn’t load returns: {error}</p>
      )}

      {state === 'ready' && (
        <>
          <div className="stat-grid">
            <div className="stat">
              <span className="stat-value">{summary.totalReturns}</span>
              <span className="stat-label">Returns</span>
            </div>
            <div className="stat">
              <span className="stat-value">{summary.totalBirds}</span>
              <span className="stat-label">Birds shot</span>
            </div>
            <div className="stat">
              <span className="stat-value">{summary.nilReturns}</span>
              <span className="stat-label">Nil returns</span>
            </div>
          </div>

          <section className="card">
            <h2 className="card-title">By species</h2>
            <ul className="table">
              {SPECIES.map((s) => (
                <li className="table-row" key={s.key}>
                  <span>{s.label}</span>
                  <span className="table-num">{summary.speciesTotals[s.key]}</span>
                </li>
              ))}
              <li className="table-row table-total">
                <span>Total</span>
                <span className="table-num">{summary.totalBirds}</span>
              </li>
            </ul>
          </section>

          <section className="card">
            <h2 className="card-title">By location</h2>
            <ul className="table">
              {LOCATIONS.map((loc) => (
                <li className="table-row" key={loc}>
                  <span>{loc}</span>
                  <span className="table-meta">
                    {summary.byLocation[loc].returns} return
                    {summary.byLocation[loc].returns === 1 ? '' : 's'}
                  </span>
                  <span className="table-num">{summary.byLocation[loc].birds}</span>
                </li>
              ))}
            </ul>
          </section>

          {summary.totalReturns === 0 && (
            <p className="state">No returns submitted yet this season.</p>
          )}
        </>
      )}
    </div>
  )
}
