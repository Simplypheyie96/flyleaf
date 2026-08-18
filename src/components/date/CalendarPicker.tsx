/* A — the stitched calendar, with the drum folded into its header.

   A month at a time, and the day you choose gets this book's own bloom
   stitched behind the numeral. Today is marked with a single knot under its
   number, which is a quieter signal than a ring and does not compete with the
   selection. Anything after `max` is dimmed and unclickable: nobody starts a
   book next Tuesday.

   The month label is a button. Tap it and the day grid gives way to a two-wheel
   drum for month and year; tap it again and the calendar comes back on
   whatever month you left it on. That is the whole answer to picking a year:
   arrows alone would be eighty taps to reach 2019, and a year control parked
   permanently beside the arrows would be a second mechanism on screen at all
   times for something used once in a hundred entries. Two panes, one at a
   time, one control.

   The drum is the same component the standalone wheel picker turns — see
   Wheel.tsx — so the two never drift into feeling like different mechanisms.

   Keyboard behaviour is the part that is easy to get wrong and impossible to
   retrofit. Only one cell is tabbable at a time (a roving tabindex), so Tab
   moves past the whole grid in one press rather than through forty-two
   buttons; the arrows move within it, and crossing an edge turns the month.
   That is the standard grid pattern and it is what a screen reader expects.

   TAPPING A DAY NO LONGER COMMITS IT. A day sets the draft — the bloom moves
   there and the foot writes the date out in full — and the check at the foot
   is what hands it back. Two taps instead of one, and the second is the
   reason: a single tap on a 44px cell in a seven-column grid puts the 5th and
   the 12th a thumb's width apart, and the old behaviour spent that misfire
   immediately, closing the sheet on a date nobody chose. The only way to find
   out was to reopen the field and read it. Now the wrong day is visibly the
   wrong day while there is still a chance to fix it, and the foot says which
   day in words rather than as a numeral in a grid — "Sat 14 February 2026"
   cannot be misread the way a 14 sitting under a column head can.

   The check is never disabled, including when the draft is the date already
   stored. Confirming an unchanged date is a real answer — it is the whole of
   what "still reading, and yes, that is when I started" amounts to — and a
   greyed control there would strand a reader who opened the sheet only to
   agree with it. */

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  addDays,
  addMonths,
  dayLabel,
  daysInMonth,
  fromISO,
  leadingBlanks,
  longDate,
  monthYear,
  sameDay,
  toISO,
  weekdayHeads,
} from './dates'
import Bloom from './Bloom'
import { CaretIcon, CheckIcon, ChevronIcon } from '../TabIcons'
import { Column, Drum } from './Wheel'
import styles from './CalendarPicker.module.css'

/** How far back the year wheel runs. Far enough for a book somebody started in
    their twenties and is only now logging. */
const SPAN = 60

/** Rows on the drum. Five lands within a few pixels of a five-row month, which
    is what most of them are; a six-row month is 40px taller and the swap gives
    that back. Nothing matches both, because the grid itself changes height
    between a February that fits in four rows and a March that needs six. */
const DRUM_ROWS = 5

interface Props {
  /** The chosen day, `YYYY-MM-DD`. */
  value: string
  onChange: (iso: string) => void
  /** The last selectable day, inclusive. */
  max: string
  /** The book's own seed — what decides which two threads the bloom is in. */
  seed: number
}

function CalendarPicker({ value, onChange, max, seed }: Props) {
  /* The day the grid is showing as chosen, which until the check is pressed is
     only a proposal. It starts as the stored date so the calendar opens on the
     answer it already has, and re-seeds whenever that answer changes from
     outside — a reader who closes the sheet on a half-made choice and opens it
     again should find the stored date, not the abandoned one. */
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])

  const selected = fromISO(draft)
  const ceiling = fromISO(max)
  const today = new Date()

  /* Which month is on screen, which is not the same thing as which day is
     chosen: you can page through October without picking anything in it. It
     starts on the chosen day's month and follows the selection whenever that
     changes from outside. */
  const [page, setPage] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1))
  useEffect(() => {
    setPage(new Date(selected.getFullYear(), selected.getMonth(), 1))
    // Keyed on the string, not the Date: a fresh Date object every render would
    // reset the page on every keystroke elsewhere in the form.
  }, [value])

  /* Which cell Tab lands on. Held separately from the selection so the arrows
     can walk the grid before committing to anything. */
  const [cursor, setCursor] = useState(value)
  useEffect(() => setCursor(value), [value])

  const grid = useRef<HTMLDivElement>(null)
  const moved = useRef(false)
  useEffect(() => {
    // Only chase focus after a key actually moved the cursor. Doing it on every
    // render would steal focus from whatever else on the page is being used.
    if (!moved.current) return
    moved.current = false
    grid.current?.querySelector<HTMLButtonElement>('[data-cursor="true"]')?.focus()
  }, [cursor])

  /* Which pane is up. Never both: the drum is for finding a month, the grid is
     for choosing a day, and showing them together would be two ways to move
     the same value sitting next to each other. */
  const [jumping, setJumping] = useState(false)

  const year = page.getFullYear()
  const month = page.getMonth()
  const blanks = leadingBlanks(year, month)
  const total = daysInMonth(year, month)

  // A month can start late enough in the week to need six rows. Padding to a
  // whole number of rows keeps the grid from changing height as you page,
  // which otherwise makes everything below it jump.
  const cells = Math.ceil((blanks + total) / 7) * 7

  const beyond = (d: Date) => d > ceiling
  const prevOk = true
  const nextOk = new Date(year, month + 1, 1) <= ceiling

  function turn(by: number) {
    const to = addMonths(page, by)
    if (by > 0 && new Date(to.getFullYear(), to.getMonth(), 1) > ceiling) return
    setPage(new Date(to.getFullYear(), to.getMonth(), 1))
  }

  /* ---- The drum pane ---- */

  const capYear = ceiling.getFullYear()
  const years = Array.from({ length: SPAN }, (_, i) => capYear - SPAN + 1 + i)
  // The month wheel stops at the current month in the current year, and runs
  // its full length in every year before it.
  const lastMonth = year === capYear ? ceiling.getMonth() : 11
  const monthsOf = Array.from({ length: lastMonth + 1 }, (_, i) => i)
  const monthName = new Intl.DateTimeFormat(undefined, { month: 'long' })

  /** Move the page, not the selection: the drum finds a month, the grid picks
      the day in it. Clamped because scrolling the year up to this one can leave
      the month wheel sitting past today. */
  function goTo(y: number, m: number) {
    const capped = y === capYear ? Math.min(m, ceiling.getMonth()) : m
    setPage(new Date(y, capped, 1))
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key]
    const jump = { PageUp: -1, PageDown: 1 }[event.key]
    if (step === undefined && jump === undefined) return
    event.preventDefault()

    const from = fromISO(cursor)
    const to = jump === undefined ? addDays(from, step!) : addMonths(from, jump)
    if (beyond(to)) return

    moved.current = true
    setCursor(toISO(to))
    setPage(new Date(to.getFullYear(), to.getMonth(), 1))
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <button
          type="button"
          className={styles.turn}
          onClick={() => turn(-1)}
          disabled={!prevOk}
          aria-label="Previous month"
        >
          <ChevronIcon size={20} dir="left" />
        </button>
        {/* The label doubles as the way into the drum. Announced politely so
            paging is audible without interrupting whatever a screen reader is
            in the middle of saying. */}
        <button
          type="button"
          className={styles.month}
          onClick={() => setJumping((on) => !on)}
          aria-expanded={jumping}
          aria-label={`${monthYear(page)} — choose month and year`}
        >
          <span aria-live="polite">{monthYear(page)}</span>
          <CaretIcon size={14} className={styles.caret} />
        </button>
        <button
          type="button"
          className={styles.turn}
          onClick={() => turn(1)}
          disabled={!nextOk}
          aria-label="Next month"
        >
          <ChevronIcon size={20} dir="right" />
        </button>
      </div>

      {/* Gone with the grid, not merely hidden. Held in place it left a band of
          empty rule above the drum, which is a worse thing to look at than the
          thirty pixels of height the card gives back on the swap. */}
      {!jumping && (
        <div className={styles.heads} aria-hidden="true">
          {weekdayHeads('narrow').map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
      )}

      {jumping ? (
        <Drum rows={DRUM_ROWS}>
          <Column
            label="Month"
            items={monthsOf}
            render={(m) => monthName.format(new Date(2024, m, 1))}
            value={Math.min(month, lastMonth)}
            onPick={(m) => goTo(year, m)}
            wide
          />
          <Column
            label="Year"
            items={years}
            render={(y) => `${y}`}
            value={year}
            onPick={(y) => goTo(y, month)}
          />
        </Drum>
      ) : (
        /* One tab stop for the whole grid; the arrows do the rest. */
        <div ref={grid} className={styles.grid} onKeyDown={onKeyDown} role="group">
          {Array.from({ length: cells }, (_, i) => {
            const n = i - blanks + 1
            if (n < 1 || n > total) return <span key={i} className={styles.blank} />

            const d = new Date(year, month, n)
            const iso = toISO(d)
            const isSelected = sameDay(d, selected)
            const isToday = sameDay(d, today)
            const off = beyond(d)

            return (
              <button
                key={i}
                type="button"
                className={styles.day}
                data-selected={isSelected || undefined}
                data-today={isToday || undefined}
                data-cursor={iso === cursor || undefined}
                tabIndex={iso === cursor ? 0 : -1}
                disabled={off}
                aria-pressed={isSelected}
                aria-label={dayLabel(d)}
                /* Proposes, does not commit. The cursor comes along so the
                   arrows carry on from the day just tapped rather than from
                   wherever Tab last left them. */
                onClick={() => {
                  setDraft(iso)
                  setCursor(iso)
                }}
              >
                {isSelected && <Bloom seed={seed} className={styles.bloom} />}
                <span className={styles.numeral}>{n}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* The closing line of the frame, and it stays put across both panes —
          the drum changes which month you are looking at, never which day is
          proposed, so a foot that vanished under it would read as the proposal
          being lost. The date is written out because that is the check being
          offered: not "a cell is highlighted somewhere above" but this day, in
          words, with its weekday. */}
      <div className={styles.foot}>
        <span className={styles.pending}>{longDate(draft)}</span>
        <button
          type="button"
          className={styles.confirm}
          onClick={() => onChange(draft)}
          aria-label={`Use ${longDate(draft)}`}
        >
          <CheckIcon size={18} />
        </button>
      </div>
    </div>
  )
}

export default CalendarPicker
