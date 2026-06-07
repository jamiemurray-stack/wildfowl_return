import { useState } from 'react'
import { TabBar, type TabKey } from './components/TabBar'
import { SubmitScreen } from './screens/SubmitScreen'
import { ReportIssueScreen } from './screens/ReportIssueScreen'
import { AdminScreen } from './screens/AdminScreen'
import { SettingsProvider } from './lib/useSettings'

export default function App() {
  const [tab, setTab] = useState<TabKey>('submit')

  return (
    <SettingsProvider>
      <div className="app-shell">
        <main className={`app-main${tab === 'admin' ? ' app-main--wide' : ''}`}>
          {/* Remount per tab so the admin screen re-checks the gate and refetches. */}
          {tab === 'submit' && <SubmitScreen key="submit" />}
          {tab === 'report' && <ReportIssueScreen key="report" />}
          {tab === 'admin' && <AdminScreen key="admin" />}
        </main>
        <TabBar active={tab} onChange={setTab} />
      </div>
    </SettingsProvider>
  )
}
