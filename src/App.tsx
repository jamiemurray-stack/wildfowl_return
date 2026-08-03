import { Suspense, lazy, useState } from 'react'
import { TabBar, type TabKey } from './components/TabBar'
import { SubmitScreen } from './screens/SubmitScreen'
import { ReportIssueScreen } from './screens/ReportIssueScreen'
import { SettingsProvider } from './lib/useSettings'

// Most visits only ever submit a return - the whole admin panel loads on demand.
const AdminScreen = lazy(() =>
  import('./screens/AdminScreen').then((m) => ({ default: m.AdminScreen })),
)

export default function App() {
  const [tab, setTab] = useState<TabKey>('submit')

  return (
    <SettingsProvider>
      <div className="app-shell">
        <main className={`app-main${tab === 'admin' ? ' app-main--wide' : ''}`}>
          {/* Submit and Report stay mounted so a half-filled form survives a
              peek at another tab; Admin remounts so it re-checks the gate and
              refetches. */}
          <div style={{ display: tab === 'submit' ? undefined : 'none' }}>
            <SubmitScreen />
          </div>
          <div style={{ display: tab === 'report' ? undefined : 'none' }}>
            <ReportIssueScreen />
          </div>
          {tab === 'admin' && (
            <Suspense fallback={<p className="state">Loading admin…</p>}>
              <AdminScreen key="admin" />
            </Suspense>
          )}
        </main>
        <TabBar active={tab} onChange={setTab} />
      </div>
    </SettingsProvider>
  )
}
