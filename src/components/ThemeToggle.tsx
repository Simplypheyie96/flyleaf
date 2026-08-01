import { useState } from 'react'
import { getPref, setPref, type ThemePref } from '../theme'
import styles from './ThemeToggle.module.css'

const OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Day' },
  { value: 'dark', label: 'Night' },
]

interface ThemeToggleProps {
  /** Id of the visible label naming this control, where the screen has one. */
  labelledBy?: string
}

/** Follows system by default; Day/Night are the manual override. */
function ThemeToggle({ labelledBy }: ThemeToggleProps) {
  const [pref, setPrefState] = useState<ThemePref>(getPref)

  function choose(value: ThemePref) {
    setPref(value)
    setPrefState(value)
  }

  return (
    <div
      className={styles.group}
      role="group"
      /* One name or the other, never both — a group beside a visible "Theme"
         label that also carries aria-label="Theme" is announced twice. */
      aria-label={labelledBy ? undefined : 'Theme'}
      aria-labelledby={labelledBy}
    >
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
