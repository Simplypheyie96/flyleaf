/* WHAT SITS UNDER "CURRENTLY READING" — three directions, one slot.

   The section this replaces was a reverse-chronological feed of your own
   entries, drawn in a card language that predates the journey's and does not
   match it, strung on a dashed rail. Three faults in one section: it repeated
   what the book page already shows you better, it was a second visual system
   for the same seven objects, and on a first run it had nothing in it at all.

   Each direction below answers a different question, which is what makes them
   directions rather than three layouts of the same thing:

     A  what did I keep last          — one object, the newest
     B  where has my attention been   — books, not entries
     C  what did I keep and forget    — one object, an old one

   Every one has to hold on a first run, so every one states its own empty
   form in the same frame rather than vanishing and changing the shape of the
   page between a new reader and an old one.

   The switch is `?home=a|b|c` and comes out when a direction is chosen. */

import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import type { Entry } from '../../data/db'
import BookCover from '../../components/BookCover'
import { cardFor } from '../../journey/cards'
import { count, keptLabel, spell } from '../../journey/lexicon'
import { recentVisits } from '../../data/sample'
import styles from './Recent.module.css'

export type HomeDirection = 'a' | 'b' | 'c'

/* Placeholder until the entry store is wired — the same invented content the
   old section used, shaped as the thing the journey's own cards take so this
   renders the real drawing rather than a homepage imitation of one. */
const LAST_KEPT: Entry = {
  id: -1,
  bookId: -1,
  type: 'quote',
  text: 'The rain kept its own kind of time.',
  page: 214,
  keptOn: '2026-07-28',
  createdAt: 0,
  motifs: ['weather'],
} as Entry

const RESURFACED: Entry = {
  id: -2,
  bookId: -2,
  type: 'note',
  text: 'The lighthouse chapter reads like a memory of the future.',
  chapter: 'Chapter 12',
  keptOn: '2026-04-11',
  createdAt: 0,
} as Entry

const noop = () => {}

/* ══ A ═══════════════════════════════════════════════════════════════════════

   One object and a line about it. No rail, no dots, no second card language:
   the newest keep is drawn by the journey's own card for its type, at the size
   it is there, so the homepage and the book page agree about what a quote
   looks like. Everything else in the section is one sentence of provenance.

   The claim being made is that a feed was the wrong shape. Three cards stacked
   invite you to read them, which is work; one card is a thing you glance at
   and either tap or scroll past. */
function Latest({ empty }: { empty: boolean }) {
  /* The journey's own resolver, not a copy of its table: whichever drawing a
     quote gets on the book page is the drawing it gets here, permanently. */
  const Card = cardFor(LAST_KEPT.type)
  return (
    <section aria-labelledby="home-latest" className={styles.slot}>
      <h2 id="home-latest" className={styles.label}>
        The last thing you kept
      </h2>
      {empty ? (
        <div className={styles.invite}>
          <p className={styles.inviteLine}>
            Nothing kept yet. The first line you copy out lands here.
          </p>
        </div>
      ) : (
        <>
          <Card keep={LAST_KEPT} onMotif={noop} />
          {/* The journey writes the date above the card and the book is
              implied by the route. Here it is the other way round, so the one
              line under the card carries both — in the journey's own words for
              a date, so "today" means the same thing on both pages. */}
          <p className={styles.provenance}>
            {keptLabel(LAST_KEPT.keptOn)}
            <span className={styles.sep} aria-hidden="true">·</span>
            from <Link to="/book/111111" className={styles.book}>The Lantern Season</Link>
            <span className={styles.sep} aria-hidden="true">·</span>
            <Link to="/book/111111" className={styles.more}>two more kept there</Link>
          </p>
        </>
      )}
    </section>
  )
}

/* ══ B ═══════════════════════════════════════════════════════════════════════

   Books, not entries. The question this answers is where the reader has been
   lately, which the old feed could not answer at all — three entries from one
   book looked identical to three entries from three.

   What each tile says it holds is stated in the app's own two words rather
   than a count of rows: whispers are what the book said, ink is what you put
   down. A number of "entries" is a database fact; four whispers is a reading
   week.

   The strip scrolls and the next tile peeks, because a strip that ends flush
   with the column reads as the whole list. */
function Visits({ empty }: { empty: boolean }) {
  return (
    <section aria-labelledby="home-visits" className={styles.slot}>
      <h2 id="home-visits" className={styles.label}>
        Where you’ve been
      </h2>
      {empty ? (
        <div className={styles.invite}>
          <p className={styles.inviteLine}>
            No books open yet. Start one and it stands here.
          </p>
        </div>
      ) : (
        <ul className={styles.strip}>
          {recentVisits.map((visit) => (
            <li key={visit.title} className={styles.tile}>
              <Link to="/book/111111" className={styles.tileLink}>
                <BookCover title={visit.title} author={visit.author} width={72} rotate={-1.5} />
                <span className={styles.tileTitle}>{visit.title}</span>
                {/* Spelled out, and in the app's own two words. `count` is what
                    the colophon uses, so "one whisper" reads the same here as
                    it does at the end of a book — and a spelled number cannot
                    be mistaken for a page. */}
                <span className={styles.tileKept}>
                  {count(visit.whispers, { one: 'whisper', many: 'whispers' })} ·{' '}
                  {spell(visit.ink)} in your own ink
                </span>
                <span className={styles.tileWhen}>{visit.when}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/* ══ C ═══════════════════════════════════════════════════════════════════════

   An old one, brought back. The other two directions both show the reader
   something they already know — the newest thing, or the book they closed an
   hour ago. This is the only one that gives the archive a reason to exist
   rather than a reason to be written to: a drawer you never open is a drawer.

   The words are set large in the book face and given the page rather than a
   card, because the point is the line itself and a card would put a frame
   around a thing whose whole job is to be read. The provenance underneath is
   deliberately the smallest text in the section.

   On a first run there is nothing old enough to bring back, and the panel says
   exactly that instead of borrowing the newest thing and calling it a memory. */
function Resurface({ empty }: { empty: boolean }) {
  return (
    <section aria-labelledby="home-back" className={styles.slot}>
      <h2 id="home-back" className={styles.label}>
        Back to you
      </h2>
      {empty ? (
        <div className={styles.invite}>
          <p className={styles.inviteLine}>
            Nothing to bring back yet. This is where the archive starts
            answering you.
          </p>
        </div>
      ) : (
        <div className={styles.panel}>
          <p className={styles.recalled}>{RESURFACED.text}</p>
          <p className={styles.recalledFrom}>
            your own ink
            <span className={styles.sep} aria-hidden="true">·</span>
            <Link to="/book/111111" className={styles.book}>The Lantern Season</Link>
            <span className={styles.sep} aria-hidden="true">·</span>
            kept {keptLabel(RESURFACED.keptOn)}
          </p>
          <button type="button" className={styles.another}>
            Bring back another
          </button>
        </div>
      )}
    </section>
  )
}

const DIRECTIONS: Record<HomeDirection, ComponentType<{ empty: boolean }>> = {
  a: Latest,
  b: Visits,
  c: Resurface,
}

export default function Recent({
  direction,
  empty,
}: {
  direction: HomeDirection
  empty: boolean
}) {
  const Chosen = DIRECTIONS[direction]
  return <Chosen empty={empty} />
}
