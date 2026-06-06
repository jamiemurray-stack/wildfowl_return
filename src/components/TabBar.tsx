export type TabKey = 'submit' | 'report' | 'admin'

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'submit', label: 'Submit', icon: '📋' },
  { key: 'report', label: 'Report', icon: '⚠️' },
  { key: 'admin', label: 'Admin', icon: '📊' },
]

export function TabBar({
  active,
  onChange,
}: {
  active: TabKey
  onChange: (tab: TabKey) => void
}) {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          className={`tab${active === t.key ? ' is-active' : ''}`}
          aria-current={active === t.key ? 'page' : undefined}
          onClick={() => onChange(t.key)}
        >
          <span className="tab-icon" aria-hidden="true">
            {t.icon}
          </span>
          <span className="tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
