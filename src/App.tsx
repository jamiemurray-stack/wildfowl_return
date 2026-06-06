import { useState } from 'react'
import { TabBar, type TabKey } from './components/TabBar'
import { SubmitScreen } from './screens/SubmitScreen'
import { ReportScreen } from './screens/ReportScreen'
import { HistoryScreen } from './screens/HistoryScreen'

export default function App() {
  const [tab, setTab] = useState<TabKey>('submit')

  return (
    <div className="app-shell">
      <main className="app-main">
        {/* Remount per tab so admin screens re-check the gate and refetch. */}
        {tab === 'submit' && <SubmitScreen key="submit" />}
        {tab === 'report' && <ReportScreen key="report" />}
        {tab === 'history' && <HistoryScreen key="history" />}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  )
}
