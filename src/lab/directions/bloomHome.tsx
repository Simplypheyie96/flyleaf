/* BLOOM · HOME — round six: four rows, one of them a drawer.
   ═══════════════════════════════════════════════════════════
   Settled earlier and assumed here: Bloom's hue-per-kind, the SPINE
   arrangement for the book being read, Spread's ❧, and the three surfaces
   (sky · plate · sheet) that round five replaced the card-stack with.

   Round five printed four sections on one leaf, one under the other. That
   fixed the stack of cards and left the other half of the problem: the page
   was still as tall as the sum of everything on it. So the quiet sections
   stop being a column and become a DRAWER — one sheet cut into three tiles,
   each showing one thing. The page is four rows and it does not grow:

     1. Currently reading — the plate. The only lifted object.
     2. A line you kept    — production's own Draw: the deck, the moth.
     3. The drawer         — the sheet, three tiles: a word · the chair · closed.
     4. Somewhere to read  — production's own Nook, imported rather than
        restaged: the one thing here a reader can DO rather than read.
     … and under all of it, What you have been keeping: the reader's own
       portrait, on the sky. It is the only row that is about the reader
       rather than about a book, which is why it closes rather than opens.

   The ❧ rules BETWEEN THE ROWS, on the sky — "this divider was meant for
   sections not just inside cards". It spent one round inside the drawer,
   separating the tabs from the panel, and that was the wrong job for it: a
   card already has four edges saying where it starts, so an ornament inside
   one is decoration. On the sky between two rows it is the only thing
   saying where one section ends. It is drawn once, by the page, between
   rows that actually rendered — a row that has nothing to say returns null
   and must not leave a divider hanging over the gap.

   RENAMED: "Look what fell out" → "Fell open here" → "A line you kept".
   Both earlier names were the same joke about a book dropping something;
   this one just says what is there. It is quotes only — production settled
   that, and for the reason it settled it: a note that is not particularly
   pleasant is a bad thing to be handed on opening the app.

   CUT, because a homepage that says everything says nothing:
     · Still unsettled — dropped at the owner's word. A reminder of what you
       have NOT worked out is a fine thing; a homepage is not where it goes.
     · The company you are keeping — characters and places are what the
       journey and the Library are for; on Home it was a second card list.
     · A year ago today — it renders nothing on all but a handful of days a
       year, and a fixed slot designed around an absence is a hole.
     · Say it again — one orb for one memo. The orb is a journey object and
       it earns its entrance there. */
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import BookCover from '../../components/BookCover'
import Face from '../../components/Face'
import PaperSurface from '../../components/PaperSurface'
import Draw from '../../routes/home/Draw'
import Nook from '../../routes/home/nook/Nook'
import Bunny from '../../rabbit/Bunny'
import type { Book, Entry } from '../../data/db'
import { KIND } from '../../journey/kinds'
import {
  BOOK,
  OPEN,
  READER,
  SHELF,
  SHORT,
  WEEK,
  furthest,
  palette,
  spell,
} from './stub'
import home from '../../routes/home.module.css'
import s from './bloomHome.module.css'
import d from './drawer.module.css'

function Head({ name, meta }: { name: string; meta?: string }) {
  return (
    <div className={s.head}>
      <h2 className={s.headName}>{name}</h2>
      {meta ? <p className={s.headMeta}>{meta}</p> : null}
    </div>
  )
}

/** A section ON THE SKY. Same head, no ground under it. */
function Loose({
  name,
  meta,
  children,
}: {
  name: string
  meta?: string
  children: React.ReactNode
}) {
  return (
    <section className={s.loose}>
      <Head name={name} meta={meta} />
      {children}
    </section>
  )
}

/* ── Currently reading · the shelf ────────────────────────────────────────

   Three finished books stood spine-out with this one pulled forward and
   propped against them. The argument for it over a plain cover is that the
   book is shown among others: what you are reading is part of a shelf.

   The spines used to be blank paper, and that was a bug rather than a
   restraint — they asked for `--color-paper-raised`, which tokens.css only
   declares after dark, so by day the whole `background` declaration was
   invalid and they rendered as nothing. Now they are bound in cloth: one
   muted hue each from the app's own kind palette, a curl of shading down
   both edges so the spine reads as round rather than flat, and two gilt
   rules at head and tail. Three hues rather than eight, chosen to sit apart
   from each other — verdigris, rust, mallow — because a shelf is a few
   bindings, not a swatch book. */
const SPINE_HEIGHT = [140, 122, 145]
const CLOTH = ['--color-place', '--color-vocabulary', '--color-thread']

/* The OTHER books you have open stand in the same row, in the same cloth,
   bound a little thicker — 40px against the closed books' 27 — because a
   book you are in the middle of is a heavier object than one that is done
   with. Heights by position in OPEN, not by which one is face-out, so a
   book keeps its own binding whichever one you are reading. */
const OPEN_HEIGHT = [122, 112, 130]

/* Remix `arrow-left-s-line` / `arrow-right-s-line`, one glyph mirrored. */
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

function Reading({ stream }: { stream: Entry[] }) {
  const many = OPEN.length > 1
  const pulls = useRef<HTMLDivElement>(null)
  const [atId, setAt] = useState(OPEN[0].id)
  const book = OPEN.find((open) => open.id === atId) ?? OPEN[0]
  const others = OPEN.filter((open) => open.id !== book.id)

  /* Every sample keep hangs off the first book, so only the first one can
     read its furthest page out of the stream. The others carry their own. */
  const far = book.id === BOOK.id ? furthest(stream) : (book.seen ?? 0)
  const through = Math.min(far / book.pages!, 1)

  /* The button you press stops existing — the book you pulled goes face-out
     and the one you were reading goes back on the shelf in its place. Left
     alone that drops focus on the floor, so a press records where it was and
     the next paint puts focus back on whatever is standing there now. It
     only runs after a press, so nothing steals focus on mount. */
  const wanted = useRef<number | null>(null)

  function pick(id: number, index: number) {
    wanted.current = index
    setAt(id)
  }

  /* WHICH ONE, OF HOW MANY. The spines alone never said it: a ribbon 6px
     wide on a book 98px tall is furniture to anyone who has not been told,
     and the one-book scene and the three-book scene read the same. So the
     count hangs off the card's bottom edge in the pager production Home
     already uses — tab top left says what this is, pager bottom right says
     which one you are on — and the plate itself turns like a page under a
     sideways swipe. Order is OPEN's, not the shelf's, so "2/3" is always
     the same book however you got there. Wraps, so no arrow is ever dead. */
  const at = OPEN.indexOf(book)

  function step(by: number) {
    setAt(OPEN[(at + by + OPEN.length) % OPEN.length].id)
  }

  /* A swipe is a mostly-sideways travel of 40px or more by a finger or pen.
     Vertical travel is left to the page (`touch-action: pan-y` on the
     plate), and a mouse drag is not a swipe — the arrows are right there. */
  const swipe = useRef<{ x: number; y: number } | null>(null)

  function swipeStart(e: React.PointerEvent) {
    swipe.current = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY }
  }

  function swipeEnd(e: React.PointerEvent) {
    const from = swipe.current
    swipe.current = null
    if (!from) return
    const dx = e.clientX - from.x
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(e.clientY - from.y) * 1.5) {
      step(dx < 0 ? 1 : -1)
    }
  }

  useLayoutEffect(() => {
    const want = wanted.current
    if (want === null) return
    wanted.current = null
    const buttons = pulls.current?.querySelectorAll('button')
    if (!buttons?.length) return
    ;(buttons[Math.min(want, buttons.length - 1)] as HTMLElement).focus()
  })

  return (
    <div className={many ? `${home.stage} ${s.hung}` : home.stage}>
      <h2 className={home.tab}>Currently reading</h2>
      <PaperSurface rotate={-0.4} className={s.plate}>
        <div
          className={s.plateBody}
          data-many={many || undefined}
          onPointerDown={many ? swipeStart : undefined}
          onPointerUp={many ? swipeEnd : undefined}
          onPointerCancel={many ? () => (swipe.current = null) : undefined}
        >
          <div className={s.shelfRow} data-many={many || undefined}>
            {/* THE SHELF NEVER CHANGES SHAPE. There is always one book
                face-out — the one you are reading — with other books stood
                spine-out beside it and the rabbit at the end of the rail.
                With one book open those spines are the closed ones; with
                more, the other OPEN books take their place, and the closed
                furniture stands down rather than the row growing.

                This replaced three covers laid out flat, one bright and two
                dimmed at 55%: "i can't be sure that i need to select the
                book covers". Dimming says DISABLED, not PICK ME, and three
                covers in a row looked nothing like the one-book scene. A
                book pulled off a shelf is the most legible interaction
                there is, and it costs the picture nothing — the difference
                between one open book and three is which spines are standing
                there, not what kind of thing you are looking at.

                What marks the ones you can pull is the RIBBON: a bookmark
                in the head of every book that is open. It is the only thing
                on the shelf that says a book is live rather than furniture,
                which makes it the same mark as the affordance. */}
            {many ? (
              <div ref={pulls} className={s.pulls} role="group"
                   aria-label="Your other open books">
                {others.map((open, j) => {
                  const bound = OPEN.indexOf(open)
                  return (
                    <button
                      key={open.id}
                      type="button"
                      className={s.pull}
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
                      <span className={s.spine}>
                        <span className={s.gilt} aria-hidden="true" />
                        <span className={s.spineText}>{open.title}</span>
                        <span className={s.gilt} aria-hidden="true" />
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <ul className={s.spines}>
                {SHELF.map((closed, i) => (
                  <li
                    key={closed.id}
                    className={s.spine}
                    style={
                      {
                        '--h': `${SPINE_HEIGHT[i]}px`,
                        '--cloth': `var(${CLOTH[i % CLOTH.length]})`,
                      } as React.CSSProperties
                    }
                  >
                    <span className={s.gilt} aria-hidden="true" />
                    <span className={s.spineText}>{closed.title}</span>
                    <span className={s.gilt} aria-hidden="true" />
                  </li>
                ))}
              </ul>
            )}

            {/* Face-out, and drawn the same way in both cases: the book you
                are reading is in your hand, not on the shelf. */}
            <span className={s.propped}>
              <BookCover title={book.title} author={book.author} width={84} rotate={-4} />
            </span>

            <span className={s.onRail}>
              <Bunny pose="waiting" size={62} />
            </span>
            <span className={s.rail} aria-hidden="true" />
          </div>

          {/* The type is the page that turns. It is keyed on the book so it
              replays its entrance when you pick another one off the shelf,
              and the cap lives HERE rather than on the body above it: the
              measure is what wants capping, and the shelf wants every pixel
              the card has once there is more than one book standing on it. */}
          <div
            key={book.id}
            className={s.type}
            aria-live={many ? 'polite' : undefined}
          >
            <h3 className={s.title}>{book.title}</h3>
            <p className={s.author}>{book.author}</p>

            {/* ONE line of fact, where there were three. The page total is
                already inside "of 344", the keep count is already in the
                masthead tally two rows up, and a card that says the same
                number twice is most of why this thing was 435px tall.

                Day one: the book is open and nothing has been kept out of it
                yet, so there is no furthest page and "p. 0 of 344" is a claim
                the data cannot make — the line ends after the date and the
                gauge does not print. "Last seen" and a hairline rather than a
                progress bar, for the same reason: the number is a record of
                where something was KEPT, not a claim about where the reader
                is. */}
            <p className={s.fact}>
              Opened {SHORT(book.startedOn!)}
              {far ? ` · last seen on p. ${far} of ${book.pages}` : ''}
            </p>

            {far ? (
              <span className={s.gauge} aria-hidden="true">
                <span className={s.gaugeFill} style={{ inlineSize: `${through * 100}%` }} />
              </span>
            ) : null}
          </div>
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
              <span>{OPEN.length}</span>
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

/** ❧ — the page's section divider, drawn BETWEEN rows and nowhere else. */
function Ornament() {
  return (
    <div className={s.ornament} aria-hidden="true">
      <span className={s.ornRule} />
      <span className={s.ornMark}>❧︎</span>
      <span className={s.ornRule} />
    </div>
  )
}

/* ── On the sky ───────────────────────────────────────────────────────────*/

/** A LINE YOU KEPT — production's own Draw, imported rather than restaged,
    the same way the Nook is: the deck under the card, the moth that lands
    with it, the drop on every pull. "Don't change the look of the card stack
    for a line you kept, the butterfly and everything." Only the name is
    this page's. The stub reaches it through `pool`, so nobody's database is
    seeded to see it. */
const SHELVED = new Map<number | undefined, Book>([BOOK, ...OPEN].map((b) => [b.id, b]))

function Kept({ stream }: { stream: Entry[] }) {
  return <Draw books={SHELVED} pool={stream} name="A line you kept" />
}

/** WHAT YOU HAVE BEEN KEEPING — the reader's own portrait, at the foot.

    It is about the reader rather than about a book, which makes it a closing
    line and not an opening one; it is the LAST row, under the nook, so the
    page ends on something quiet rather than stopping at an edge. Everything
    above it is about books; this one is about the person who kept them. */
function Keeping({ mix, kept }: { mix: ReturnType<typeof palette>; kept: number }) {
  return (
    <Loose name="What you have been keeping" meta={`${kept} kept`}>
      <div
        className={s.bar}
        role="img"
        aria-label={mix.map(({ kind, count }) => `${count} ${KIND[kind].many}`).join(', ')}
      >
        {mix.map(({ kind, count }, i) => (
          <span
            key={kind}
            className={s.band}
            style={
              { '--kind': `var(${KIND[kind].hue})`, '--i': i, flexGrow: count } as React.CSSProperties
            }
          />
        ))}
      </div>
      <ul className={s.legend}>
        {mix.map(({ kind, count }) => (
          <li
            key={kind}
            className={s.key}
            style={{ '--kind': `var(${KIND[kind].hue})` } as React.CSSProperties}
          >
            <span className={s.dot} aria-hidden="true" />
            {count} {count === 1 ? KIND[kind].one : KIND[kind].many}
          </li>
        ))}
      </ul>
    </Loose>
  )
}

/* ── The drawer ───────────────────────────────────────────────────────────

   One sheet cut into three tiles, the way a phone's widget stack shows a
   word, a streak and a shelf at a glance: the word you caught across the
   top, the chair and the closed shelf side by side under it. Two rounds of
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
   after the first tap. */

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

/** The week as a sparkline under its total. */
function ChairTile() {
  const most = Math.max(...WEEK.map((day) => day.seconds))
  const total = WEEK.reduce((sum, day) => sum + day.seconds, 0)
  return (
    <section className={d.tile} aria-label="Time in the chair">
      <h3 className={d.label}>In the chair</h3>
      <p className={d.figure}>
        <span className={d.num}>{spell(total)}</span>
        <span className={d.cap}>this week</span>
      </p>
      <ul className={d.spark} aria-hidden="true">
        {WEEK.map((day) => (
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

/** The last three boards fanned on the table, and the latest one named. */
function ClosedTile() {
  const latest = SHELF[0]
  if (!latest) return null
  return (
    <section className={d.tile} aria-label="Closed lately">
      <h3 className={d.label}>Closed lately</h3>
      <div className={d.fan} aria-hidden="true">
        {SHELF.slice(0, 3)
          .reverse()
          .map((book, i) => (
            <span key={book.id} className={d.fanBook} data-i={i}>
              <BookCover title={book.title} author={book.author} width={30} />
            </span>
          ))}
      </div>
      <p className={d.figure}>
        <span className={d.title}>{latest.title}</span>
        <span className={d.cap}>{SHELF.length} closed this year</span>
      </p>
    </section>
  )
}

function Drawer({ stream }: { stream: Entry[] }) {
  const words = stream.filter((keep) => keep.type === 'vocabulary')
  return (
    <PaperSurface className={d.sheet}>
      {words.length ? <WordTile words={words} /> : null}
      <div className={d.pair}>
        <ChairTile />
        <ClosedTile />
      </div>
    </PaperSurface>
  )
}

/* ── The page ─────────────────────────────────────────────────────────────*/

export default function BloomHome({ stream }: { stream: Entry[] }) {
  const mix = palette(stream)
  /* Nothing kept yet, so nothing dominates. The wash falls back to the quote
     hue rather than to grey — a first-run Home should still be in colour. */
  const dominant = mix[0]?.kind ?? 'quote'

  /* The rows, and then the ❧ BETWEEN them. Every emptiness test lives here
     rather than inside the rows, because a row that returns null renders no
     element and the divider above it would otherwise be left ruling off a
     gap. Filtering first and interleaving second is the only arrangement
     where a page missing its middle row still looks drawn rather than
     broken. */
  const rows = [
    <Reading key="reading" stream={stream} />,
    stream.some((keep) => keep.type === 'quote') ? <Kept key="kept" stream={stream} /> : null,
    <Drawer key="drawer" stream={stream} />,
    <Nook key="nook" open={OPEN} />,
    mix.length ? <Keeping key="keeping" mix={mix} kept={stream.length} /> : null,
  ].filter(Boolean) as React.ReactElement[]

  return (
    <div
      className={s.column}
      style={{ '--dominant': `var(${KIND[dominant].hue})` } as React.CSSProperties}
    >
      <span className={s.wash} aria-hidden="true" />

      <header className={s.mast}>
        <div>
          <p className={s.hello}>Good evening,</p>
          {/* The reader's own name is the page's title — there is no other
              candidate, and a Home with no h1 leaves every h2 under it
              hanging off nothing. */}
          <h1 className={s.whoHand}>{READER.name}</h1>
          <p className={s.tally}>
            {OPEN.length + SHELF.length} books · {stream.length} kept
          </p>
        </div>
        <span className={s.portrait}>
          <Face seed={READER.face} size={48} />
        </span>
      </header>

      {rows.map((row, i) => (
        <Fragment key={row.key}>
          {i ? <Ornament /> : null}
          {row}
        </Fragment>
      ))}
    </div>
  )
}
