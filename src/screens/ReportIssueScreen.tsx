import { useEffect, useState } from 'react'
import { supabase, thrownMessage } from '../lib/supabase'
import { ISSUE_CATEGORIES, ISSUE_LOCATIONS } from '../data/issues'
import {
  getRememberedMembership,
  rememberMembership,
  normalizeMembership,
} from '../lib/membership'
import { scrollToTop } from '../lib/scroll'

export function ReportIssueScreen() {
  const [membership, setMembership] = useState(getRememberedMembership)
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')

  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  )
  const [errorMsg, setErrorMsg] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  useEffect(() => {
    rememberMembership(membership)
  }, [membership])

  const clearStatus = () => {
    if (status !== 'idle') setStatus('idle')
  }

  const categoryValid = category !== ''
  const descriptionValid = description.trim() !== ''
  const valid = categoryValid && descriptionValid

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) {
      setShowErrors(true)
      return
    }
    setStatus('saving')
    setErrorMsg('')

    try {
      const { error } = await supabase.from('issue_reports').insert({
        membership_number: normalizeMembership(membership) || null,
        category,
        location: location || null,
        description: description.trim(),
      })
      if (error) throw new Error(error.message)
    } catch (e) {
      const msg = thrownMessage(e)
      setStatus('error')
      setErrorMsg(
        /fetch|network|load failed/i.test(msg)
          ? 'no connection. Your report is still here - try again when you have signal.'
          : msg,
      )
      return
    }

    setStatus('saved')
    setShowErrors(false)
    setCategory('')
    setLocation('')
    setDescription('')
    scrollToTop()
  }

  return (
    <div className="screen">
      <header className="app-header">
        <h1 className="app-title">Report an Issue</h1>
        <p className="app-caption">
          Flag a safety, access or conservation concern for the committee.
        </p>
      </header>

      {status === 'saved' && (
        <div className="banner banner-success" role="status">
          ✓ Thanks - your report has been sent to the committee.
        </div>
      )}
      {status === 'error' && (
        <div className="banner banner-error" role="alert">
          Couldn’t send: {errorMsg || 'check your connection and try again.'}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <section className="card">
          <label className="field">
            <span className="field-label">Category</span>
            <select
              className="input select"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                clearStatus()
              }}
            >
              <option value="">Select a category…</option>
              {ISSUE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {showErrors && !categoryValid && (
              <span className="field-error">Please choose a category.</span>
            )}
          </label>

          <label className="field">
            <span className="field-label">
              Location <span className="muted">(optional)</span>
            </span>
            <select
              className="input select"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="">Not specified</option>
              {ISSUE_LOCATIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="card">
          <label className="field">
            <span className="field-label">What’s the issue?</span>
            <textarea
              className="input textarea"
              rows={5}
              placeholder="Describe what you saw, where, and when…"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                clearStatus()
              }}
            />
            {showErrors && !descriptionValid && (
              <span className="field-error">Please describe the issue.</span>
            )}
          </label>

          <label className="field">
            <span className="field-label">
              Your membership number <span className="muted">(optional)</span>
            </span>
            <input
              className="input"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 27"
              value={membership}
              onChange={(e) => setMembership(e.target.value)}
            />
          </label>
        </section>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={status === 'saving'}
        >
          {status === 'saving' ? 'Sending…' : 'Send report'}
        </button>
      </form>
    </div>
  )
}
