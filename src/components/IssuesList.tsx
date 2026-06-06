import { useIssueReports } from '../lib/useIssueReports'
import { formatDateTime } from '../lib/season'

export function IssuesList() {
  const { data, state, error, reload } = useIssueReports()

  return (
    <div className="screen">
      <div className="subhead">
        <span className="muted-count">
          {state === 'ready'
            ? `${data.length} issue${data.length === 1 ? '' : 's'}`
            : ' '}
        </span>
        <button type="button" className="btn-link" onClick={reload}>
          ↻ Refresh
        </button>
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
                    ? `No. ${issue.membership_number}`
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
