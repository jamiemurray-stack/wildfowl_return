import { Component, type ReactNode } from 'react'

/** Last line of defence: without this, any uncaught render error unmounts the
 *  whole tree and leaves a blank white page — the worst outcome for a member
 *  standing on a marsh. */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="gate">
        <div className="gate-card">
          <div className="gate-lock" aria-hidden="true">
            ⚠️
          </div>
          <h2 className="gate-title">Something went wrong</h2>
          <p className="gate-text">
            The app hit an unexpected error. Reloading usually fixes it — nothing
            you submitted has been lost.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
