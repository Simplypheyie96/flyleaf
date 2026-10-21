import { useState } from 'react'
import GlassSurface from '../components/GlassSurface'
import { getKeepStyle, setKeepStyle, type KeepStyle } from '../journey/keepStyle'
import styles from '../components/ThemeToggle.module.css'

const OPTIONS: { value: KeepStyle; label: string }[] = [
  { value: 'card', label: 'Card' },
  { value: 'classic', label: 'Classic' },
]

/** The theme toggle's material, words only: there are two answers and both
    fit, so neither has to hide behind a glyph. */
export default function KeepStyleToggle() {
  const [style, setStyle] = useState(getKeepStyle)
  return (
    <GlassSurface className={styles.surface}>
      <div className={styles.group} role="group" aria-label="Keep sheet">
        {OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={styles.option}
            aria-pressed={style === value}
            onClick={() => {
              setKeepStyle(value)
              setStyle(value)
            }}
          >
            <span className={styles.optionLabel}>{label}</span>
          </button>
        ))}
      </div>
    </GlassSurface>
  )
}
