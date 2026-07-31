/* The drum: a snap-scrolling column, and the frame that holds a row of them.

   Lives on its own because two controls turn it. The full three-wheel picker
   is day/month/year, and the calendar's month label flips to a two-wheel
   month/year pane — the same component either way, so the two never drift into
   feeling like different mechanisms inside one app.

   It is native scrolling with `scroll-snap-type`, not a gesture handler. That
   is what buys momentum, rubber-banding and the platform's own fling curve for
   free, and those three are most of why a wheel feels like a wheel. */

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import styles from './Wheel.module.css'

/** Row height in px. Mirrored in the stylesheet as `--row`: the scroll maths
    needs a number and CSS needs a length, and there is no way to keep one
    without stating the other. */
export const ROW = 40

interface DrumProps {
  children: ReactNode
  /** Rows on screen. Must be odd, or no row sits in the middle. */
  rows?: number
}

/** The frame — the band across the middle, and the columns under it. */
export function Drum({ children, rows = 5 }: DrumProps) {
  return (
    <div className={styles.wrap} style={{ '--visible': rows } as CSSProperties}>
      {/* Drawn once behind every column, so it reads as one band across the
          whole drum rather than a highlight per wheel. */}
      <div className={styles.band} aria-hidden="true">
        <Stitch />
        <Stitch />
      </div>
      {children}
    </div>
  )
}

interface ColumnProps<T> {
  label: string
  items: T[]
  render: (item: T) => string
  value: T
  onPick: (item: T) => void
  /** For the column carrying month names, which are far longer than digits. */
  wide?: boolean
}

export function Column<T>({ label, items, render, value, onPick, wide }: ColumnProps<T>) {
  const track = useRef<HTMLDivElement>(null)
  const settle = useRef<number>(0)
  /* Set while we are the ones moving the track, so the scroll handler does not
     read its own animation back and fire a change per frame. */
  const driving = useRef(false)
  const index = items.indexOf(value)
  const [live, setLive] = useState(index)

  /* Follow the value when it changes from outside — another wheel clamping the
     day, the calendar paging, the form resetting. Jumps rather than animates:
     the column being touched is already where it needs to be, and animating
     one the reader is not looking at is only a delay. */
  useEffect(() => {
    const el = track.current
    if (!el || index < 0) return
    const to = index * ROW
    if (Math.abs(el.scrollTop - to) < 2) return
    driving.current = true
    el.scrollTo({ top: to, behavior: 'auto' })
    setLive(index)
    // One frame is not enough; the scroll event lands a frame or two later.
    window.setTimeout(() => {
      driving.current = false
    }, 60)
  }, [index])

  useEffect(() => () => window.clearTimeout(settle.current), [])

  function onScroll() {
    const el = track.current
    if (!el) return
    const at = Math.round(el.scrollTop / ROW)
    if (at !== live) setLive(at)
    if (driving.current) return

    /* Snapping fires no event of its own, so the landing is found by waiting
       for the scrolling to stop. 110ms sits out the snap animation and still
       feels committed on release. */
    window.clearTimeout(settle.current)
    settle.current = window.setTimeout(() => {
      const landed = items[Math.max(0, Math.min(items.length - 1, at))]
      if (landed !== undefined && landed !== value) onPick(landed)
    }, 110)
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const by = { ArrowUp: -1, ArrowDown: 1, Home: -index, End: items.length - 1 - index }[
      event.key
    ]
    if (by === undefined) return
    event.preventDefault()
    const next = items[index + by]
    if (next !== undefined) onPick(next)
  }

  return (
    <div className={`${styles.column} ${wide ? styles.wide : ''}`}>
      <div
        ref={track}
        className={styles.track}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        role="listbox"
        aria-label={label}
        tabIndex={0}
      >
        {/* Half a drum of clear air at each end, so the first and last rows can
            reach the middle. Padding rather than spacer rows, which a screen
            reader would announce as empty options. */}
        <div className={styles.pad} aria-hidden="true" />
        {items.map((item, i) => (
          <div
            key={i}
            className={styles.row}
            role="option"
            aria-selected={i === index}
            /* How far this row sits from the band, for the stylesheet to fade
               and shrink it by — the curvature of a real drum. */
            data-off={Math.min(3, Math.abs(i - live))}
            onClick={() => onPick(item)}
          >
            {render(item)}
          </div>
        ))}
        <div className={styles.pad} aria-hidden="true" />
      </div>
    </div>
  )
}

/** One row of running stitch, in whichever floss the parent is carrying. */
function Stitch() {
  return (
    <svg className={styles.stitch} height="3" aria-hidden="true" focusable="false">
      <line
        x1="0"
        y1="1.5"
        x2="100%"
        y2="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        strokeLinecap="round"
      />
    </svg>
  )
}
