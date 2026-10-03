/* THE DRAWER — Home's quiet facts, one sheet cut into tiles.

   One sheet cut into three rooms, the way a phone's widget stack shows a
   word, a streak and a shelf at a glance: the word you caught across the
   top, the chair folded to one line under it, and the closed shelf across
   the full width at the foot — four boards face out, each one a door to its
   journey. The shelf once sat beside the chair at half width with 30px
   boards; it was too small to read, so the chair gave up its height. Two rounds of
   tab strips over one panel were one layout in three costumes, and a tab
   hides two of the three things it exists to show. Nothing here is behind a
   switcher, so there is no switcher.

   The sheet is the same height at three words and at three hundred. The
   word tile deals ONE word at a time, marked on a story bar that never holds
   more than three segments — the set that word belongs to. The lit segment
   fills while you read and deals the next word when it is full.

   Touch first, because this is a phone: tap the word to go on, its left
   third to go back, press and hold to make it wait — the three things a
   thumb already knows from a story. Nothing pauses on hover; on iOS a tap
   leaves a hover behind that never ends, and the clock would stop for good
   after the first tap.

   Promoted from the direction lab. A TILE WITH NOTHING TO SAY IS NOT DRAWN:
   no words caught, no word tile; no minutes this week, no chair; nothing
   finished, no closed shelf. A drawer with no tiles at all is not rendered — Home checks that with
   `drawerHas` before it rules a ❧ above it. */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BookCover from '../../components/BookCover'
import PaperSurface from '../../components/PaperSurface'
import { KIND } from '../../journey/kinds'
import { coversOf } from '../../books/covers'
import { inWords } from '../../data/sittings'
import type { Book, Entry, Sitting } from '../../data/db'
import d from './Drawer.module.css'

/** One word at a time, dealt in threes. `set` is the slots of the three the
    current word belongs to (fewer at the tail), so the bar never shows more
    than three marks. The clock restarts on every move and stops while held. */
function useDeal(words: Entry[], size = 3, every = 6000) {
  const [at, setAt] = useState(0)
  const [held, setHeld] = useState(false)
  const n = words.length

  useEffect(() => {
    if (held || n <= 1) return
    const id = window.setTimeout(() => setAt((a) => (a + 1) % n), every)
    return () => window.clearTimeout(id)
  }, [held, at, n, every])

  const here = n ? at % n : 0
  const base = Math.floor(here / size) * size
  const set = Array.from({ length: Math.min(size, n - base) }, (_, i) => base + i)
  const wrap = (a: number) => (a + Math.max(n, 1)) % Math.max(n, 1)

  return {
    open: words[here],
    at: here,
    set,
    go: setAt,
    next: () => setAt((a) => wrap(a + 1)),
    prev: () => setAt((a) => wrap(a - 1)),
    held,
    hold: setHeld,
  }
}

/** PRESS AND HOLD, not hover. The clock waits while a finger is down and
    starts again when it lifts, is cancelled by a scroll, or slides off.
    Keyboard focus holds it too, but only visible focus: Android focuses a
    button on tap, and that would be the hover bug again. */
function pressToHold(hold: (on: boolean) => void) {
  const off = () => hold(false)
  return {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      event.currentTarget.dataset.down = String(event.timeStamp)
      hold(true)
    },
    /* Letting go after a hold is not a tap — holding a word to finish
       reading it must not deal the next one the moment the thumb lifts. The
       press time lives on the element, not in a closure, because the hold
       itself re-renders between the press and the click. */
    onClickCapture: (event: React.MouseEvent<HTMLElement>) => {
      const down = Number(event.currentTarget.dataset.down)
      if (event.detail && down && event.timeStamp - down > 350) {
        event.preventDefault()
        event.stopPropagation()
      }
    },
    onPointerUp: off,
    onPointerCancel: off,
    onPointerLeave: off,
    onFocusCapture: (event: React.FocusEvent) => {
      if ((event.target as HTMLElement).matches(':focus-visible')) hold(true)
    },
    onBlurCapture: off,
  }
}

function WordTile({ words }: { words: Entry[] }) {
  const { open, at, set, go, next, prev, held, hold } = useDeal(words)
  if (!open) return null

  return (
    <section
      className={d.word}
      aria-label="A word you caught"
      style={{ '--kind': `var(${KIND.vocabulary.hue})` } as React.CSSProperties}
      {...pressToHold(hold)}
    >
      <header className={d.head}>
        <h3 className={d.label}>A word you caught</h3>
        {words.length > 1 ? (
          <div className={d.story} role="group" aria-label="Words in this set">
            {set.map((idx) => (
              <button
                key={idx}
                type="button"
                className={d.seg}
                data-state={idx < at ? 'done' : idx === at ? 'now' : 'next'}
                aria-label={words[idx].name}
                aria-current={idx === at || undefined}
                onClick={() => go(idx)}
              >
                <span
                  /* Keyed on the word and the hold, so the fill restarts
                     exactly when the clock does. */
                  key={`${at}-${held}`}
                  className={d.segFill}
                  data-held={held || undefined}
                />
              </button>
            ))}
          </div>
        ) : null}
      </header>

      <button
        key={open.id}
        type="button"
        className={d.deal}
        onClick={(event) => {
          /* A story's two tap zones: the left third goes back, the rest goes
             on. `detail` is 0 for Enter/Space, which always goes on. */
          const box = event.currentTarget.getBoundingClientRect()
          if (event.detail && event.clientX - box.left < box.width / 3) prev()
          else next()
        }}
        disabled={words.length < 2}
        aria-live="polite"
      >
        <span className={d.headword}>
          {open.name}
          {open.phonetic ? <span className={d.say}>{open.phonetic}</span> : null}
        </span>
        <span className={d.sense}>{open.text}</span>
      </button>
    </section>
  )
}

/** The local calendar day of an epoch-ms moment, as ISO yyyy-mm-dd — the same
    day `Sitting.keptOn` is written in. */
function dayOf(at: number) {
  const date = new Date(at)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** The last seven local days, oldest first, with the seconds read on each. */
export function weekOf(sittings: Sitting[], now = Date.now()) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now)
    date.setDate(date.getDate() - (6 - i))
    return { iso: dayOf(date.getTime()), seconds: 0 }
  })
  const byIso = new Map(days.map((day) => [day.iso, day]))
  for (const sitting of sittings) {
    const day = byIso.get(sitting.keptOn)
    if (day) day.seconds += sitting.seconds
  }
  return days
}

type Week = ReturnType<typeof weekOf>

/** The chair, folded to one line: label, the week's total, the week. */
function ChairLine({ week }: { week: Week }) {
  const most = Math.max(...week.map((day) => day.seconds))
  const total = week.reduce((sum, day) => sum + day.seconds, 0)
  return (
    <section className={d.line} aria-label="Time in the chair">
      <h3 className={d.label}>In the chair</h3>
      <p className={d.figure}>
        <span className={d.num}>{inWords(total)}</span>
        <span className={d.cap}>this week</span>
      </p>
      <ul className={d.spark} aria-hidden="true">
        {week.map((day) => (
          <li key={day.iso} className={d.sparkDay}>
            <span
              className={d.sparkFill}
              data-empty={!day.seconds || undefined}
              style={{ blockSize: day.seconds ? `${Math.max((day.seconds / most) * 100, 12)}%` : undefined }}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

const closedOn = (iso?: string) =>
  iso ? new Date(`${iso}T00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''

/** The last four boards face out, each dated and each a door to its
    journey. Titles live in the aria-label: four names at 64px wide would be
    four ellipses. */
function ShelfTile({ closed }: { closed: Book[] }) {
  const year = String(new Date().getFullYear())
  const thisYear = closed.filter((book) => book.finishedOn?.startsWith(year)).length
  return (
    <section className={d.shelf} aria-label="Closed lately">
      <header className={d.shelfHead}>
        <h3 className={d.label}>Closed lately</h3>
        <span className={d.cap}>{thisYear ? `${thisYear} this year` : `${closed.length} closed`}</span>
      </header>
      <div className={d.boards}>
        {closed.slice(0, 4).map((book) => (
          <Link
            key={book.id}
            to={`/book/${book.id}`}
            className={d.board}
            aria-label={`${book.title} by ${book.author}, closed ${closedOn(book.finishedOn)}`}
          >
            <BookCover title={book.title} author={book.author} covers={coversOf(book)} />
            <span className={d.boardWhen}>{closedOn(book.finishedOn)}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

interface Props {
  words: Entry[]
  week: Week
  /** Every finished book, newest first. */
  closed: Book[]
}

/** Whether the drawer has a single tile to show. */
export function drawerHas({ words, week, closed }: Props) {
  return words.length > 0 || week.some((day) => day.seconds > 0) || closed.length > 0
}

export default function Drawer({ words, week, closed }: Props) {
  return (
    <PaperSurface className={d.sheet}>
      {words.length ? <WordTile words={words} /> : null}
      {week.some((day) => day.seconds > 0) ? <ChairLine week={week} /> : null}
      {closed.length ? <ShelfTile closed={closed} /> : null}
    </PaperSurface>
  )
}
