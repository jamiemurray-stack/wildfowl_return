export function Stepper({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  const dec = () => onChange(Math.max(0, value - 1))
  const inc = () => onChange(value + 1)

  return (
    <div className={`stepper-row${disabled ? ' is-disabled' : ''}`}>
      <span className="stepper-label">{label}</span>
      <div className="stepper" role="group" aria-label={label}>
        <button
          type="button"
          className="step-btn"
          onClick={dec}
          disabled={disabled || value === 0}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="step-value" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          className="step-btn"
          onClick={inc}
          disabled={disabled}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  )
}
