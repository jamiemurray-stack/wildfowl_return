export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  badges,
}: {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  ariaLabel?: string
  badges?: Partial<Record<T, number>>
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => {
        const badge = badges?.[opt]
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={value === opt}
            className={`segment${value === opt ? ' is-active' : ''}`}
            onClick={() => onChange(opt)}
          >
            {opt}
            {badge ? (
              <span className="seg-badge" aria-label={`${badge} new`}>
                {badge}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
