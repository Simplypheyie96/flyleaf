import { useState } from 'react'
import { getPref, setPref, type ThemePref } from '../theme'
import { AutoThemeIcon, MoonIcon, SunIcon } from './TabIcons'
import styles from './ThemeToggle.module.css'

const OPTIONS: {
  value: ThemePref
  label: string
  Icon: (props: { size?: number }) => React.ReactElement
}[] = [
  { value: 'system', label: 'Auto', Icon: AutoThemeIcon },
  { value: 'light', label: 'Day', Icon: SunIcon },
  { value: 'dark', label: 'Night', Icon: MoonIcon },
]

interface ThemeToggleProps {
  /** Id of the visible label naming this control, where the screen has one. */
  labelledBy?: string
}

/**
 * Follows system by default; Day/Night are the manual override.
 *
 * Shaped like the bottom bar's tabs — glyph at rest, the chosen one grows to
 * glyph + word — so the control the reader meets in Settings is one they have
 * already learnt downstairs.
 */
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
      /* One name or the other, never both — a group beside a visible heading
         that also carries aria-label="Theme" is announced twice. */
      aria-label={labelledBy ? undefined : 'Theme'}
      aria-labelledby={labelledBy}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = pref === value
        return (
          <button
            key={value}
            type="button"
            className={styles.option}
            aria-pressed={selected}
            /* The word is only painted for the chosen option, so every button
               states its own name regardless. */
            aria-label={label}
            onClick={() => choose(value)}
          >
            <Icon size={19} />
            {selected && <span className={styles.optionLabel}>{label}</span>}
          </button>
        )
      })}
    </div>
  )
}

export default ThemeToggle
