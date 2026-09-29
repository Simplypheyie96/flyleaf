/* DIRECTION 4 — SPREAD
   ════════════════════
   Axis: THE PAGE ITSELF. The app is about books and is laid out like an app.
   Here it is laid out like a book: a running head, a wide outer margin that
   the dates and page numbers live in, an opening line with a drop capital,
   ornament rules between months, and a folio at the foot.

   The claim it is testing: nothing makes reading software feel like reading
   faster than the furniture of a printed page — and the meta the journey
   currently stacks on top of every card (date, kind, page) is exactly what a
   margin is for. Moved out there, the card has nothing above it but itself.

   Its honest weakness is stated in the table: the margin is a real second
   column and a 390px phone has no room for one, so below 768 it folds back to
   a single tracked line. The direction is at its best on iPad and desktop. */

import BookCover from '../../components/BookCover'
import type { Entry } from '../../data/db'
import { cardFor } from '../../journey/cards'
import { KIND } from '../../journey/kinds'
import { BOOK, DAY_NUMBER, MONTH, READER, SHORT, YEAR, calendar } from './stub'
import s from './spread.module.css'

const TODAY = '2026-07-13'

function Keep({ keep }: { keep: Entry }) {
  const Card = cardFor(keep.type)
  return <Card keep={keep} />
}

/* The opening sentence is prose, and prose spells its numbers. Past forty it
   stops being worth the words, and a numeral in a sentence that long reads as
   a figure rather than as a count — which is the moment to hand it back. */
const ONES = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen',
  'Nineteen',
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function spelled(n: number): string {
  if (n < 20) return ONES[n]
  if (n < 100) {
    const rest = n % 10
    return rest ? `${TENS[Math.floor(n / 10)]}-${ONES[rest].toLowerCase()}` : TENS[Math.floor(n / 10)]
  }
  return String(n)
}

export function Home({ stream }: { stream: Entry[] }) {
  const fell = stream[1]

  return (
    <div className={s.column}>
      <header className={s.runningHead}>
        <span className={s.headLeft}>{READER.name}’s flyleaf</span>
        <span className={s.headRight}>
          {DAY_NUMBER(TODAY)} {MONTH(TODAY)} {YEAR(TODAY)}
        </span>
      </header>

      {/* The opening. One sentence, set at reading size with a drop capital,
          and every number in it is true of the shelf below it — an opening
          line that is decoration would be the worst thing on this page. */}
      <p className={s.opening}>
        {spelled(stream.length)} things kept so far, all of them out of one book, which is still
        open on the desk.
      </p>

      <section className={s.plate} aria-labelledby="sp-reading">
        <h2 id="sp-reading" className={s.marginSlug}>
          Currently reading
        </h2>
        <div className={s.plateBody}>
          <BookCover title={BOOK.title} author={BOOK.author} width={112} rotate={-1.5} />
          <h3 className={s.title}>{BOOK.title}</h3>
          <p className={s.author}>{BOOK.author}</p>
          <span className={s.shortRule} aria-hidden="true" />
          <p className={s.fact}>
            {BOOK.pages} pages · opened {SHORT(BOOK.startedOn!)} · {stream.length} kept
          </p>
        </div>
      </section>

      <span className={s.ornament} aria-hidden="true">
        <span className={s.ornRule} />
        <span className={s.ornMark}>❧︎</span>
        <span className={s.ornRule} />
      </span>

      {/* One keep, set the way every keep on the journey is set: its own facts
          out in the margin, the card alone in the text column. */}
      <section className={s.leaf} aria-labelledby="sp-fell">
        <div className={s.margin}>
          <h2 id="sp-fell" className={s.marginKind}>
            {KIND[fell.type].one}
          </h2>
          <p className={s.marginWhen}>{SHORT(fell.keptOn)}</p>
          {fell.page ? <p className={s.marginPage}>p. {fell.page}</p> : null}
        </div>
        <div className={s.text}>
          <Keep keep={fell} />
        </div>
      </section>

      <p className={s.folio}>Flyleaf · Home</p>
    </div>
  )
}

export function Journey({ stream }: { stream: Entry[] }) {
  const months = calendar(stream)
  let printed = 0

  return (
    <div className={s.column}>
      {/* A running head does what a running head does: it stays at the top of
          the page telling you which book you are inside. */}
      <header className={`${s.runningHead} ${s.sticky}`}>
        <span className={s.headLeft}>{BOOK.title}</span>
        <span className={s.headRight}>{BOOK.author}</span>
      </header>

      <p className={s.opening}>
        Opened {SHORT(BOOK.startedOn!)}. Everything below was kept while reading it, newest first.
      </p>

      {months.map((month, m) => (
        <section key={month.key} aria-labelledby={`sp-${month.key}`}>
          {m > 0 ? (
            <span className={s.ornament} aria-hidden="true">
              <span className={s.ornRule} />
              <span className={s.ornMark}>❧︎</span>
              <span className={s.ornRule} />
            </span>
          ) : null}
          <h2 id={`sp-${month.key}`} className={s.chapter}>
            {month.month} <span className={s.chapterYear}>{month.year}</span>
          </h2>

          {month.days.flatMap((group) =>
            group.keeps.map((keep) => {
              printed += 1
              return (
                <article key={keep.id} className={s.leaf} style={{ '--i': printed } as React.CSSProperties}>
                  <div className={s.margin}>
                    <p className={s.marginKind}>{KIND[keep.type].one}</p>
                    <p className={s.marginWhen}>{SHORT(keep.keptOn)}</p>
                    {keep.page ? <p className={s.marginPage}>p. {keep.page}</p> : null}
                  </div>
                  <div className={s.text}>
                    <Keep keep={keep} />
                  </div>
                </article>
              )
            }),
          )}
        </section>
      ))}

      <p className={s.folio}>{BOOK.title} · {stream.length} kept</p>
    </div>
  )
}
