/* A · The Ledger — time is the spine.

   The calmest of the three, and the default. A reader who has kept forty
   things from a book and comes back to look at them should meet those forty
   things, not the stationery: so there is no rail, no tape, no tilt and no
   second column. The cover is small and to the leading edge, the facts about
   the book are one quiet mono line, and everything below is a single dated
   column under day headings that stick as you pass them — which is the only
   ornament here, and it is doing a job: it tells you where you are in the
   fortnight without you having to scroll back up to find out. */

import BookCover from '../components/BookCover'
import { CaretIcon } from '../components/TabIcons'
import Keep from './Keep'
import { count, epigraph, formatPhrase, keptLabel } from './lexicon'
import type { Row } from './order'
import { depthOf, type Reading } from './layout'
import styles from './Ledger.module.css'

/** The column, cut into the runs it should carry a heading over.

   On the two orders that are still time, the heading is the day. On the
   others `arrange` has already grouped the rows and put the group's name on
   the first of each run, so the day would be a second, contradictory grouping
   — the heading is that name instead. Book order groups by nothing, and gets
   one unheaded run, which is exactly what it means. */
function runs(rows: Row[], byDay: boolean) {
  const out: { head: string; rows: Row[] }[] = []
  for (const row of rows) {
    const head = byDay ? keptLabel(row.keep.keptOn) : row.divider
    if (head && out.at(-1)?.head !== head) out.push({ head, rows: [] })
    else if (!out.length) out.push({ head: '', rows: [] })
    out.at(-1)!.rows.push(row)
  }
  return out
}

function Ledger({
  book,
  keeps,
  strands,
  rows,
  sift,
  tools,
  sentinel,
  onMenu,
  onMotif,
  onAbout,
}: Reading) {
  const said = epigraph(book, keeps, strands)
  const depth = depthOf(book)
  const byDay = sift.order === 'kept' || sift.order === 'newest'

  return (
    <>
      <header className={styles.head}>
        <div className={styles.jacket}>
          <BookCover
            title={book.title}
            author={book.author}
            covers={book.covers}
            width={96}
          />
          {/* Progress as a thing in the book rather than a number about it: the
              ribbon sits that far into the block of pages, so how far in is
              read off the shape before any figure is. */}
          {depth !== null && (
            <span
              className={styles.bookmark}
              style={{ '--depth': depth } as React.CSSProperties}
              aria-hidden="true"
            />
          )}
        </div>

        <div className={styles.identity}>
          <h1 className={styles.title}>{book.title}</h1>
          <p className={styles.author}>{book.author}</p>
        </div>
      </header>

      {/* One line of facts, in the face the app uses for facts. Everything the
          old header said in five paragraphs, said once. */}
      <p className={styles.facts}>
        <span>{formatPhrase(book) || 'not marked'}</span>
        {depth !== null && <span>{`p. ${book.pagesRead} of ${book.pages}`}</span>}
        <span>{count(keeps.length, { one: 'keep', many: 'keeps' })}</span>
        {strands.length > 0 && (
          <span>{count(strands.length, { one: 'strand', many: 'strands' })}</span>
        )}
        <button type="button" className={styles.about} onClick={onAbout}>
          About
          <CaretIcon size={13} />
        </button>
      </p>

      {/* The one sentence on this screen written about the reader rather than
          by them, so it is set apart in the reading face. The hint under it is
          an aside about the sentence, and is bracketed in CSS. */}
      <p className={styles.epigraph}>{said.line}</p>
      {said.hint && <p className={styles.hint}>{said.hint}</p>}

      <div ref={sentinel} aria-hidden="true" />

      {tools}

      {rows.length > 0 ? (
        <div className={styles.column}>
          {runs(rows, byDay).map((run, i) => (
            <section
              key={`${run.head}-${i}`}
              className={styles.run}
              aria-label={run.head || 'Kept from this book'}
            >
              {run.head && <h2 className={styles.day}>{run.head}</h2>}
              {run.rows.map((row) => (
                <Keep
                  key={row.keep.id}
                  keep={row.keep}
                  strands={strands}
                  onMenu={onMenu}
                  onMotif={onMotif}
                />
              ))}
            </section>
          ))}
        </div>
      ) : (
        <p className={styles.absent}>
          {keeps.length
            ? 'Nothing here matches that. Change what you are looking for, or show everything again.'
            : 'This page fills up with the first thing you keep.'}
        </p>
      )}
    </>
  )
}

export default Ledger
