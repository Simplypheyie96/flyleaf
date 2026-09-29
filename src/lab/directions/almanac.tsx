/* DIRECTION 2 — ALMANAC
   ═════════════════════
   Axis: TIME. The keeps are unchanged; what changes is that the page is
   organised by the day it happened rather than by the order it arrived. A
   dated rail runs down the journey, months band across it, and Home opens on
   today rather than on a greeting.

   The claim it is testing: the app holds a date on every keep and currently
   spends it on a caption. Made structural, it is the only thing on the page
   that shows accumulation — you can see the weeks you read a lot and the week
   you did not, which is the part of a reading life nothing else here draws. */

import BookCover from '../../components/BookCover'
import type { Entry } from '../../data/db'
import { cardFor } from '../../journey/cards'
import { KIND } from '../../journey/kinds'
import { BOOK, DAY_NUMBER, MONTH, SHORT, WEEKDAY, YEAR, calendar } from './stub'
import s from './almanac.module.css'

const TODAY = '2026-07-13'

function Keep({ keep }: { keep: Entry }) {
  const Card = cardFor(keep.type)
  return <Card keep={keep} />
}

/** The first thing a keep says, for a ledger line. A word's headword, and
    everything else's opening words — never a truncation mid-syllable, so the
    line is cut at a space and given an ellipsis only when it was actually
    cut. */
function opening(keep: Entry, limit = 58) {
  const said = keep.name ?? keep.text ?? KIND[keep.type].one
  if (said.length <= limit) return said
  const cut = said.slice(0, limit)
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`
}

export function Home({ stream }: { stream: Entry[] }) {
  const week = stream.slice(0, 4)
  const latest = stream[0]
  const months = calendar(stream)
  const most = Math.max(...months.map((m) => m.count))

  return (
    <div className={s.column}>
      {/* The date is the masthead. It replaces "Good evening, Mabel" outright —
          a greeting is pleasant and says nothing, and this page's whole
          argument is that the day is the organising fact. */}
      <header className={s.today}>
        <p className={s.weekday}>{WEEKDAY(TODAY)}</p>
        <p className={s.dateline}>
          <span className={s.numeral}>{DAY_NUMBER(TODAY)}</span>
          <span className={s.monthYear}>
            {MONTH(TODAY)}
            <br />
            {YEAR(TODAY)}
          </span>
        </p>
        <span className={s.hair} aria-hidden="true" />
        <p className={s.standing}>
          {stream.length} kept · 1 book open · reading {MONTH(BOOK.startedOn!)} to now
        </p>
      </header>

      <section aria-labelledby="alm-reading">
        <h2 id="alm-reading" className={s.slug}>
          Still reading
        </h2>
        <div className={s.reading}>
          <BookCover title={BOOK.title} author={BOOK.author} width={64} rotate={-1.5} />
          <div className={s.readingInfo}>
            <h3 className={s.title}>{BOOK.title}</h3>
            <p className={s.author}>{BOOK.author}</p>
            <p className={s.since}>
              Opened {SHORT(BOOK.startedOn!)} · {BOOK.pages} pages
            </p>
          </div>
        </div>
      </section>

      {/* THE LEDGER. Four dated lines, not four cards — the point of a ledger
          is that you read down the dates, and four cards would put four
          objects between them. The most recent line opens into its real card
          directly underneath, so the page still shows a keep in full. */}
      <section aria-labelledby="alm-week">
        <h2 id="alm-week" className={s.slug}>
          Lately
        </h2>
        <ol className={s.ledger}>
          {week.map((keep) => (
            <li key={keep.id} className={s.row}>
              <span className={s.rowDate}>{SHORT(keep.keptOn)}</span>
              <span className={s.rowKind} style={{ '--kind': `var(${KIND[keep.type].hue})` } as React.CSSProperties}>
                {KIND[keep.type].one}
              </span>
              <span className={s.rowSaid}>{opening(keep)}</span>
            </li>
          ))}
        </ol>

        <div className={s.inFull}>
          <p className={s.inFullSlug}>{SHORT(latest.keptOn)}, in full</p>
          <Keep keep={latest} />
        </div>
      </section>

      {/* What the months actually weigh. Two bars is not a chart — it is the
          smallest honest drawing of "you kept more in June than in July", and
          it is the one thing on Home that gets better the longer the app is
          used. */}
      <section aria-labelledby="alm-year">
        <h2 id="alm-year" className={s.slug}>
          This year so far
        </h2>
        <ul className={s.meters}>
          {[...months].reverse().map((month) => (
            <li key={month.key} className={s.meter}>
              <span className={s.meterName}>{month.month}</span>
              <span className={s.meterTrack} aria-hidden="true">
                <span className={s.meterFill} style={{ inlineSize: `${(month.count / most) * 100}%` }} />
              </span>
              <span className={s.meterCount}>{month.count}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export function Journey({ stream }: { stream: Entry[] }) {
  const months = calendar(stream)

  return (
    <div className={s.column}>
      <header className={s.journeyHead}>
        <h1 className={s.journeyTitle}>{BOOK.title}</h1>
        <p className={s.journeyFact}>
          {BOOK.author} · opened {SHORT(BOOK.startedOn!)} · {stream.length} kept
        </p>
      </header>

      {months.map((month) => (
        <section key={month.key} className={s.month} aria-labelledby={`m-${month.key}`}>
          <header className={s.band}>
            <h2 id={`m-${month.key}`} className={s.bandName}>
              {month.month}
            </h2>
            <span className={s.bandRule} aria-hidden="true" />
            <p className={s.bandCount}>
              {month.count} kept · {month.year}
            </p>
          </header>

          <ol className={s.days}>
            {month.days.map((group) => (
              <li key={group.iso} className={s.day}>
                {/* The rail carries the date once for the whole day, however
                    many things were kept on it. A date repeated on every card
                    is a caption; a date standing beside three cards is a day. */}
                <div className={s.rail}>
                  <span className={s.railNum}>{DAY_NUMBER(group.iso)}</span>
                  <span className={s.railDay}>{WEEKDAY(group.iso)}</span>
                </div>
                <div className={s.entries}>
                  {group.keeps.map((keep, i) => (
                    <article
                      key={keep.id}
                      className={s.entry}
                      style={{ '--i': i, '--kind': `var(${KIND[keep.type].hue})` } as React.CSSProperties}
                    >
                      <p className={s.entryKind}>
                        {KIND[keep.type].one}
                        {keep.page ? ` · p.${keep.page}` : ''}
                      </p>
                      <Keep keep={keep} />
                    </article>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
