import { formatDateTime } from '../lib/season'
import { toCsv, downloadCsv } from '../lib/csv'
import { useSettings } from '../lib/useSettings'
import type { IssueReport } from '../types'
import type { LoadState } from '../lib/useBagReturns'

export function IssuesList({
  data,
  state,
  error,
  reload,
}: {
  data: IssueReport[]
  state: LoadState
  error: string
  reload: () => void
}) {
  const { memberLabel } = useSettings()

  const exportCsv = () => {
    const headers = [
      'Submitted At',
      'Category',
      'Location',
      'Membership Number',
      'Description',
    ]
    const rows = data.map((i) => [
      i.submitted_at,
      i.category,
      i.location ?? '',
      i.membership_number ?? '',
      i.description,
    ])
    downloadCsv('issues.csv', toCsv(headers, rows))
  }

  return (
    <div className="screen">
      <div className="subhead">
        <span className="muted-count">
          {state === 'ready'
            ? `${data.length} issue${data.length === 1 ? '' : 's'}`
            : ' '}
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
        <p className="state state-error">Couldn’t load issues: {error}</p>
      )}
      {state === 'ready' && data.length === 0 && (
        <p className="state">No issues reported. 👍</p>
      )}

      {state === 'ready' && data.length > 0 && (
        <ul className="issue-list">
          {data.map((issue) => (
            <li className="card issue-card" key={issue.id}>
              <div className="issue-head">
                <span className="pill pill-cat">{issue.category}</span>
                <span className="issue-date">
                  {formatDateTime(issue.submitted_at)}
                </span>
              </div>
              <p className="issue-desc">{issue.description}</p>
              <div className="issue-foot">
                {issue.location && (
                  <span className="issue-tag">📍 {issue.location}</span>
                )}
                <span className="issue-tag">
                  {issue.membership_number
                    ? memberLabel(issue.membership_number)
                    : 'Anonymous'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
