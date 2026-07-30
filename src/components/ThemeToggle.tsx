import { useState } from 'react'
import { getPref, setPref, type ThemePref } from '../theme'
import styles from './ThemeToggle.module.css'

const OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Day' },
  { value: 'dark', label: 'Night' },
]

/** Follows system by default; Day/Night are the manual override. */
function ThemeToggle() {
  const [pref, setPrefState] = useState<ThemePref>(getPref)

  function choose(value: ThemePref) {
    setPref(value)
    setPrefState(value)
  }

  return (
    <div className={styles.group} role="group" aria-label="Theme">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className={styles.option}
          aria-pressed={pref === value}
          onClick={() => choose(value)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export default ThemeToggle
