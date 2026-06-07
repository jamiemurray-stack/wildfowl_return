import { useMemo, useState } from 'react'
import { useBagReturns } from '../lib/useBagReturns'
import { useSettings } from '../lib/useSettings'
import { SPECIES, type SpeciesKey } from '../data/species'
import { seasonShort } from '../lib/season'
import { toCsv, downloadCsv } from '../lib/csv'
import type { SeasonConfig } from '../types'

type SortKey = SpeciesKey | 'total' | 'visits' | 'pervisit'

const perVisit = (total: number, visits: number) => (visits ? total / visits : 0)

type Row = {
  member: string
  counts: Record<SpeciesKey, number>
  total: number
  visits: number
}

export function Leaderboard({ season }: { season: SeasonConfig }) {
  const { data, state, error, reload } = useBagReturns(season.name)
  const { memberLabel, memberName } = useSettings()
  const [sortKey, setSortKey] = useState<SortKey>('total')
  const [asc, setAsc] = useState(false)

  const rows = useMemo<Row[]>(() => {
    const map = new Map<string, Row>()
    for (const r of data) {
      const key = r.membership_number
      let row = map.get(key)
      if (!row) {
        row = {
          member: key,
          counts: Object.fromEntries(SPECIES.map((s) => [s.key, 0])) as Record<
            SpeciesKey,
            number
          >,
          total: 0,
          visits: 0,
        }
        map.set(key, row)
      }
      for (const s of SPECIES) row.counts[s.key] += r[s.key] ?? 0
      row.total += r.total_shot
      row.visits += 1
    }
    return [...map.values()]
  }, [data])

  const sorted = useMemo(() => {
    const val = (row: Row) =>
      sortKey === 'total'
        ? row.total
        : sortKey === 'visits'
          ? row.visits
          : sortKey === 'pervisit'
            ? perVisit(row.total, row.visits)
            : row.counts[sortKey]
    return [...rows].sort((a, b) => {
      const d = val(a) - val(b)
      return asc ? d : -d
    })
  }, [rows, sortKey, asc])

  const grand = useMemo(() => {
    const g = {
      counts: Object.fromEntries(SPECIES.map((s) => [s.key, 0])) as Record<
        SpeciesKey,
        number
      >,
      total: 0,
      visits: 0,
    }
    for (const r of rows) {
      for (const s of SPECIES) g.counts[s.key] += r.counts[s.key]
      g.total += r.total
      g.visits += r.visits
    }
    return g
  }, [rows])

  const setSort = (k: SortKey) => {
    if (k === sortKey) setAsc((a) => !a)
    else {
      setSortKey(k)
      setAsc(false)
    }
  }

  const arrow = (k: SortKey) => (sortKey === k ? (asc ? ' ▲' : ' ▼') : '')

  const exportCsv = () => {
    const headers = [
      'Rank',
      'Membership Number',
      'Name',
      ...SPECIES.map((s) => s.label),
      'Total',
      'Visits',
      'Birds/visit',
    ]
    const csvRows: (string | number)[][] = sorted.map((r, i) => [
      i + 1,
      r.member,
      memberName(r.member) ?? '',
      ...SPECIES.map((s) => r.counts[s.key]),
      r.total,
      r.visits,
      perVisit(r.total, r.visits).toFixed(1),
    ])
    csvRows.push([
      '',
      'Total',
      '',
      ...SPECIES.map((s) => grand.counts[s.key]),
      grand.total,
      grand.visits,
      perVisit(grand.total, grand.visits).toFixed(1),
    ])
    downloadCsv(
      `leaderboard-${seasonShort(season.name).replace('/', '-')}.csv`,
      toCsv(headers, csvRows),
    )
  }

  return (
    <div className="screen">
      <div className="subhead">
        <span className="muted-count">
          {season.name} · {rows.length} member{rows.length === 1 ? '' : 's'}
        </span>
        <div className="subhead-actions">
          <button
            type="button"
            className="btn-link"
            onClick={exportCsv}
            disabled={rows.length === 0}
          >
            ⬇ Export CSV
          </button>
          <button type="button" className="btn-link" onClick={reload}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {state === 'loading' && <p className="state">Loading…</p>}
      {state === 'error' && (
        <p className="state state-error">Couldn’t load: {error}</p>
      )}
      {state === 'ready' && rows.length === 0 && (
        <p className="state">No returns for {season.name} yet.</p>
      )}

      {state === 'ready' && rows.length > 0 && (
        <div className="card lb-card">
          <div className="lb-scroll">
            <table className="lb-table">
              <thead>
                <tr>
                  <th className="lb-member">Member</th>
                  {SPECIES.map((s) => (
                    <th
                      key={s.key}
                      className="lb-num lb-sort"
                      onClick={() => setSort(s.key)}
                    >
                      {s.short}
                      {arrow(s.key)}
                    </th>
                  ))}
                  <th
                    className="lb-num lb-sort lb-total-col"
                    onClick={() => setSort('total')}
                  >
                    Total{arrow('total')}
                  </th>
                  <th className="lb-num lb-sort" onClick={() => setSort('visits')}>
                    Visits{arrow('visits')}
                  </th>
                  <th
                    className="lb-num lb-sort"
                    onClick={() => setSort('pervisit')}
                  >
                    Birds/visit{arrow('pervisit')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={r.member}>
                    <td className="lb-member">
                      <span className="lb-rank-badge">{i + 1}</span>
                      {memberLabel(r.member)}
                    </td>
                    {SPECIES.map((s) => (
                      <td key={s.key} className="lb-num">
                        {r.counts[s.key]}
                      </td>
                    ))}
                    <td className="lb-num lb-total-col">{r.total}</td>
                    <td className="lb-num">{r.visits}</td>
                    <td className="lb-num">{perVisit(r.total, r.visits).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="lb-member">Total</td>
                  {SPECIES.map((s) => (
                    <td key={s.key} className="lb-num">
                      {grand.counts[s.key]}
                    </td>
                  ))}
                  <td className="lb-num lb-total-col">{grand.total}</td>
                  <td className="lb-num">{grand.visits}</td>
                  <td className="lb-num">
                    {perVisit(grand.total, grand.visits).toFixed(1)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
