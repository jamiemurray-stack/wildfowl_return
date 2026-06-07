import { useEffect, useState } from 'react'
import { AdminGate } from '../components/AdminGate'
import { Segmented } from '../components/Segmented'
import { AdminOverview } from '../components/AdminOverview'
import { ReturnsList } from '../components/ReturnsList'
import { IssuesList } from '../components/IssuesList'
import { SettingsView } from '../components/SettingsView'
import { SeasonDateNotice } from '../components/SeasonDateNotice'
import { useSettings } from '../lib/useSettings'
import { useIssueReports } from '../lib/useIssueReports'
import { getIssuesLastSeen, setIssuesLastSeen } from '../lib/issuesSeen'

const SUBVIEWS = ['Overview', 'Returns', 'Issues', 'Settings'] as const
type SubView = (typeof SUBVIEWS)[number]

export function AdminScreen() {
  return (
    <AdminGate title="Admin Panel">
      <AdminPanel />
    </AdminGate>
  )
}

function AdminPanel() {
  const { activeName, seasons, seasonFor, limitsFor } = useSettings()
  const issues = useIssueReports()

  const [view, setView] = useState<SubView>('Overview')
  const [viewed, setViewed] = useState(activeName)
  const [lastSeen, setLastSeen] = useState(getIssuesLastSeen)

  // Follow the active season when it changes (e.g. after starting a new one).
  useEffect(() => {
    setViewed(activeName)
  }, [activeName])

  // Opening the Issues tab marks everything currently reported as seen.
  useEffect(() => {
    if (view === 'Issues' && issues.state === 'ready' && issues.data.length > 0) {
      const newest = issues.data[0].submitted_at
      if (newest > lastSeen) {
        setIssuesLastSeen(newest)
        setLastSeen(newest)
      }
    }
  }, [view, issues.state, issues.data, lastSeen])

  const unseen = issues.data.filter((i) => i.submitted_at > lastSeen).length
  const season = seasonFor(viewed)
  const limits = limitsFor(viewed)

  return (
    <div className="screen">
      <SeasonDateNotice />
      {seasons.length > 1 && (
        <div className="season-picker">
          <label className="season-picker-label" htmlFor="season-select">
            Season
          </label>
          <select
            id="season-select"
            className="input select season-select"
            value={viewed}
            onChange={(e) => setViewed(e.target.value)}
          >
            {seasons.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
                {s.name === activeName ? ' (active)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <Segmented
        options={SUBVIEWS}
        value={view}
        onChange={setView}
        ariaLabel="Admin section"
        badges={{ Issues: unseen }}
      />

      {view === 'Overview' && <AdminOverview season={season} limits={limits} />}
      {view === 'Returns' && <ReturnsList season={season} />}
      {view === 'Issues' && (
        <IssuesList
          data={issues.data}
          state={issues.state}
          error={issues.error}
          reload={issues.reload}
        />
      )}
      {view === 'Settings' && <SettingsView season={season} limits={limits} />}
    </div>
  )
}
