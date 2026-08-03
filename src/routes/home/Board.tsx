/* THE BOARD — a homepage that is the world of the book, not a log of the app.

   Everything that stood here before was a feed: the last thing you kept, the
   books you visited, an old keep brought back. All of them answer the same
   question — *what have I done in this app* — which is a question only the app
   cares about, is what every other app's home screen answers, and on a first
   run answers nothing at all.

   A reader opens this while they are reading. What they want at that moment is
   not their own filing history; it is who that person was, where this is
   happening, and what they suspected forty pages ago. That is the thing this
   app has and nothing else does — it *draws the world of the book* — so the
   home screen is that world, pinned up: the cast, the map, the open questions,
   in the app's own pen, on the app's own paper.

   Three consequences, and they are the whole design:

     · It is made of drawings, not rows. A wall of penned faces and maps says
       what this app is in the half-second before anything is read.

     · One object is turned face up each day. The board is otherwise a stable
       thing — the same cast, the same places — so the reason to open it
       tomorrow is that the app hands something back out of it.

     · The first run is the same wall with nothing on it yet: seven pinned
       outlines, one per kind, each saying what goes there. A reader who has
       never opened a book in this app still learns, in one screen, that it
       collects people, places and hunches out of what they read. That is the
       one thing every previous empty state failed to do.

   Sample content until the entry store lands. Invented, as everything in
   `data/sample.ts` is. */

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import PaperSurface from '../../components/PaperSurface'
import LeafButton from '../../components/LeafButton'
import Avatar from '../../journey/avatars'
import { Place } from '../../journey/cards/art'
import type { Stance } from '../../data/db'
import { KIND, KINDS, STANCE } from '../../journey/kinds'
import { count, spell } from '../../journey/lexicon'
import styles from './Board.module.css'

/* The book being read, and its world. One shape per kind of object rather than
   a bag of `Entry` — the wall shows a *person*, not an entry whose type is
   character, and giving each its own row here keeps the tiles from having to
   ask what they are holding. */
interface Cast {
  name: string
  /** The half-line under a face. What you would say about them in passing. */
  note: string
}

interface Ground {
  name: string
  /** The map is seeded from this, so a place keeps its map the way a name
      keeps its face. */
  seed: number
}

interface Question {
  text: string
  stance: Stance
  /** Days since it was written down. The board's only clock. */
  age: number
}

const BOOK = {
  id: '111111',
  title: 'The Lantern Season',
  author: 'A. Winters',
  page: 214,
  pages: 502,
}

const CAST: Cast[] = [
  { name: 'Aunt Bel', note: 'Keeps the log. Will not say why.' },
  { name: 'Marek', note: 'Arrived with the storm.' },
  { name: 'The boy from the ferry', note: 'Never given a name.' },
  { name: 'Odile', note: 'Signs off on everything.' },
]

const GROUND: Ground[] = [
  { name: 'The lamp room', seed: 4177 },
  { name: 'Halloway Pier', seed: 91_204 },
]

const QUESTIONS: Question[] = [
  { text: 'Bel never left the island at all.', stance: 'suspicion', age: 11 },
  { text: 'The signature in the log is not hers.', stance: 'hunch', age: 3 },
]

/* What the app hands back today. A question rather than a face on purpose: the
   turned card has to be worth a second look, and a person you already know is
   not — an open question you left eleven days ago is.

   One a day, from the whole archive. Which one is a job for the store; the
   shape it takes is this. */
const TURNED = QUESTIONS[0]

/* ── The columns ───────────────────────────────────────────────────────────

   The wall is dealt into columns here rather than by CSS, and both reasons are
   things multicol got wrong rather than preferences.

   A pinhead is absolutely positioned against its own scrap, and when a scrap
   lands on a column boundary Chromium leaves an empty fragment of it behind in
   the previous column and paints the pin into that fragment too. Odile's pin
   measured 201 × 637 — one dot with a box across both columns, drawing a
   second time at the foot of the left column. `break-inside: avoid` does not
   prevent it, because the empty fragment is not a break in the content.

   And multicol has no row gap at all, so the space between scraps had to be a
   margin on each one, which is the same distance stated in a place where it
   cannot be seen alongside the gap between the columns.

   Two lists in a grid have neither problem: each column is an ordinary block,
   the pins stay whole, and both gaps are gaps. */

/** How tall a scrap is, in units of nothing — only the ratios matter. */
const WEIGHT = { cast: 3, ground: 2, question: 2 }

interface Scrap {
  key: string
  weight: number
  render: (tilt: number) => ReactNode
}

/* Greedy onto the shortest column, by weight rather than by count. A face is
   taller than a map, and a map than a written line, so four scraps against
   three can still leave one column half a screen longer than the other. */
function deal(scraps: Scrap[], columns: number): Scrap[][] {
  const dealt: Scrap[][] = Array.from({ length: columns }, () => [])
  const height: number[] = Array.from({ length: columns }, () => 0)
  for (const scrap of scraps) {
    let shortest = 0
    for (let i = 1; i < columns; i += 1) {
      if (height[i] < height[shortest]) shortest = i
    }
    dealt[shortest].push(scrap)
    height[shortest] += scrap.weight
  }
  return dealt
}

/* Fractions of a degree, cycled by position on the wall. Four scraps at four
   random angles is a mess; four at a fixed alternation is a board somebody
   pinned up. Never two of the same lean side by side, in either direction. */
const TILTS = [-1.3, 1.1, -0.9, 1.4]

/* ── Pinned things ─────────────────────────────────────────────────────────

   Every tile is the app's own paper, tilted, with a pinhead riding its top
   edge. */

function Pin({ hue }: { hue: string }) {
  /* Drawn, not a dot: a circle with a hairline round it, in the kind's own
     colour, sitting half above the paper's edge so the paper reads as being
     held rather than as having a decoration printed on it. */
  return <span className={styles.pin} style={{ '--pin': `var(${hue})` } as never} aria-hidden="true" />
}

function CastTile({ person, tilt }: { person: Cast; tilt: number }) {
  return (
    <PaperSurface as="li" tone="character" rotate={tilt} className={styles.tile}>
      <Pin hue={KIND.character.hue} />
      <Link to={`/book/${BOOK.id}`} className={styles.tileLink}>
        {/* The same mount the journey card uses, one step larger. A face at 46
            is a mark beside a name; the board is where you go to remember who
            somebody is, so here the face is the tile and the name is under it,
            the way a photograph is pinned up. */}
        <span className={styles.cameo}>
          <Avatar name={person.name} note={person.note} />
        </span>
        <span className={styles.castName}>{person.name}</span>
        <span className={styles.castNote}>{person.note}</span>
      </Link>
    </PaperSurface>
  )
}

function GroundTile({ ground, tilt }: { ground: Ground; tilt: number }) {
  return (
    <PaperSurface as="li" tone="place" rotate={tilt} className={styles.tile}>
      <Pin hue={KIND.place.hue} />
      <Link to={`/book/${BOOK.id}`} className={styles.tileLink}>
        <span className={styles.map}>
          <Place seed={ground.seed} className={styles.mapArt} />
        </span>
        <span className={styles.groundName}>{ground.name}</span>
      </Link>
    </PaperSurface>
  )
}

function QuestionTile({ question, tilt }: { question: Question; tilt: number }) {
  return (
    <PaperSurface as="li" tone="thread" rotate={tilt} className={styles.tile}>
      <Pin hue={KIND.thread.hue} />
      <Link to={`/book/${BOOK.id}`} className={styles.tileLink}>
        <span className={styles.stance}>{STANCE[question.stance].label}</span>
        <span className={styles.questionText}>{question.text}</span>
      </Link>
    </PaperSurface>
  )
}

const SCRAPS: Scrap[] = [
  ...CAST.map((person) => ({
    key: person.name,
    weight: WEIGHT.cast,
    render: (tilt: number) => <CastTile key={person.name} person={person} tilt={tilt} />,
  })),
  ...GROUND.map((ground) => ({
    key: ground.name,
    weight: WEIGHT.ground,
    render: (tilt: number) => <GroundTile key={ground.name} ground={ground} tilt={tilt} />,
  })),
  /* The turned one is already up above the wall; pinning it here as well would
     be the same scrap twice on one screen. */
  ...QUESTIONS.filter((question) => question !== TURNED).map((question) => ({
    key: question.text,
    weight: WEIGHT.question,
    render: (tilt: number) => <QuestionTile key={question.text} question={question} tilt={tilt} />,
  })),
]

/* Two columns on a phone, and only two: three would need the deal to know the
   breakpoint, and a media query has no way to tell JSX anything. That is the
   desktop step's problem, not this one's. */
function Wall({ scraps }: { scraps: Scrap[] }) {
  return (
    <div className={styles.wall}>
      {deal(scraps, 2).map((column, ci) => (
        <ul key={`column-${ci}`} className={styles.column}>
          {column.map((scrap, ri) => scrap.render(TILTS[(ci + ri) % TILTS.length]))}
        </ul>
      ))}
    </div>
  )
}

/* ── The turned card ───────────────────────────────────────────────────────

   The one object the app puts in front of you today, set apart above the wall
   and given the column rather than a tile. It says its own age out loud,
   because the age is the reason it is here: a question you wrote eleven days
   ago and are now two hundred pages past is a different question. */
function Turned() {
  return (
    <PaperSurface tone="thread" rotate={-0.5} className={styles.turned}>
      <Pin hue={KIND.thread.hue} />
      <p className={styles.turnedKicker}>Turned up today</p>
      <Link to={`/book/${BOOK.id}`} className={styles.turnedLink}>
        <p className={styles.turnedText}>{TURNED.text}</p>
      </Link>
      <p className={styles.turnedWhy}>
        A {STANCE[TURNED.stance].label.toLowerCase()} you wrote {spell(TURNED.age)} days ago.
        You are {spell(BOOK.page - 41)} pages further on.
      </p>
    </PaperSurface>
  )
}

/* ── The empty wall ────────────────────────────────────────────────────────

   Seven outlines, one per kind, in the order the app thinks in: the four
   things lifted out of a book, then the three built about it. This is the only
   screen in the app where all seven are visible at once, and on a first run it
   is the only screen there is — so it is doing the app's whole explaining, in
   seven words rather than a paragraph of welcome. */
function Ghosts() {
  /* All one weight, so the deal alternates, and no tilt: an outline is not a
     piece of paper somebody put up, it is the space one will take. */
  const scraps: Scrap[] = KINDS.map((type) => {
    const kind = KIND[type]
    return {
      key: type,
      weight: 1,
      render: () => (
        <li key={type} className={styles.ghost} style={{ '--pin': `var(${kind.hue})` } as never}>
          <span className={styles.ghostIcon} aria-hidden="true">
            <kind.Icon size={20} />
          </span>
          <span className={styles.ghostWord}>{kind.one}</span>
        </li>
      ),
    }
  })
  return <Wall scraps={scraps} />
}

function Board({ empty }: { empty: boolean }) {
  if (empty) {
    return (
      <div className={styles.board}>
        <header className={styles.head}>
          <h1 className={styles.headTitle}>Nothing pinned up yet.</h1>
          <p className={styles.headLine}>
            Open a book and this wall fills with its world — the people in it,
            where it happens, and what you suspect.
          </p>
        </header>
        <Ghosts />
        <div className={styles.invite}>
          <LeafButton>+ Add a book</LeafButton>
        </div>
      </div>
    )
  }

  const kept = CAST.length + GROUND.length + QUESTIONS.length

  return (
    <div className={styles.board}>
      {/* The book is a line, not a hero. It is context for the wall below —
          which book's world this is — and a card for it would make the
          homepage about the object rather than about what is inside it. */}
      <header className={styles.head}>
        <p className={styles.headKicker}>You are in</p>
        <h1 className={styles.headTitle}>
          <Link to={`/book/${BOOK.id}`} className={styles.headLink}>
            {BOOK.title}
          </Link>
        </h1>
        <p className={styles.headLine}>
          {BOOK.author}
          <span className={styles.sep} aria-hidden="true">·</span>
          page {BOOK.page} of {BOOK.pages}
        </p>
      </header>

      <Turned />

      <section aria-labelledby="board-wall">
        <h2 id="board-wall" className={styles.wallLabel}>
          Its world, so far
        </h2>
        <Wall scraps={SCRAPS} />
      </section>

      {/* "in this book", not "on this board": the turned card is one of the
          eight and it is sitting above the wall, so a reader who counts the
          scraps would come up one short of a board that claimed eight. */}
      <p className={styles.foot}>
        {count(kept, { one: 'thing', many: 'things' })} kept in this book
        <span className={styles.sep} aria-hidden="true">·</span>
        <Link to="/library" className={styles.footLink}>your other books</Link>
      </p>
    </div>
  )
}

export default Board
