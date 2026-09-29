/* THE DRAW — one memory, pulled at random, every time you open the app.

   This is what sits under Currently reading, and it took four attempts to get
   here. The first three failed identically and it took a while to see why: a
   board, a pile of leaves and a nightly question are three arrangements of the
   same substance — the reader's own saved entries, laid out in full, in an
   order. That is a feed however it is drawn, and a feed is a record: your
   list, looking back at you, showing you nothing you could not have found
   yourself.

   A SHUFFLE IS NOT A FEED, and the difference is the whole design:

     · ONE thing, not all of them. There is no scroll, no "see all", no second
       row. What is on screen is what you were given.
     · You did not choose it and cannot predict it. The same material becomes a
       gift instead of an index purely by being drawn rather than listed.
     · It comes from ANY book, not the one you are in. A line you kept in March
       out of a book you finished is the thing a list will never show you,
       because a list is ordered and you stopped scrolling at page one.
     · It is never the same twice running, so pulling again always pays.

   Three jobs, all of them the owner's words:

     GIVE SOMETHING BACK   the draw itself — their own words, handed back at a
                           moment they did not pick
     GET ME WRITING FAST   "Keep a new one" is on the object, not behind a tab
     SOMEWHERE TO LINGER   one card, generous, with a deck under it and enough
                           material to be worth looking at

   The motion is not decoration here — it is the content. A card that is simply
   present has been listed; a card that ARRIVES has been drawn. That is the
   entire difference between this and the three that came before, so the drop
   is the one thing in this file that must not be quietly removed. It has a
   reduced-motion path that keeps the meaning (a crossfade still reads as
   "this replaced that") without the movement.

   Home owns the greeting, Currently reading and the no-books-at-all state.
   This owns the slot underneath and nothing above it. */

import { useEffect, useMemo, useRef, useState } from 'react'
import BookCover from '../../components/BookCover'
import Bunny from '../../rabbit/Bunny'
import ComingLines from '../../components/ComingLines'
import Moth from '../../components/Moth'
import PaperSurface from '../../components/PaperSurface'
import { KIND } from '../../journey/kinds'
import { usePlayback } from '../../journey/cards/shared'
import type { Book, Entry } from '../../data/db'
import { useKeep, useKeepTotal, useQuoteIds } from '../../data/useLibrary'
import styles from './Draw.module.css'

/** A different one from the one on screen. Never the same twice running, so
    pulling again always gives you something — the whole appeal of pulling. */
function draw(pool: number[], not: number | null) {
  if (pool.length === 0) return null
  if (pool.length === 1) return pool[0]
  let next = not
  while (next === not) next = pool[Math.floor(Math.random() * pool.length)]
  return next
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** What a reader would say, not a date.

    A draw's whole worth is provenance — "eleven days ago" and "in March" place
    a line in a life, where "2026-03-14" places it in a database. Vague on
    purpose past a fortnight: nobody remembers which Tuesday. */
function whenWords(entry: Entry) {
  const then = new Date(entry.keptOn ?? entry.createdAt)
  if (Number.isNaN(then.getTime())) return 'a while back'

  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'last week'
  if (days < 31) return `${Math.round(days / 7)} weeks ago`

  const month = MONTHS[then.getMonth()]
  const sameYear = then.getFullYear() === new Date().getFullYear()
  return sameYear ? `in ${month}` : `in ${month} ${then.getFullYear()}`
}

/** How long the app has to have been out of sight before coming back to it
    counts as coming back. Under this and it was a glance at a notification.

    Was 45s, which made the card feel fixed: the ordinary rhythm of using a
    phone is a glance away and straight back, and at 45s almost none of those
    returns drew anything. Three seconds still ignores the accidental flick
    between apps while treating every real return as a new visit — which is
    what "it should keep changing" asks for, without becoming a thing that
    moves while you are reading it. */
const AWAY = 3_000

/* How long one card stays up while you are looking at it.

   The section used to draw only on arrival, on the argument that a card which
   swaps itself takes a line out from under a reader mid-sentence. Standing on
   the screen, that reads as stagnant — the one part of Home that is supposed
   to be a surprise sits perfectly still (owner's call, and it replaces the
   note below). So it turns, on the same contract the lines under the first-run
   card already keep: pointer or focus on the section holds it, and reduced
   motion never starts it at all.

   Was 15s — two and a half times their six seconds, on the argument that a
   kept line deserves time to land. Standing on the screen, fifteen seconds
   reads as the card not turning at all (owner's call, revising her own
   earlier one). Nine keeps the half of that argument that mattered: still
   half again longer than their six, still time to read a sentence and its
   byline, but short enough that the section visibly lives. */
const HOLD = 9_000

/* How long the card on screen has to leave before the next one is dealt.

   A turn used to be one event: the key changed, the old card was gone in that
   frame, and the new one began its drop from nothing. The owner's report is
   the accurate description of what that does — "it causes you to blink a
   little with the sudden change like a snap" — because a card removed
   instantly leaves a hole, and a hole is the brightest thing on a quiet
   screen.

   So the two halves are separated in time. The card lifts and fades for this
   long; the swap happens in the moment after it, when there is nothing on
   screen to be snatched; then the new card drops as it always did. Matches
   the `lift` animation in Draw.module.css exactly — if one changes, both do.
   Reduced motion skips the wait entirely and swaps at once, which is what a
   reader who has asked for no movement is asking for. */
const LEAVE = 300

/* DEV ONLY, and it exists because of a real hole: the first run only renders
   on an empty drawer, so once you have kept anything there is no way to look
   at that screen again without deleting your own memories. `?first` shows it
   on demand. `import.meta.env.DEV` is a compile-time constant, so this whole
   branch is dropped from the production bundle. */
export const PREVIEW_FIRST =
  import.meta.env.DEV && new URLSearchParams(window.location.search).has('first')

/* DEV ONLY, same hole one shelf further along. The empty library and the
   "nothing open right now" card are the two states a reader sees once and
   then never again, and reviewing them otherwise means deleting real books to
   look at the screen that says you have none — which is the one review step
   that costs the reviewer their own data. `?bare` renders both on demand
   against a full shelf, and drops out of the production bundle with the
   constant above. */
export const PREVIEW_BARE =
  import.meta.env.DEV && new URLSearchParams(window.location.search).has('bare')

function clockFace(seconds: number | undefined) {
  if (!seconds) return null
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/* ── What is on the card ───────────────────────────────────────────────────

   A quote is set as a quote and a note is set in the hand, because the kinds
   do not feel alike and a shuffle that renders all seven identically has
   flattened the only variety it had. This is the same rule the journey's cards
   keep: structure tells them apart, colour is the last thing to. */

/* THE TRACE — what a voice keep looks like on a card.
   ═══════════════════════════════════════════════════

   There was a sphere here: a 34px ball with a specular highlight and a glow
   ring, and it was the wrong object twice over. It is not what a recording
   looks like, and it said nothing about the one behind it — a two-second
   "yes" and a two-minute passage drew the identical circle. Owner: the card
   should show an audio representation, not a weird circle.

   So the card shows the shape of the recording. Two things make that honest:

   · IT IS STABLE. The bars come out of the keep's own id, so the same memory
     draws the same line every time it falls out of the deck. A trace that
     reshuffled on every draw would be an animation, not a portrait.
   · IT DOES NOT LIE ABOUT LENGTH. The clock is printed at the end of the
     line, where it always was.

   It is NOT the real amplitude envelope, and it is not pretending to be —
   reading that means decoding the blob for a card the reader may never tap,
   on a screen that draws a new one every fifteen seconds. It is the same
   visual language as the player's waveform (components/VoiceOrb) at card
   scale, so tapping through reads as one object opening rather than two
   different pictures of the same file. */
const BARS = 32

function trace(seed: number) {
  const bars: number[] = []
  for (let i = 0; i < BARS; i += 1) {
    /* Two waves that do not divide into each other, so the line never falls
       into the visible repeat a single sine gives you across 32 bars. */
    const a = Math.sin(seed * 0.7 + i * 0.55)
    const b = Math.sin(seed * 1.9 + i * 0.21)
    /* Speech fades in and out at the ends of a clip. A trace that starts at
       full height is a synthesiser; one that swells is a person. */
    const ends = Math.sin((Math.PI * (i + 0.5)) / BARS) ** 0.45
    bars.push(0.16 + 0.84 * Math.abs(a * 0.6 + b * 0.4) * ends)
  }
  return bars
}

/* A recording you can actually hear, on the card it fell out onto.

   The trace was here and the button was not, which made this the one keep on
   Home you could look at and not open — a picture of a voice with no way to
   play it. Every other kind on this card IS its content: the quote is the
   words, the note is the handwriting. A voice memo drawn as a waveform is the
   only one where the card shows the wrapper, so the wrapper has to open.

   Same `usePlayback` the cassette in the journey uses, so a memo behaves
   identically wherever a reader meets it, and the trace fills as it plays
   rather than sitting there as decoration. */
function Heard({ keep }: { keep: Entry }) {
  const { playing, at, toggle, ready } = usePlayback(keep.media)
  const bars = trace(keep.id)
  const played = Math.round(at * bars.length)
  const length = clockFace(keep.duration)

  return (
    <div className={styles.voice}>
      <p className={styles.voiceText}>{keep.text?.trim() || 'A recording'}</p>
      <div className={styles.wave}>
        <button
          type="button"
          className={styles.listen}
          onClick={toggle}
          disabled={!ready}
          aria-label={playing ? 'Pause this recording' : 'Play this recording'}
          data-playing={playing || undefined}
        />
        {/* Decorative: the sentence above says what this is, the button plays
            it and the clock beside it says how long. A screen reader
            announcing 32 bars would be reading the picture out loud. */}
        <span className={styles.trace} data-heard={at > 0 || undefined} aria-hidden="true">
          {bars.map((height, i) => (
            <span
              key={i}
              data-played={i < played ? '' : undefined}
              style={{ blockSize: `${Math.round(height * 100)}%` }}
            />
          ))}
        </span>
        {length && <span className={styles.voiceLength}>{length}</span>}
      </div>
    </div>
  )
}

/** The draw is a glimpse, and a glimpse has a length.

    Nothing bounded this card's height, so it was exactly as tall as whatever
    had been kept. Measured at 375px with a 508-character quote: the words ran
    425px over SIXTEEN lines, the card came out 563px, and the provenance line
    under it landed at y=856 — off the bottom of an 812px phone. The heading
    three inches above says "One line, drawn at random", and the screen was
    answering with a page of one. A short quote is two lines and 183px, so the
    whole proportion of the section — card, moth, the room they sit in — was
    being set by the length of one row in the database.

    CUT THE TEXT, NOT THE BOX, and the closing quote mark is the reason. The
    obvious fix is `-webkit-line-clamp` on `.quote`, which the search rows and
    the journey cards already use, and it works: six lines, ellipsis, done. But
    the marks around a quote are `::before`/`::after` on that same block, so
    clipping the block throws the closing one away — the card renders an
    opening mark, six lines, and no close. That is precisely the "stray
    punctuation" the note over `.quote::before` was written to get rid of, and
    a quotation that never closes reads as a rendering fault rather than a
    trim. Trimming the string instead puts the ellipsis INSIDE the pair, where
    it says what it means: this is the start of something longer.

    Cut on a word, never mid-word. 190 measured out at six lines of Garamond
    on a 375px phone, which puts the whole card at 319px and the bottom of the
    provenance line under it at 667 — comfortably inside the fold, where the
    508-character version had pushed it to 856. Fewer lines than six on a wide
    card, which is the right direction for something only meant to be a taste.

    SLACK, because the last few words are not worth an ellipsis. Trimming a
    194-character quote saves four characters and spends a "…" to do it, which
    tells the reader something was withheld when practically nothing was. So
    the budget carries about a line of tolerance: a quote a little over its
    length arrives whole, and only one that is properly long gets cut.

    There is no way off this card and that is deliberate (see the note at the
    end of Draw), so the rest of a long quote lives where it was put, in the
    book's own timeline. The honest trade: a glimpse that fills the screen has
    stopped being one. */
const GLIMPSE = 190
const SLACK = 24

function glimpse(text: string) {
  if (text.length <= GLIMPSE + SLACK) return text
  const cut = text.slice(0, GLIMPSE)
  const space = cut.lastIndexOf(' ')
  /* Only honour the word break if it is near the end. A pasted URL has no
     spaces in it, so `lastIndexOf` can land at character 12 and hand back a
     twelve-character glimpse of a 500-character quote; below that threshold,
     cutting mid-word is the smaller lie. */
  const kept = space > GLIMPSE * 0.6 ? cut.slice(0, space) : cut
  return `${kept.replace(/[\s,;:.\u2014-]+$/, '')}…`
}

function Body({ keep }: { keep: Entry }) {
  if (keep.type === 'voice') return <Heard keep={keep} />

  return (
    <>
      {keep.name && <p className={styles.name}>{keep.name}</p>}
      {keep.text && (
        <p className={keep.type === 'quote' ? styles.quote : styles.said}>
          {glimpse(keep.text)}
        </p>
      )}
    </>
  )
}

interface Props {
  /** Every book on the shelf, for naming where a draw came from. */
  books: Map<number | undefined, Book>
  /** The book they are in the middle of — the first run asks about that one. */
  reading?: Book
  /** True only on a shelf with NOTHING on it, which is the one time this
      section is the whole page rather than the middle of one. Home knows the
      difference and this cannot work it out: an empty DRAWER (no keeps) is
      also a first draw, but a reader who has already shelved a book has met
      the app and does not need it introduced. Only the empty shelf gets the
      inscription. */
  opening?: boolean
  /** The section's name. Home's is the default; the Home direction in
      src/lab/directions calls the same section "A line you kept". */
  name?: string
  /** Draw from these instead of the library. Only the Home direction in
      src/lab/directions passes it, so its stub shelf gets the real section —
      the deck, the moth, the drop — without seeding anyone's database. */
  pool?: Entry[]
}

function Draw({ books, reading, opening, name = 'Look what fell out', pool: given }: Props) {
  const live = useQuoteIds()
  const stubIds = useMemo(
    () => given?.filter((k) => k.type === 'quote').map((k) => k.id!),
    [given],
  )
  const ids = given ? stubIds : live
  /* Every keep, of every type — read for one comparison only, and never to
     draw from. It is how this tells "nothing has been kept yet" apart from
     "plenty has been kept, none of it a quote", which are the same empty pool
     and want opposite screens. A count on the table, so no row is read. */
  const liveTotal = useKeepTotal()
  const total = given ? given.length : liveTotal

  /* The id on screen, and the counter that replays the drop.

     `pull` only ever goes up, and it keys the card — so React remounts the
     element and the CSS animation runs again. Restarting a keyframe animation
     without a remount means removing a class, forcing a reflow and putting it
     back, which is three lines of DOM poking to say "this is a new card". It
     is a new card. */
  const [drawn, setDrawn] = useState<number | null>(null)
  const [pull, setPull] = useState(0)
  /* True while the card on screen is on its way out. Nothing else may start a
     turn during it — two overlapping turns would swap the card mid-lift, which
     is the snap this whole arrangement exists to remove. */
  const [going, setGoing] = useState(false)
  /* A finger or a caret on the section stops the clock. Someone touching this
     card is reading it, and swapping the sentence out from under them is the
     one failure mode a self-turning card has. */
  const [held, setHeld] = useState(false)

  const still =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

  /* Deal the opening hand once the pool arrives, and re-deal only if what is
     on screen has been deleted. Returning `cur` unchanged is a no-op React
     bails out of, so this stays quiet however often the live query fires —
     which matters: a keep saved in another tab must not silently swap the card
     the reader is looking at. */
  useEffect(() => {
    if (!ids) return
    setDrawn((cur) => (cur !== null && ids.includes(cur) ? cur : draw(ids, null)))
  }, [ids])

  /* IT ROTATES ITSELF, so there is no button asking you to rotate it.

     Two pills under the card put four tap targets in one screenful with the
     tab bar and the "+", and the loudest of them was asking the reader to
     operate the thing rather than read it. The pull is now the app opening,
     which is the honest moment for it anyway: a shuffle you pressed for is a
     slot machine; one that was already waiting when you came back is a gift.

     There is a timer too, below — this one is the arrival. On mount, and on
     coming back after long enough to have been away: that is every real visit.

     The pool goes through a ref so the listener is bound once. Reading `ids`
     directly would rebind on every live-query fire, and each rebind resets
     the clock this is keeping. */
  const pool = useRef<number[]>([])
  pool.current = ids ?? []
  const leftAt = useRef(0)

  /* EVERY TURN GOES THROUGH HERE, arrival and timer alike, so the two halves
     of a swap can never be arranged differently in two places. Refs rather
     than state for the guard and the id, because this is called from listeners
     and intervals that are bound once and must read what is true NOW, not what
     was true when they were bound. */
  const shown = useRef<number | null>(null)
  shown.current = drawn
  const turning = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const swap = useRef<() => void>(() => {})
  swap.current = () => {
    if (turning.current) return
    const next = draw(pool.current, shown.current)
    if (next === null || next === shown.current) return

    function land() {
      turning.current = false
      timer.current = null
      setGoing(false)
      setDrawn(next)
      setPull((p) => p + 1)
    }

    if (still) {
      land()
      return
    }
    turning.current = true
    setGoing(true)
    timer.current = setTimeout(land, LEAVE)
  }

  /* A card mid-lift when the section unmounts would otherwise land on nothing.
     One cleanup, at the end of the component's life, for whichever timer is
     outstanding. */
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  useEffect(() => {
    function look() {
      if (document.hidden) {
        leftAt.current = Date.now()
        return
      }
      if (Date.now() - leftAt.current < AWAY) return
      swap.current()
    }
    document.addEventListener('visibilitychange', look)
    return () => document.removeEventListener('visibilitychange', look)
  }, [])

  /* And it turns while you stand there, on the same contract the lines under
     the first-run card keep: a finger or a caret on the section holds it, a
     hidden tab does not burn draws it will never show, and reduced motion
     never starts the clock at all.

     `pool.current.length < 2` is not a micro-optimisation. With one keep on
     the shelf `draw` can only return the same id, so nothing would change
     except `pull` — and `pull` re-keys the card, which replays the drop and
     re-flies the moth. A reader with one memory would watch it fall out of
     the deck again every fifteen seconds for no reason. */
  useEffect(() => {
    if (held || still) return
    const turn = setInterval(() => {
      if (document.hidden || pool.current.length < 2) return
      swap.current()
    }, HOLD)
    return () => clearInterval(turn)
  }, [held, still])

  const liveKeep = useKeep(given ? undefined : (drawn ?? undefined))
  const keep = given ? given.find((k) => k.id === drawn) : liveKeep

  /* THE FIRST LINE, AND WHERE IT GOES.
     ══════════════════════════════════

     This used to open the add-book sheet and DROP the sentence on the floor.
     The card said "the line you type is the first thing kept", the button
     said "Keep it", and the typed text went nowhere — no draft, no warning,
     gone. Owner, asking the question that found it: can anyone add a line
     without a book attached to it?

     The answer is no, and it is not a policy — it is the shape of the data.
     `Entry.bookId` is a required number (data/db.ts), because a keep with no
     book is a keep with no thread to hang on, no journey to appear in and no
     provenance under it, and provenance is the entire reason a drawn line is
     worth anything rather than being a fortune cookie.

     So the line is not dropped and it is not orphaned either: it is HELD,
     the sheet asks which book it came from, and the moment a book lands on
     the shelf the line is written as that book's first keep and the reader
     is put on its journey looking at it. Two events rather than one, because
     they are two different facts — `find-book` opens the sheet with a search
     term (the Library sends real words down it), and the line is not a
     search term. Sending it as one would type somebody's private sentence
     into Open Library. */
  function startWriting(first: string) {
    const line = first.trim()
    if (line) window.dispatchEvent(new CustomEvent('flyleaf-first-keep', { detail: line }))
    window.dispatchEvent(new CustomEvent('flyleaf-find-book', { detail: '' }))
  }

  /* Dexie still opening. Nothing is truer than nothing here — a first-run card
     that flashes for 80ms and is replaced by a memory is worse than a beat of
     empty space. */
  if (!ids || total === undefined) return null
  if (PREVIEW_FIRST || total === 0)
    return <FirstDraw reading={reading} opening={opening} onStart={startWriting} />
  /* KEEPS ON THE SHELF, BUT NOT ONE QUOTE AMONG THEM: the section is simply
     not here today.

     It must not fall through to `FirstDraw`, which asks for the first line
     someone ever keeps — said to a reader holding forty notes it is the app
     failing to recognise its own user. And it must not grow an empty state
     either: "keep a quote and this will fill up" turns the one part of Home
     that asks nothing of anybody into a chore with a progress bar. The draw
     is a gift. A gift that isn't ready doesn't announce itself. */
  if (ids.length === 0) return null
  if (!keep) return null

  const kind = KIND[keep.type]
  const from = books.get(keep.bookId)

  return (
    /* Touch it and it waits. There is nothing focusable inside the card — no
       link, no button, by the decision recorded at the foot of this section —
       so the section takes the tab stop itself, which is also the keyboard's
       way to hold it. Same shape as ComingLines, deliberately: two things on
       Home that stop when you attend to them should stop the same way. */
    <section
      aria-labelledby="draw-head"
      className={styles.stage}
      tabIndex={0}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <div className={styles.head}>
        <h2 id="draw-head" className={styles.kicker}>
          {name}
        </h2>
        {/* It says QUOTES, not "everything you've kept", because that is what
            the pool is now (useQuoteIds) and a subhead describing a wider
            draw than the one running is the app misdescribing itself. It also
            quietly answers the question a reader would otherwise ask on
            noticing their notes never appear here. */}
        <p className={styles.what}>One line, drawn at random from the quotes you’ve kept.</p>
      </div>

      <div className={styles.pile}>
        {/* The deck. Two sheets, no content, purely so the drawn card has
            something to have been drawn FROM — a single card floating alone is
            a card, not a draw. Inert and hidden from the reader. */}
        <div className={styles.deck} aria-hidden="true">
          <span className={styles.sheet} />
          <span className={styles.sheet} />
        </div>

        {/* Not re-keyed while it is leaving: the key is what replays the drop,
            and the card on its way out is the OLD one, still holding the old
            words. It keeps its identity until the swap, then takes the new key
            and drops. */}
        <PaperSurface
          key={pull}
          taped
          tone={kind.tone}
          rotate={-1.1}
          className={going ? `${styles.card} ${styles.leaving}` : styles.card}
        >
          {/* The type area, which is not the paper — see `.leaf` in the
              stylesheet. Everything printed on the card lives inside it so
              that the kicker, the sentence, the hairline and the provenance
              all share one pair of edges. */}
          <div className={styles.leaf}>
            <p className={styles.mark}>
              <span className={styles.markIcon} aria-hidden="true">
                <kind.Icon size={14} />
              </span>
              {kind.label}
            </p>

            <Body keep={keep} />

            <p className={styles.from}>
              from <span className={styles.fromBook}>{from?.title ?? 'a book you kept'}</span>
              <span className={styles.sep} aria-hidden="true">·</span>
              {/* One unbreakable unit. "4 weeks ago" was wrapping after the
                  number, which left a stray digit at the end of the title's
                  line and read as part of the title. */}
              <span className={styles.when}>{whenWords(keep)}</span>
            </p>
          </div>
        </PaperSurface>

        {/* It lands with the card and on the card's clock — same key, so it
            flies in again on every pull. See Moth.tsx for why it is a moth and
            not a second rabbit. */}
        <Moth key={`moth-${pull}`} className={styles.moth} size={44} />
      </div>

      {/* NO BUTTONS AT ALL, and that is the finished shape of this section.

          It had two, then one, and the last one was still wrong: "Keep a new
          one" is the "+" in the tab bar, three inches below it, wearing a
          different coat. A second door to the same room reads as a second
          room until you have opened both. The draw gives something back and
          asks for nothing — you look at it, and the way to write is where it
          is on every other screen. */}
    </section>
  )
}

/* ── The first run ─────────────────────────────────────────────────────────

   A shelf with a book on it and nothing kept yet. An empty drawer cannot be
   shuffled, so this is the one place the screen is a different object — and it
   is the question direction the owner picked, with the thing that was missing
   put back: somewhere to actually answer.

   A card that asks "what did you notice?" and then offers a button labelled
   "Add a memory" has not asked a question, it has decorated a button. Here the
   line you type IS the first thing kept.

   Under it, THEN AS YOU READ: what is coming, quiet and unpressable, so a
   reader with an empty drawer can see what this screen is going to be for. It
   is the one part of the screen that describes the shuffle, and it only has to
   exist until there is something to shuffle. */

const COMING = [
  'A line you underlined, months after you underlined it.',
  'A note in your own hand, out of a book you already finished.',
  'Something you said out loud in the car, about an ending.',
]

/* The board on the first-run card when there is no book to draw yet.

   Covers are seeded off a book's own title and author, so an ornament with no
   book behind it still needs a pair of strings to be seeded FROM. These two
   are never printed anywhere — the board is bare — they exist only to pin the
   drawing so it is the same one every time the app opens, on every device,
   after a reinstall. Chosen because the seed lands on a garland: an arch of
   flowers, symmetrical, biggest at the crown, which is the one arrangement of
   the four that reads as decoration rather than as a book's actual jacket. */
const BOARD = { title: 'an unopened book', author: 'nobody' }

function FirstDraw({
  reading,
  opening,
  onStart,
}: {
  reading?: Book
  opening?: boolean
  onStart: (line: string) => void
}) {
  const [line, setLine] = useState('')

  return (
    <>
      {/* THE INSCRIPTION, and it is the one thing allowed above the card.
          ═══════════════════════════════════════════════════════════════

          There WAS a line here once and it was cut, correctly: "this is where
          your own words come back to you" describes a mechanism that has not
          happened yet, so on the one run where nothing has been kept it is a
          sentence about nothing. That reasoning has not changed and this does
          not break it — because this says nothing about the app at all. It
          says what the OBJECT in the reader's hands is, and a flyleaf is a
          flyleaf before anybody writes on it. It is true on run one and it is
          still true on run four hundred, which is the test the cut line
          failed.

          It also does the job the greeting cannot. Above this the screen says
          the hour and the reader's name; below it, a card asks a question.
          Between the two there was nothing — no name for the thing, no reason
          the question is being asked, no voice. A first run that opens with a
          form is a form.

          Set on the sky rather than on paper, in the reading face, italic,
          with a raised initial: the shape of something written in the front of
          a book rather than printed in it. And beside it, the board — bare, no
          title, no byline, because nothing has been read yet. The unwritten
          page and the closed book, said once, at the top.

          ONLY ON AN EMPTY SHELF. With books already on it this same component
          renders in the MIDDLE of Home, under Currently reading, and an
          inscription explaining what a flyleaf is, halfway down a page
          belonging to someone who has already shelved four of them, is the app
          introducing itself to a regular. */}
      {opening && (
        <div className={styles.inscribe}>
          {/* The board is NOT beside the sentence any more. Floated against
              it, the short sentence wrapped into two stubby lines with a book
              hanging off their shoulder and a band of dead sky underneath —
              the owner sent the screenshot. The sentence now runs its full
              measure alone, and the closed book has moved DOWN to rest on the
              question card itself (see `.perch` in the pile below): the blank
              page and the book laid on it, which is the picture the sentence
              was always trying to make. */}
          {/* WHAT THIS SAYS, AND WHAT IT USED TO SAY. It used to open "a
              flyleaf is the blank page at the front of a book, where readers
              used to write their names", and the owner was right to throw it
              out on both counts. It was a definition — the app stopping on
              its own front door to explain its name, which is the app talking
              about itself, not to you. And the claim under it was doing real
              damage: "readers used to write their names" is a piece of
              antiquarian trivia stated as fact, it is not why anybody is
              here, and a reader whose honest reaction is "no they didn't" has
              been given something to argue with before they have kept a
              single line.

              This says nothing about flyleaves, history, or the app. It says
              what the blank page in front of them is FOR, in the second
              person, in ten words. Still true on run four hundred, which is
              the test the old line was written to pass and did not.

              Ten words and not thirteen: at this measure the raised initial
              holds the first two lines short, so "…yours to write on" spilled
              a two-word third line into the full width the board had just
              stopped occupying. The invitation is not lost — the card
              directly under this one asks the question outright. */}
          <p className={styles.inscribeText}>
            The page before a story starts is blank. This one is yours.
          </p>
        </div>
      )}

      <section aria-labelledby="draw-first" className={styles.stage}>
        {/* No deck behind this one — an empty drawer has nothing to fan. The
            moth still comes, because the point of it is that something arrives
            on this screen, and a first run is the run that most needs to feel
            arrived at. */}
        <div className={styles.pile}>
          {/* The closed book, resting on the paper's top edge — where the
              float beside the inscription used to be. Overlapping the card is
              the point: it stitches the seam between the sentence and the
              question, and a book lying on a blank page is the whole first
              run in one picture. Decorative; the card's own heading carries
              the words. */}
          {opening && (
            <BookCover
              className={styles.perch}
              title={BOARD.title}
              author={BOARD.author}
              width={72}
              rotate={7}
              bare
            />
          )}
          {/* UNTONED, unlike every drawn card. The tones are the seven kinds,
              and in dark mode they are light paper on a night sky on purpose —
              a sticky note is yellow or it is not a sticky note. That reads
              correctly as a small card among six others on a journey. Blown up
              to the full width of an empty home screen it was a lit yellow slab
              with light-mode ink on it, the brightest thing on a dark page, and
              it is not even a note: nothing has been kept yet. It is a
              question, so it takes plain paper — the same material as Currently
              reading directly above it. */}
          <PaperSurface taped rotate={-1.1} className={styles.card}>
            {/* The board, and it is only here on the run that has no
                inscription above it to hold it.

                It was invented as a drawn open book — geometry, arched pages,
                a ribbon — the only illustration in the app made for one card,
                when the app had been drawing real books from their own seeds
                since the first shelf. So it became a real cover board, worked
                in the same needlework the Library is full of.

                WHAT MOVED, AND WHY. Centred at the head of the card it cost
                161px before a word was read — a 137px board and the air under
                it — on a card the owner called too huge, and it was not even
                doing anything there: an ornament with no book behind it,
                sitting on top of a question about a book. So on an empty shelf
                it has gone up into the inscription, where a closed book beside
                the sentence about a blank page is the picture the sentence is
                making. The card is left with the question, the field, and the
                way out — which is all it ever was.

                It stays HERE, though, when the shelf is not empty, because
                then it is not an ornament at all: it is that book's own cover,
                the same drawing it wears on the shelf, over the question
                "what have you noticed in it?". A picture of the thing being
                asked about earns its 161px. A picture of nothing does not. */}
            {!opening && (
              <BookCover
                className={styles.plate}
                title={reading?.title ?? BOARD.title}
                author={reading?.author ?? BOARD.author}
                width={88}
                rotate={-2.5}
                bare
              />
            )}

            <h2 id="draw-first" className={styles.ask}>
              {reading
                ? `What have you noticed in ${reading.title}?`
                : 'What are you reading right now?'}
            </h2>
            <p className={styles.askWhy}>One line you don’t want to forget.</p>

            <form
              className={styles.answer}
              onSubmit={(e) => {
                e.preventDefault()
                onStart(line)
              }}
            >
              {/* NO VISIBLE LABEL. "The first thing" sat in tracked capitals
                  over a box whose own placeholder already says what goes in
                  it, on a card that was five blocks of text tall. The label
                  survives for anyone who cannot see the placeholder; the
                  reading of it does not. */}
              <textarea
                id="draw-first-line"
                className={styles.field}
                aria-label="The first thing you want to keep"
                rows={2}
                value={line}
                onChange={(e) => setLine(e.target.value)}
                placeholder="A line, a name, a thing you noticed…"
              />
              <button type="submit" className={styles.act}>
                {line.trim() ? 'Keep it' : 'Start with a book instead'}
              </button>

              {/* SAY THE NEXT STEP BEFORE THEY TAKE IT. "Keep it" now opens a
                  book search, and a button that does something other than
                  what it says is worse than the bug it replaced — the reader
                  presses Keep and gets asked about Open Library.

                  One line, and only once there is something to keep: with an
                  empty box the button already reads "Start with a book
                  instead", and telling a reader who has typed nothing that
                  their nothing needs a book is noise. Below the button, so
                  the button never moves as it appears. */}
              {line.trim() && (
                <p className={styles.next}>
                  Then the book it came from — every line hangs on one.
                </p>
              )}
            </form>
          </PaperSurface>

          <Moth className={styles.moth} size={44} />
        </div>

        {/* WHAT IS COMING, one at a time, with a lead that names it. It was
            "Then, as you read" — a heading about the reader's future ACTIONS
            over three lines that are all about things RETURNING, and the
            owner caught the mismatch: the title didn't fit what showed under
            it. "What comes back to you" is the promise all three lines are
            instances of, and it is also the truest one-line description of
            the shuffle this strip grows up to be. See
            components/ComingLines.tsx, including why auto-rotating text owes
            the reader a pause and how it gets one.

            IT IS TIED ON NOW rather than floating below the card. Owner: "we
            need to further highlight the then as you read because it looks a
            bit tiny", and it was tiny in two separate ways. Its lead was an
            11px tracked capital — the app's smallest rank, on the only other
            thing this screen has to say — so it has been set as what it
            actually is, a section heading, in the same serif at the same size
            as "Currently reading" and "Look what fell out" everywhere else.
            And it hung in 72px of open sky with nothing joining it to
            anything, which no amount of type size fixes. A dashed thread now
            descends from the card and ends in a knot above the heading: the
            plot thread, which is the spine of every book's journey in this
            app, met for the first time on the first run. See `.after`. */}
        <div className={styles.after}>
          <ComingLines lead="What comes back to you" lines={COMING} />
        </div>

        {/* AND THEN THE RABBIT, and it goes last on purpose.

            Above it the screen has asked a question and shown what is coming;
            both of those are the app talking about the future. The creature is
            the only thing on a first run that is just present — it waves, its
            ear flops, it breathes, and it wants nothing. Put higher up it
            would be decoration on top of a form. Put here it is the bottom of
            the page saying hello on the way out, which is the whole of what a
            first run needs from a mascot. */}
        <div className={styles.hello}>
          <Bunny pose="wave" size={104} />
        </div>
      </section>
    </>
  )
}

export default Draw
