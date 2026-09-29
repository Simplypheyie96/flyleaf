/* DIRECTION 1 — DESK
   ══════════════════
   Axis: DEPTH. Nothing about the content changes; what changes is that the
   page stops being a list and becomes a surface you are looking down onto.
   Keeps overlap, lean, and cast shadows onto each other, oldest underneath;
   the book sits on a pile of the last things that fell out of it.

   The claim it is testing: the journey already says these are physical objects
   and then stacks them at a polite distance like a list of cards. Let them
   touch. */

import BookCover from '../../components/BookCover'
import Face from '../../components/Face'
import PaperSurface from '../../components/PaperSurface'
import type { Entry } from '../../data/db'
import { cardFor } from '../../journey/cards'
import { KIND } from '../../journey/kinds'
import { BOOK, READER, SHORT, ago } from './stub'
import s from './desk.module.css'

function Keep({ keep }: { keep: Entry }) {
  const Card = cardFor(keep.type)
  return <Card keep={keep} />
}

export function Home({ stream }: { stream: Entry[] }) {
  const fell = stream[1]

  return (
    <div className={s.column}>
      <header className={s.mast}>
        <div>
          <p className={s.hello}>Good evening,</p>
          <p className={s.who}>{READER.name}</p>
          <p className={s.tally}>1 book · {stream.length} kept</p>
        </div>
        <span className={s.portrait}>
          <Face seed={READER.face} size={48} />
        </span>
      </header>

      <section aria-labelledby="desk-open">
        <h2 id="desk-open" className={s.slug}>
          Open on the desk
        </h2>

        {/* THE PILE IS THE POINT. Three sheets sit under the book plate,
            peeking out at the foot — not decoration, but the last three things
            kept from it, which is why the plate says how many. The sheets are
            drawn rather than rendered as cards: at 8px of exposed edge a card
            is an edge, and rendering three real ones to show three edges costs
            three object URLs for nothing. */}
        <div className={s.desk}>
          <span className={`${s.sheet} ${s.sheet3}`} aria-hidden="true" />
          <span className={`${s.sheet} ${s.sheet2}`} aria-hidden="true" />
          <span className={`${s.sheet} ${s.sheet1}`} aria-hidden="true" />

          <PaperSurface rotate={-1.4} className={s.plate}>
            <BookCover title={BOOK.title} author={BOOK.author} width={100} rotate={-2.5} />
            <div className={s.plateInfo}>
              <h3 className={s.title}>{BOOK.title}</h3>
              <p className={s.author}>{BOOK.author}</p>
              <p className={s.fact}>{BOOK.pages} pages</p>
              <p className={s.fact}>
                {stream.length} memories kept · opened {ago(BOOK.startedOn!)}
              </p>
            </div>
          </PaperSurface>
        </div>
      </section>

      <section aria-labelledby="desk-fell">
        <h2 id="desk-fell" className={s.slug}>
          Look what fell out
        </h2>
        {/* Mounted rather than placed: photo corners at two opposite edges, the
            card tilted inside them. The corners are the direction's whole
            argument in miniature — a thing that has been put somewhere. */}
        <div className={s.mounted}>
          <span className={`${s.corner} ${s.cornerTl}`} aria-hidden="true" />
          <span className={`${s.corner} ${s.cornerBr}`} aria-hidden="true" />
          <div className={s.mountedCard}>
            <Keep keep={fell} />
          </div>
          <p className={s.caption}>
            {KIND[fell.type].one} · {SHORT(fell.keptOn)} · from {BOOK.title}
          </p>
        </div>
      </section>

      <footer className={s.foot}>
        <span className={s.rule} aria-hidden="true" />
        <p className={s.footLine}>Everything else is behind the cover.</p>
      </footer>
    </div>
  )
}

export function Journey({ stream }: { stream: Entry[] }) {
  return (
    <div className={s.column}>
      <header className={s.journeyHead}>
        <BookCover title={BOOK.title} author={BOOK.author} width={52} rotate={-2} />
        <div>
          <h1 className={s.journeyTitle}>{BOOK.title}</h1>
          <p className={s.journeyFact}>
            {BOOK.author} · {stream.length} kept
          </p>
        </div>
      </header>

      {/* One cord down the page with everything laid over it. The cord is on
          the list rather than on each item so it runs unbroken behind the
          overlaps — a rule drawn per item would be interrupted by every card
          that sits on the one above it. */}
      <ol className={s.pile}>
        {stream.map((keep, i) => (
          <li
            key={keep.id}
            className={s.laid}
            style={
              {
                '--i': i,
                '--kind': `var(${KIND[keep.type].hue})`,
              } as React.CSSProperties
            }
          >
            <span className={s.knot} aria-hidden="true" />
            <div className={s.mount}>
              <Keep keep={keep} />
            </div>
            <p className={s.meta}>
              {SHORT(keep.keptOn)}
              {keep.page ? ` · p.${keep.page}` : ''} · {KIND[keep.type].one}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}
