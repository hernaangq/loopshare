import './DayChips.css'

const DAY_MAP = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
}

const ALL_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

export default function DayChips({ days, compact = false, selectable = false, onToggle }) {
  const activeDays = (days || '').split(',').map(d => d.trim().toUpperCase())

  if (compact) {
    return (
      <div className="day-chips compact">
        {ALL_DAYS.map(day => (
          <span
            key={day}
            className={`day-chip ${activeDays.includes(day) ? 'active' : ''}`}
          >
            {DAY_MAP[day][0]}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="day-chips">
      {ALL_DAYS.map(day => (
        <button
          key={day}
          type="button"
          className={`day-chip ${activeDays.includes(day) ? 'active' : ''} ${selectable ? 'selectable' : ''}`}
          onClick={() => selectable && onToggle?.(day)}
        >
          {DAY_MAP[day]}
        </button>
      ))}
    </div>
  )
}
