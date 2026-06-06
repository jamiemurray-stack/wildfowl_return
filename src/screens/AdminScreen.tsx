import { useState } from 'react'
import { AdminGate } from '../components/AdminGate'
import { Segmented } from '../components/Segmented'
import { SeasonReport } from '../components/SeasonReport'
import { ReturnsList } from '../components/ReturnsList'
import { IssuesList } from '../components/IssuesList'

const SUBVIEWS = ['Report', 'Returns', 'Issues'] as const
type SubView = (typeof SUBVIEWS)[number]

export function AdminScreen() {
  return (
    <AdminGate title="Admin Panel">
      <AdminPanel />
    </AdminGate>
  )
}

function AdminPanel() {
  const [view, setView] = useState<SubView>('Report')

  return (
    <div className="screen">
      <header className="list-header">
        <h1 className="screen-title">Admin</h1>
      </header>

      <Segmented
        options={SUBVIEWS}
        value={view}
        onChange={setView}
        ariaLabel="Admin section"
      />

      {view === 'Report' && <SeasonReport />}
      {view === 'Returns' && <ReturnsList />}
      {view === 'Issues' && <IssuesList />}
    </div>
  )
}
