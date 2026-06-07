import { useSettings } from '../lib/useSettings'
import { isDateOutsideSeason, formatDate } from '../lib/season'

/**
 * Big, obvious warning shown when today's date falls more than ~3 months outside
 * the active season window — a prompt to check the correct season is selected.
 */
export function SeasonDateNotice() {
  const { activeSeason, loaded } = useSettings()
  if (!loaded) return null
  if (!isDateOutsideSeason(activeSeason.start_date, activeSeason.end_date)) {
    return null
  }
  return (
    <div className="season-warning" role="alert">
      <span className="season-warning-icon" aria-hidden="true">
        ⚠️
      </span>
      <div className="season-warning-text">
        <strong>Check the season.</strong> Today’s date is outside the active season
        (<strong>{activeSeason.name}</strong>, {formatDate(activeSeason.start_date)} –{' '}
        {formatDate(activeSeason.end_date)}). Make sure the correct season is active
        before logging returns.
      </div>
    </div>
  )
}
