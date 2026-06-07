import { useState } from 'react'
import { AdminGate } from '../components/AdminGate'
import { Segmented } from '../components/Segmented'
import { AdminOverview } from '../components/AdminOverview'
import { ReturnsList } from '../components/ReturnsList'
import { IssuesList } from '../components/IssuesList'
import { SettingsView } from '../components/SettingsView'

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
  const [view, setView] = useState<SubView>('Overview')

  return (
    <div className="screen">
      <Segmented
        options={SUBVIEWS}
        value={view}
        onChange={setView}
        ariaLabel="Admin section"
      />

      {view === 'Overview' && <AdminOverview />}
      {view === 'Returns' && <ReturnsList />}
      {view === 'Issues' && <IssuesList />}
      {view === 'Settings' && <SettingsView />}
    </div>
  )
}
