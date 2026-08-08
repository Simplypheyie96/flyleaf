/* THE CLOCK, under the room.

   The owner's ask: "readers can turn on ambience and also turn on timer for
   reading." So it lives here rather than on the book page — this is the one
   place in the app you go to *before* you read rather than after, and putting
   the clock anywhere else would mean going and finding it.

   IT IS ALWAYS ABOUT A REAL BOOK. There is no free-standing stopwatch: the
   sitting is stored against the book, so a clock with no book attached would
   have nowhere to put the minutes. When the shelf has nothing unfinished on
   it, the block says so and points at the Library instead of offering a button
   that could only throw its own result away. (This is the same logic hole the
   owner caught on the first-run card — a line with no book to hang on.)

   IT IS NOT TIED TO THE LAMP. The two sit together and share a section, but a
   reader who wants the clock without the rain, or the rain without the clock,
   gets it. Coupling them would mean an unlit room could not be timed, which is
   a rule invented by the drawing rather than by reading. */

import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import TimerLog from './TimerLog'
import { type Book } from '../../../data/db'
import {
  SHORTEST,
  countedSittings,
  inWords,
  onTheClock,
  startSitting,
  stopSitting,
  useReadingTime,
  useRunning,
  useSittings,
} from '../../../data/sittings'
import s from './timer.module.css'

export default function Timer({ book }: { book?: Book }) {
  const { running, seconds } = useRunning()
  const sittings = useSittings(book?.id)
  const total = useReadingTime(book?.id)
  const [logOpen, setLogOpen] = useState(false)
  /* What just happened, said once. `null` the rest of the time so the block
     does not carry a stale sentence about a sitting from an hour ago. */
  const [kept, setKept] = useState<string | null>(null)

  const on = running !== null && running.bookId === book?.id

  /* Clears itself. A confirmation that stays becomes part of the furniture and
     stops being read, and this one sits directly above the button that would
     produce the next one. */
  useEffect(() => {
    if (!kept) return
    const id = window.setTimeout(() => setKept(null), 6000)
    return () => window.clearTimeout(id)
  }, [kept])

  async function toggle() {
    if (!book) return
    if (on) {
      const secs = await stopSitting()
      setKept(
        secs === 0
          ? `Under a minute — nothing kept. The clock keeps sittings from ${SHORTEST / 60} minute up.`
          : `${inWords(secs)} with ${book.title}. Kept.`,
      )
      return
    }
    setKept(null)
    await startSitting(book.id)
  }

  if (!book) {
    return (
      <div className={s.clock} data-empty="">
        <p className={s.idle}>
          The clock keeps time against a book, so it needs one open.{' '}
          <Link className={s.link} to="/library">
            Start something on your shelf
          </Link>{' '}
          and it will be waiting here.
        </p>
      </div>
    )
  }

  return (
    <div className={s.clock} data-on={on || undefined}>
      {/* THE BOOKMARK. The one drawing on this card, and the right one: a
          clock for reading is a bookmark for time. It hangs over the card's
          top edge the way a ribbon hangs out of a closed book, carries the
          same stitched dashes as every cover on the shelf, and takes the
          lamp's honey while the clock runs — the card's fourth telling of
          the state, and the only one that is a picture. */}
      <svg
        className={s.ribbon}
        width="16"
        height="46"
        viewBox="0 0 16 46"
        aria-hidden="true"
      >
        <path d="M1 0 H15 V45 L8 37 L1 45 Z" fill="currentColor" />
        <path
          d="M8 5 V33"
          fill="none"
          stroke="var(--color-paper)"
          strokeWidth="1.2"
          strokeDasharray="2.5 3.5"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>
      <div className={s.face}>
        <p className={s.what}>
          <span className={s.eyebrow}>{on ? 'Reading now' : 'Keep time'}</span>
          <span className={s.book}>{book.title}</span>
        </p>
        {/* The digits carry the state on their own — they are the only thing
            on this block that moves. `role="timer"` with a polite live region
            would announce every single second, so the running value is hidden
            from assistive tech and the summary below speaks instead. */}
        <p className={s.digits} aria-hidden="true">
          {onTheClock(on ? seconds : 0)}
        </p>
      </div>

      {/* Deliberately NOT the app's ink pill. Every other one of those finishes
          a form the reader opened on purpose; this sits under a picture of a
          quiet room, and a slab of near-black there out-shouts the room. It
          wears the sound chips' chrome instead — see `.go`. */}
      <button type="button" className={s.go} onClick={() => void toggle()} aria-pressed={on}>
        {on ? 'Stop the clock' : 'Start the clock'}
      </button>

      {/* One line, and it is the only thing here a screen reader hears change:
          what has been kept for this book so far, plus the last result. Once
          there is a record, the line is also the way TO the record — the log
          sheet, with every sitting on every book. A modal, at the owner's
          call: the journal pages stay about the reading, and the ledger keeps
          to itself until it is asked for. */}
      <p className={s.tally} role="status">
        {kept ??
          (total && sittings?.length
            ? `${inWords(total)} so far, over ${countedSittings(sittings.length)}.`
            : 'Nothing timed yet. Start it when you sit down.')}
      </p>

      {/* The way to the record: a stitched seam across the card's foot — the
          dashes every cover on the shelf wears — with a small ledger glyph
          and a chevron that steps aside as you press. A plain grey rule sat
          here for one round and the owner asked for prettier; the stitching
          is the app's own thread, so pretty and native are the same move. */}
      {total && sittings?.length ? (
        <button type="button" className={s.log} onClick={() => setLogOpen(true)}>
          <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 4.5 H 18 A 1.5 1.5 0 0 1 19.5 6 V 18 A 1.5 1.5 0 0 1 18 19.5 H 6 A 1.5 1.5 0 0 1 4.5 18 V 6 A 1.5 1.5 0 0 1 6 4.5 Z" />
              <path d="M8.5 9 H 15.5" />
              <path d="M8.5 12.5 H 13.5" />
              <path d="M8.5 16 H 11.5" />
            </g>
          </svg>
          See the log
          <span className={s.logHint} aria-hidden="true">
            ›
          </span>
        </button>
      ) : null}

      <TimerLog open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  )
}
