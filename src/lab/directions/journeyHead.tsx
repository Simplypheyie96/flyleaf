/* JOURNEY · THE HEAD — round three.

   Everything else about the journey stayed. The four alternative threads that
   went up last round were all rejected against the one that ships: the knots
   on the rail, the cards hanging off them, the kinds carrying their own hue.
   Two things came out of that round and only two:

     1. the tie — a short line running from a knot out to the card it belongs
        to, which is the one piece of the Weave worth keeping. It is drawn on
        every row here, in the keep's own hue, so it can be judged in place
        rather than in the abstract.
     2. the head is the part worth re-laying-out. What follows is three
        answers to that, and nothing below the head changes between them.

   Production's `BookJourney.module.css` is imported read-only, so the thread
   under each head is the real thread at the real measurements and the heads
   that reuse its furniture reuse the actual rules rather than copies of them.

   The load-bearing constraints from that file, which every head here honours:
   the head's tail lives INSIDE its own box (a gap would separate the moment
   the rail parks from the moment the pinned bar takes the title); the 2:3
   floor belongs to the cover's board and not to the record beside it; one
   16px rhythm with exactly one 8px join; no backdrop-filter on anything in
   the head, because there is nothing behind it but sky. */

import { useState } from 'react'
import BookCover from '../../components/BookCover'
import FormatRow from '../../components/FormatRow'
import Sparkle from '../../components/Sparkle'
import type { BookFormat, Entry } from '../../data/db'
import { cardFor } from '../../journey/cards'
import { KIND } from '../../journey/kinds'
import { BOOK, SHORT, furthest } from './stub'
import j from '../../routes/BookJourney.module.css'
import s from './journeyHead.module.css'

const OPENED = SHORT(BOOK.startedOn!)

/** The reading's own two facts, said the same way under all three heads so a
    difference between them is never a difference in wording.

    Day one has neither: nothing has been kept, and with nothing kept there is
    no furthest page — "0 kept · last seen on p. 0" states a page the reader
    has never been on. The empty case gets its own sentence instead. */
function tally(stream: Entry[], { of }: { of?: number } = {}) {
  const far = furthest(stream)
  if (!stream.length) return 'nothing kept out of it yet'
  if (!far) return `${stream.length} kept`
  return of ? `${stream.length} kept · p. ${far} of ${of}` : `${stream.length} kept · last seen on p. ${far}`
}

/** The one control in the head that has state. Held here rather than in each
    head so the chips are live in all three — a format row that cannot be
    toggled is judged as a graphic. */
function useFormats() {
  return useState<BookFormat[]>(['physical', 'audio'])
}

/* ── The thread under every head ──────────────────────────────────────────

   Production's own markup and classes, minus the action row each keep carries
   in the app: the row is a different module and its only effect here would be
   to push the keeps apart. `--acts-hang` is zeroed on the column for the same
   reason, so the visible gap between keeps is the declared one.

   The tie is the single addition, and it is a class of ours on production's
   `.hang` rather than a change to it. */
function Thread({ stream }: { stream: Entry[] }) {
  /* Day one. Production has its own empty state for this and it is not what is
     being compared here, so the lab shows the head over nothing rather than
     over a rail with no knots on it. */
  if (!stream.length) return null

  return (
    <ol className={j.thread}>
      {stream.slice(0, 4).map((keep) => {
        const { Icon, hue } = KIND[keep.type]
        const Card = cardFor(keep.type)

        return (
          <li
            key={keep.id}
            className={j.notch}
            style={{ '--kind': `var(${hue})` } as React.CSSProperties}
          >
            <span className={j.gutter} aria-hidden="true">
              <span className={j.knot}>
                <Icon size={13} />
              </span>
            </span>
            <div className={`${j.hang} ${s.tied}`}>
              <p className={j.when}>
                <span className={j.whenDay}>
                  {SHORT(keep.keptOn)}
                  {keep.chapter?.trim() ? ` · ${keep.chapter.trim()}` : ''}
                  {keep.page !== undefined ? ` · p. ${keep.page}` : ''}
                </span>
              </p>
              <Card keep={keep} />
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** The dates control, identical in all three heads — it is the same object in
    the same material wherever it lands, and only its position is in question. */
function Dates({ className }: { className?: string }) {
  return (
    <div className={className ? `${j.span} ${className}` : j.span}>
      <button type="button" className={j.spanEnd}>
        <span className={j.spanText}>{OPENED}</span>
      </button>
      <button type="button" className={j.spanEnd} data-unset="">
        <span className={j.spanArrow} aria-hidden="true">
          →
        </span>
        <span className={j.spanText}>still reading</span>
      </button>
    </div>
  )
}

/* ── 1 · RECORD ───────────────────────────────────────────────────────────
   What ships. A 110px board on the leading edge and a column beside it that
   stacks four things: the name, the byline, the tally, then two rows of
   controls. Here so the two below are judged against it rather than against
   a memory of it. */
function Record({ stream }: { stream: Entry[] }) {
  const [formats, setFormats] = useFormats()

  return (
    <div className={j.headBlock}>
      <div className={j.headTop}>
        <span className={j.coverMount}>
          <BookCover
            title={BOOK.title}
            author={BOOK.author}
            size="small"
            className={j.cover}
          />
        </span>
        <div className={j.about}>
          <div className={j.identity}>
            <h1 className={j.title} title={BOOK.title}>
              {BOOK.title}
            </h1>
            <p className={j.author}>{BOOK.author}</p>
            <p className={j.tally}>{tally(stream)}</p>
          </div>
          <FormatRow small value={formats} onChange={setFormats} />
          <Dates />
        </div>
        <Sparkle size={15} className={j.headSpark} />
      </div>
    </div>
  )
}

/* ── 2 · LEDGER ───────────────────────────────────────────────────────────
   The head has two jobs and currently does them in one column: it says which
   book this is, and it holds the facts and controls that are true of the
   whole journey. Here they are two bands.

   The top band is the book and nothing else — a smaller board and a name that
   has forty more pixels to run in, which is the difference between a title
   clamping at two lines and not. The bottom band is one strip: formats, the
   dates, the tally, on a single baseline behind a hairline, wrapping to two
   rows only on a phone. Three stacked control rows become one. */
function Ledger({ stream }: { stream: Entry[] }) {
  const [formats, setFormats] = useFormats()

  return (
    <div className={`${j.headBlock} ${s.ledger}`}>
      <div className={s.ledgerTop}>
        <span className={s.thumb}>
          <BookCover title={BOOK.title} author={BOOK.author} width={72} rotate={-1.5} />
        </span>
        <div className={s.ledgerName}>
          <h1 className={j.title} title={BOOK.title}>
            {BOOK.title}
          </h1>
          <p className={j.author}>{BOOK.author}</p>
        </div>
        <Sparkle size={15} className={s.ledgerSpark} />
      </div>

      <div className={s.strip}>
        <FormatRow small value={formats} onChange={setFormats} />
        <Dates />
        <p className={s.stripFact}>{tally(stream, { of: BOOK.pages })}</p>
      </div>
    </div>
  )
}

/* ── 3 · PLATE ────────────────────────────────────────────────────────────
   The same object Home puts the book on, which is the argument for it: a
   reader who taps through from Home should find the book where they left it
   rather than reassembled sideways. Cover centred, name under it, a short
   rule, one facts line, and the two controls as a single centred row.

   It costs height — this is the tallest of the three, and height in a head is
   height the thread does not get. What it buys is a cover with actual
   presence and a head with one alignment edge instead of two. */
function Plate({ stream }: { stream: Entry[] }) {
  const [formats, setFormats] = useFormats()

  return (
    <div className={`${j.headBlock} ${s.plate}`}>
      <span className={s.plateCover}>
        <BookCover title={BOOK.title} author={BOOK.author} width={104} rotate={-1.5} />
      </span>
      <h1 className={`${j.title} ${s.plateTitle}`} title={BOOK.title}>
        {BOOK.title}
      </h1>
      <p className={`${j.author} ${s.plateAuthor}`}>{BOOK.author}</p>
      <span className={s.plateRule} aria-hidden="true" />
      {/* Two lines on purpose. Left to wrap, the measure breaks it after
          "last" and the reader gets a widow in the middle of a phrase; the
          book's facts go on the first line and the reading's on the second. */}
      <p className={s.plateFact}>
        <span className={s.plateFactLine}>
          {BOOK.pages} pages · opened {OPENED}
        </span>
        <span className={s.plateFactLine}>{tally(stream)}</span>
      </p>
      <div className={s.plateControls}>
        <FormatRow small value={formats} onChange={setFormats} />
        <Dates />
      </div>
      <Sparkle size={15} className={s.plateSpark} />
    </div>
  )
}

/* ── The surface ──────────────────────────────────────────────────────────*/

function Surface({ head, stream }: { head: React.ReactNode; stream: Entry[] }) {
  return (
    <div className={s.column}>
      {head}
      <Thread stream={stream} />
    </div>
  )
}

export function HeadRecord({ stream }: { stream: Entry[] }) {
  return <Surface head={<Record stream={stream} />} stream={stream} />
}

export function HeadLedger({ stream }: { stream: Entry[] }) {
  return <Surface head={<Ledger stream={stream} />} stream={stream} />
}

export function HeadPlate({ stream }: { stream: Entry[] }) {
  return <Surface head={<Plate stream={stream} />} stream={stream} />
}
