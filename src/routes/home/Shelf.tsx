/* CURRENTLY READING — the plate. The one lifted object on Home.

   Promoted from the direction lab (`src/lab/directions/bloomHome.tsx`), where
   the shape was settled over several rounds; the decisions log in CLAUDE.md
   has the reasons. In short:

   THE SHELF NEVER CHANGES SHAPE. There is always exactly one book face-out —
   the one you are reading — with other books stood spine-out beside it and
   the rabbit sitting at the end of the rail. With one book open those spines
   are the last few you FINISHED; with more, the other OPEN books take their
   place and the finished ones stand down, so the row never grows. A reader
   with one open book and nothing finished gets the cover and the rabbit on
   an empty rail — no filler spines, because a spine here is a real book.

   WHAT A FINGER DOES, per the owner: "swipe should show what else is being
   read, tap should open, but we give pointers for them to swipe."
     · SWIPE sideways on the plate turns to the next or previous open book.
     · TAP the cover or the words opens that book's journey.
     · TAP a ribboned spine pulls that book face-out, the same as a swipe to it.
   The pointers are three, from loudest to quietest: the pager hung off the
   bottom edge (‹ 2/3 ›), a one-time nudge where the book shifts sideways and
   settles back as if a thumb had started turning it, and the ribbons in the
   heads of the open books. The nudge plays on the first few visits only and
   never again once the reader has swiped — a hint that keeps playing after it
   has been understood is a twitch. */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import BookCover from '../../components/BookCover'
import PaperSurface from '../../components/PaperSurface'
import Bunny from '../../rabbit/Bunny'
import { coversOf } from '../../books/covers'
import type { Book } from '../../data/db'
import home from '../Home.module.css'
import s from './Shelf.module.css'

/* Bound in cloth from the kind palette — verdigris, rust, mallow — mixed into
   `--card-fill`, the one card colour both themes define. */
const CLOTH = ['--color-place', '--color-vocabulary', '--color-thread']
/** Finished books, by position on the shelf. */
const SPINE_HEIGHT = [140, 122, 145]
/** Open books, by position in the OPEN order, so a book keeps its own binding
    whichever one is face-out. A little shorter and bound thicker (40px against
    27): a book you are in the middle of is a heavier object than a done one. */
const OPEN_HEIGHT = [122, 112, 130]
const PULLS_MAX = 3

/** Remix Icon arrow-left-s-line / arrow-right-s-line. */
function Step({ back }: { back?: boolean }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"
         aria-hidden="true" focusable="false">
      <path d={back
        ? 'M10.8284 12.0007L15.7782 16.9504L14.364 18.3646L8 12.0007L14.364 5.63672L15.7782 7.05093L10.8284 12.0007Z'
        : 'M13.1717 12.0007L8.22192 7.05093L9.63614 5.63672L16.0001 12.0007L9.63614 18.3646L8.22192 16.9504L13.1717 12.0007Z'} />
    </svg>
  )
}

/* THE NUDGE'S MEMORY. A count of visits it has played on, or "done" once the
   reader has swiped by themselves. Per device and per browser, which is the
   right scope for "has this person learned the gesture". Wrapped, because
   private mode can throw on either call; the cost of losing it is a hint
   that plays a few more times. */
const HINT_KEY = 'flyleaf-swipe-hint'
const HINT_VISITS = 3

function readHint(): number | 'done' {
  try {
    const raw = localStorage.getItem(HINT_KEY)
    if (raw === 'done') return 'done'
    return Number(raw) || 0
  } catch {
    return 'done'
  }
}

function writeHint(value: number | 'done') {
  try {
    localStorage.setItem(HINT_KEY, String(value))
  } catch {
    /* No storage: the hint just forgets it has played. */
  }
}

/** "10 Jun", read at local midnight so a date never slips a day west of UTC. */
function short(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}

interface Props {
  /** Every open book, the one to show first at the front. */
  books: Book[]
  /** Up to three finished books, newest first — the one-book shelf's spines. */
  closed: Book[]
  /** The furthest page anything was kept from, per book. */
  far?: Record<number, number>
}

export default function Shelf({ books, closed, far }: Props) {
  const many = books.length > 1
  const pulls = useRef<HTMLDivElement>(null)
  const [atId, setAt] = useState(books[0].id)
  /* Which way the last turn went, so the new book comes in from that side:
     1 from the right (next), -1 from the left (back), 0 for a pull. */
  const [from, setFrom] = useState(0)
  const book = books.find((open) => open.id === atId) ?? books[0]
  const at = books.indexOf(book)
  /* The spines stand in TURN order — the next swipe's book first — and at
     most three of them. A phone plate holds three beside the cover; a fourth
     and fifth were clipped off its edge and still took focus. The pager and
     the swipe reach every book however many are open. */
  const others = books
    .map((_, i) => books[(at + 1 + i) % books.length])
    .slice(0, Math.min(books.length - 1, PULLS_MAX))

  /* Order is the OPEN order, not the shelf's, so "2/3" is always the same
     book however you got there. Wraps, so no arrow is ever dead. */
  function step(by: number) {
    setFrom(by)
    setAt(books[(at + by + books.length) % books.length].id)
  }

  /* Pressing a spine unmounts it — the book comes off the shelf and the one
     you were reading goes back in its place. Left alone that drops focus on
     the floor, so a press records its slot and the next paint puts focus
     back on whatever is standing there now. */
  const wanted = useRef<number | null>(null)
  function pick(id: number, index: number) {
    wanted.current = index
    setFrom(0)
    setAt(id)
  }

  useLayoutEffect(() => {
    const want = wanted.current
    if (want === null) return
    wanted.current = null
    const buttons = pulls.current?.querySelectorAll('button')
    if (!buttons?.length) return
    ;(buttons[Math.min(want, buttons.length - 1)] as HTMLElement).focus()
  })

  /* THE SWIPE. A sideways flick of 40px or more that is clearly more sideways
     than down. Vertical travel is left to the page (`touch-action: pan-y`),
     and a mouse drag is not a swipe — the arrows are right there.

     A swipe that ends over the cover or the title must not also open the
     book: `swiped` swallows the one click that follows it. */
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)
  function swipeStart(e: React.PointerEvent) {
    swiped.current = false
    swipe.current = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY }
  }
  function swipeEnd(e: React.PointerEvent) {
    const start = swipe.current
    swipe.current = null
    if (!start) return
    const dx = e.clientX - start.x
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(e.clientY - start.y) * 1.5) {
      swiped.current = true
      setNudge(false)
      writeHint('done')
      step(dx < 0 ? 1 : -1)
    }
  }
  function afterSwipe(e: React.MouseEvent) {
    if (!swiped.current) return
    swiped.current = false
    e.preventDefault()
    e.stopPropagation()
  }

  /* The nudge, decided once per visit. Only with more than one book open —
     with one there is nowhere to swipe to — and not under reduced motion,
     where the pager says the same thing without moving anything. */
  const [nudge, setNudge] = useState(false)
  useEffect(() => {
    if (!many) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const seen = readHint()
    if (seen === 'done' || seen >= HINT_VISITS) return
    writeHint(seen + 1)
    setNudge(true)
  }, [many])

  const furthest = far?.[book.id] ?? 0
  const through = book.pages ? Math.min(furthest / book.pages, 1) : 0
  const fact = [
    book.startedOn ? `Opened ${short(book.startedOn)}` : null,
    furthest
      ? `last seen on p. ${furthest}${book.pages ? ` of ${book.pages}` : ''}`
      : !book.startedOn && book.pages
        ? `${book.pages} pages`
        : null,
  ].filter(Boolean)
  const line = fact.join(' · ')
  const to = `/book/${book.id}`
  const turn = { '--from': from } as React.CSSProperties

  return (
    <div className={many ? `${home.stage} ${s.hung}` : home.stage}>
      <h2 id="currently-reading" className={home.tab}>
        Currently reading
      </h2>
      <PaperSurface rotate={-0.4} className={s.plate}>
        <div
          className={s.plateBody}
          data-many={many || undefined}
          data-nudge={nudge || undefined}
          onPointerDown={many ? swipeStart : undefined}
          onPointerUp={many ? swipeEnd : undefined}
          onPointerCancel={many ? () => (swipe.current = null) : undefined}
          onClickCapture={many ? afterSwipe : undefined}
          onAnimationEnd={(e) => {
            if (e.animationName.includes('nudge')) setNudge(false)
          }}
        >
          <div className={s.shelfRow} data-many={many || undefined}>
            {many ? (
              <div ref={pulls} className={s.pulls} role="group"
                   aria-label="Your other open books">
                {others.map((open, j) => {
                  const bound = books.indexOf(open)
                  return (
                    <button
                      key={open.id}
                      type="button"
                      className={s.pull}
                      aria-label={`Show ${open.title}`}
                      style={
                        {
                          '--h': `${OPEN_HEIGHT[bound % OPEN_HEIGHT.length]}px`,
                          '--cloth': `var(${CLOTH[bound % CLOTH.length]})`,
                          '--w': '40px',
                        } as React.CSSProperties
                      }
                      onClick={() => pick(open.id, j)}
                    >
                      <span className={s.ribbon} aria-hidden="true" />
                      <span className={s.spine} aria-hidden="true">
                        <span className={s.gilt} />
                        <span className={s.spineText}>{open.title}</span>
                        <span className={s.gilt} />
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : closed.length ? (
              <ul className={s.spines} aria-label="Finished lately">
                {closed.map((done, i) => (
                  <li
                    key={done.id}
                    className={s.spine}
                    style={
                      {
                        '--h': `${SPINE_HEIGHT[i % SPINE_HEIGHT.length]}px`,
                        '--cloth': `var(${CLOTH[i % CLOTH.length]})`,
                      } as React.CSSProperties
                    }
                  >
                    <span className={s.gilt} aria-hidden="true" />
                    <span className={s.spineText}>{done.title}</span>
                    <span className={s.gilt} aria-hidden="true" />
                  </li>
                ))}
              </ul>
            ) : null}
            {/* The cover is a second way into the same book, so it stays out
                of the tab order and the accessibility tree: the title below
                is the link a keyboard or a screen reader lands on. */}
            <Link
              key={`cover-${book.id}`}
              to={to}
              className={s.propped}
              style={turn}
              tabIndex={-1}
              aria-hidden="true"
              draggable={false}
            >
              <BookCover
                title={book.title}
                author={book.author}
                covers={coversOf(book)}
                width={84}
                rotate={-4}
              />
            </Link>
            <span className={s.onRail}>
              <Bunny pose="waiting" size={62} />
            </span>
            <span className={s.rail} aria-hidden="true" />
          </div>
          {/* The type is the page that turns: keyed on the book so it replays
              its entrance, from the side the turn came from. */}
          <Link
            key={book.id}
            to={to}
            className={s.type}
            style={turn}
            aria-live={many ? 'polite' : undefined}
            draggable={false}
          >
            <h3 className={s.title}>{book.title}</h3>
            <p className={s.author}>{book.author}</p>
            {line ? <p className={s.fact}>{line}</p> : null}
            {furthest && book.pages ? (
              <span className={s.gauge} aria-hidden="true">
                <span className={s.gaugeFill} style={{ inlineSize: `${through * 100}%` }} />
              </span>
            ) : null}
          </Link>
        </div>
        {many ? (
          <div className={home.pager}>
            <button type="button" className={`${home.pagerStep} ${s.reach}`}
                    onClick={() => step(-1)} aria-label="Previous book">
              <Step back />
            </button>
            <span className={home.pagerCount}>
              <span className={home.pagerAt}>{at + 1}</span>
              <span aria-hidden="true">/</span>
              <span>{books.length}</span>
              <span className={home.away}> books open</span>
            </span>
            <button type="button" className={`${home.pagerStep} ${s.reach}`}
                    onClick={() => step(1)} aria-label="Next book">
              <Step />
            </button>
          </div>
        ) : null}
      </PaperSurface>
    </div>
  )
}
