/* C · The Weave — your ideas are the spine.

   The other two readings are organised by facts about a keep: when it was
   made, what it is. This one is organised by the only thing in the app the
   reader invented — the strands they are following through the book. It opens
   on those, not on the book: a list of the things you are watching for, each
   one rolled up to a line, each unrolling to show only what is tied to it.

   Everything untied is collected at the foot under one heading, which is the
   honest place for it. A keep with no strand is not a failure, it is just not
   part of an argument yet — so it is present, and it is last.

   This is also the one reading where the coloured line is doing real work, and
   so the one reading that draws it. It is a spine down the leading edge of an
   open strand, holding its keeps together; it is not a decoration in the
   margin of a card, which is what it used to be in all three. */

import { useState } from 'react'
import { CaretIcon, StrandIcon } from '../components/TabIcons'
import Keep from './Keep'
import { count, dayPhrase, formatPhrase } from './lexicon'
import { strandColor } from './order'
import { depthOf, type Reading } from './layout'
import type { Strand } from '../data/db'
import styles from './Weave.module.css'

function Weave({
  book,
  keeps,
  strands,
  rows,
  tools,
  sentinel,
  onMenu,
  onMotif,
  onAbout,
  onTie,
}: Reading) {
  /* Whatever is still running is open, because that is what the reader is
     currently thinking about. If nothing is running, the last one they closed
     is — a page of nothing but rolled-up lines reads as an empty page. */
  const [open, setOpen] = useState<Set<number>>(() => {
    const live = strands.filter((s) => !s.closedAt).map((s) => s.id)
    if (live.length) return new Set(live)
    const last = [...strands].sort((a, b) => a.openedAt - b.openedAt).at(-1)
    return new Set(last ? [last.id] : [])
  })

  const depth = depthOf(book)
  const loose = rows.filter((r) => r.keep.strandId === undefined)

  function toggle(id: number) {
    setOpen((was) => {
      const next = new Set(was)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  /* The day a strand was opened, read off the keep that opened it rather than
     off `openedAt` — the keep carries the day the reader says it happened,
     which is not always the day the row was written. */
  function opened(strand: Strand) {
    const mark = keeps.find((k) => k.strandId === strand.id && k.strandMark === 'open')
    return mark ? dayPhrase(mark.keptOn) : null
  }

  return (
    <>
      <header className={styles.masthead}>
        <h1 className={styles.title}>{book.title}</h1>
        <p className={styles.author}>{book.author}</p>
        <p className={styles.facts}>
          <span>{formatPhrase(book) || 'not marked'}</span>
          {depth !== null && <span>{`p. ${book.pagesRead} of ${book.pages}`}</span>}
          <button type="button" className={styles.about} onClick={onAbout}>
            About
            <CaretIcon size={13} />
          </button>
        </p>
      </header>

      <p className={styles.lede}>
        {strands.length
          ? `${count(strands.length, { one: 'strand runs', many: 'strands run' })} through this book.`
          : 'No strands yet — a strand is something you have started watching for.'}
      </p>

      <div ref={sentinel} aria-hidden="true" />

      {tools}

      {strands.length > 0 && (
        <ul className={styles.strands}>
          {strands.map((strand) => {
            const tied = rows.filter((r) => r.keep.strandId === strand.id)
            const showing = open.has(strand.id)
            const since = opened(strand)
            return (
              <li
                key={strand.id}
                className={styles.strand}
                data-open={showing || undefined}
                style={{ '--strand': strandColor(strand.hue) } as React.CSSProperties}
              >
                <button
                  type="button"
                  className={styles.spine}
                  aria-expanded={showing}
                  onClick={() => toggle(strand.id)}
                >
                  <span className={styles.knot} aria-hidden="true" />
                  <span className={styles.name}>{strand.name}</span>
                  <span className={styles.tally}>{tied.length}</span>
                  <CaretIcon size={16} />
                </button>

                <p className={styles.span}>
                  {since ? `from ${since}` : 'running'}
                  {strand.closedAt ? ' · tied off' : ' · still open'}
                </p>

                {showing && (
                  <div className={styles.unrolled}>
                    {tied.length ? (
                      tied.map((row) => (
                        <Keep
                          key={row.keep.id}
                          keep={row.keep}
                          strands={strands}
                          onMenu={onMenu}
                          onMotif={onMotif}
                        />
                      ))
                    ) : (
                      <p className={styles.nothing}>Nothing tied to this one yet.</p>
                    )}

                    {!strand.closedAt && (
                      <button
                        type="button"
                        className={styles.tieOff}
                        onClick={() => onTie(strand)}
                      >
                        <StrandIcon size={16} />
                        Tie this off
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {loose.length > 0 && (
        <section className={styles.looseSection} aria-label="Not tied to a strand">
          <h2 className={styles.looseHead}>Loose</h2>
          <div className={styles.looseColumn}>
            {loose.map((row) => (
              <Keep
                key={row.keep.id}
                keep={row.keep}
                strands={strands}
                onMenu={onMenu}
                onMotif={onMotif}
              />
            ))}
          </div>
        </section>
      )}

      {rows.length === 0 && strands.length === 0 && (
        <p className={styles.absent}>
          {keeps.length
            ? 'Nothing here matches that. Change what you are looking for, or show everything again.'
            : 'Start a strand and everything you tie to it collects here.'}
        </p>
      )}
    </>
  )
}

export default Weave
