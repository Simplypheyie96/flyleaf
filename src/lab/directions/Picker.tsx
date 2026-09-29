/* The picker, wired the framework's way and styled by picker.css, which is the
   skill's spec verbatim. The one permitted modification is in use here:
   `data-position="top"`, because Flyleaf's own floating tab bar occupies the
   bottom centre of every screen and the picker must never sit on top of the
   work it is showing. */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import './picker.css'

interface PickerProps {
  names: string[]
  at: number
  onPick: (index: number) => void
  onReplay: () => void
}

export default function Picker({ names, at, onPick, onReplay }: PickerProps) {
  const items = useRef<(HTMLButtonElement | null)[]>([])
  const [box, setBox] = useState({ left: 0, width: 0 })
  const [ready, setReady] = useState(false)

  /* Measured rather than guessed: the buttons are text-width, so the highlight
     cannot be derived from an index. Layout effect so the first paint already
     has it in the right place — with `data-ready` still off, that placement
     does not animate. */
  useLayoutEffect(() => {
    const el = items.current[at]
    if (el) setBox({ left: el.offsetLeft, width: el.offsetWidth })
  }, [at, names])

  useEffect(() => {
    const measure = () => {
      const el = items.current[at]
      if (el) setBox({ left: el.offsetLeft, width: el.offsetWidth })
    }
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [at])

  useEffect(() => {
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setReady(true))
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [])

  return (
    <nav
      className="proto-picker"
      aria-label="Prototype variants"
      data-position="top"
      {...(ready ? { 'data-ready': '' } : {})}
    >
      <span
        className="proto-picker-highlight"
        aria-hidden="true"
        style={{ width: box.width, transform: `translateX(${box.left}px)` }}
      />
      {names.map((name, i) => (
        <button
          key={name}
          type="button"
          ref={(el) => {
            items.current[i] = el
          }}
          className="proto-picker-item"
          onClick={() => onPick(i)}
          {...(i === at ? { 'data-active': '', 'aria-current': 'true' as const } : {})}
        >
          {name}
        </button>
      ))}
      <span className="proto-picker-divider" aria-hidden="true" />
      <button
        type="button"
        className="proto-picker-item proto-picker-replay"
        onClick={onReplay}
        aria-label="Replay animation (R)"
      >
        ↻
      </button>
    </nav>
  )
}
