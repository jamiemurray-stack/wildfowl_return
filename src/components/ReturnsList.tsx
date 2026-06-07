import { useState } from 'react'
import { useBagReturns } from '../lib/useBagReturns'
import { SPECIES } from '../data/species'
import { formatDate, formatDateTime } from '../lib/season'
import { toCsv, downloadCsv } from '../lib/csv'
import type { BagReturn } from '../types'

export function ReturnsList() {
  const { data, state, error, reload } = useBagReturns()
  const [selected, setSelected] = useState<BagReturn | null>(null)

  const exportCsv = () => {
    const headers = [
      'Membership Number',
      'Date of Visit',
      'Location',
      ...SPECIES.map((s) => s.label),
      'Nil Return',
      'Total Shot',
      'Notes',
      'Submitted At',
    ]
    const rows = data.map((r) => [
      r.membership_number,
      r.date_of_visit,
      r.location,
      ...SPECIES.map((s) => r[s.key]),
      r.nil_return ? 'Yes' : 'No',
      r.total_shot,
      r.notes ?? '',
      r.submitted_at,
    ])
    downloadCsv('bag-returns-2025-26.csv', toCsv(headers, rows))
  }

  if (selected) {
    return <ReturnDetail record={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="screen">
      <div className="subhead">
        <span className="muted-count">
          {state === 'ready' ? `${data.length} return${data.length === 1 ? '' : 's'}` : ' '}
        </span>
        <div className="subhead-actions">
          <button
            type="button"
            className="btn-link"
            onClick={exportCsv}
            disabled={data.length === 0}
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
        <p className="state state-error">Couldn’t load returns: {error}</p>
      )}
      {state === 'ready' && data.length === 0 && (
        <p className="state">No returns submitted yet.</p>
      )}

      {state === 'ready' && data.length > 0 && (
        <ul className="return-list">
          {data.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="return-item"
                onClick={() => setSelected(r)}
              >
                <span className="return-main">
                  <span className="return-date">{formatDate(r.date_of_visit)}</span>
                  <span className="return-meta">
                    {r.location} · No. {r.membership_number}
                  </span>
                </span>
                <span className="return-right">
                  {r.nil_return ? (
                    <span className="pill pill-nil">Nil</span>
                  ) : (
                    <span className="return-total">{r.total_shot}</span>
                  )}
                  <span className="chevron" aria-hidden="true">
                    ›
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ReturnDetail({
  record,
  onBack,
}: {
  record: BagReturn
  onBack: () => void
}) {
  return (
    <div className="screen">
      <button type="button" className="back-btn" onClick={onBack}>
        ‹ Back to returns
      </button>

      <section className="card">
        <div className="detail-row">
          <span className="detail-key">Membership No.</span>
          <span className="detail-val">{record.membership_number}</span>
        </div>
        <div className="detail-row">
          <span className="detail-key">Date of Visit</span>
          <span className="detail-val">{formatDate(record.date_of_visit)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-key">Location</span>
          <span className="detail-val">{record.location}</span>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Bag</h2>
        {record.nil_return ? (
          <p className="nil-note">Nil return — shot nothing.</p>
        ) : (
          <ul className="table">
            {SPECIES.map((s) => (
              <li className="table-row" key={s.key}>
                <span>{s.label}</span>
                <span className="table-num">{record[s.key]}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="total-row">
          <span className="total-label">Total shot</span>
          <span className="total-value">{record.total_shot}</span>
        </div>
      </section>

      {record.notes && (
        <section className="card">
          <h2 className="card-title">Notes</h2>
          <p className="notes-text">{record.notes}</p>
        </section>
      )}

      <p className="submitted-at">Submitted {formatDateTime(record.submitted_at)}</p>
    </div>
  )
}
