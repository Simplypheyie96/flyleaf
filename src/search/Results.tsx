import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import PaperSurface from '../components/PaperSurface'
import Vignette from '../brand/Vignette'
import BookCover from '../components/BookCover'
import { coversOf } from '../books/covers'
import db, { type Book } from '../data/db'
import { KIND, KINDS } from '../journey/kinds'
import { excerptAround, terms, type Archive, type Found } from './archive'
import styles from './search.module.css'

/* What the archive gives back, laid out.

   GROUPED, NOT RANKED. A flat relevance list is the right answer when the
   searcher does not know what they are looking for; a reader searching their
   own archive nearly always does — they want the quote, or they want the
   picture — so the type is the first cut and the group headings carry each
   kind's own colour and glyph, exactly as the journey's filter rail does.
   Books come first because a book is a place to go, and the rest is a list of
   things to look at.

   EVERY ROW GOES SOMEWHERE. Tapping a keep lands on that keep in its book's
   journey, not merely on the book — the hash is what BookJourney scrolls to
   and lights briefly.

   AND THE GROUPS CAN BE SIFTED. Grouping alone stops being enough the moment a
   common word hits forty keeps across six kinds: the reader still has to scroll
   past five headings to reach the pictures. The rail below the query narrows to
   one kind, across every book at once, which is the one thing the shelf's own
   filters cannot do — they filter books.

   It is deliberately not a permanent control. It is drawn from the results
   themselves, so it only ever offers kinds that are actually there, it never
   appears when there is nothing to sift, and it leaves with the results. There
   is no fourth Library view and no new destination behind it. */

interface ResultsProps {
  archive: Archive
  query: string
  /** The reader wants a book that is not theirs yet. */
  onFindBook: () => void
}

/** One picture, fetched only for the rows that are on screen asking for it.

    The archive scan deliberately drops every blob; a photograph in a result
    list is worth one extra read of one row, and only for the pictures. */
function Thumb({ id }: { id: number }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    let made = ''
    void db.entries.get(id).then((entry) => {
      if (!live || !entry?.media) return
      made = URL.createObjectURL(entry.media)
      setUrl(made)
    })
    return () => {
      live = false
      if (made) URL.revokeObjectURL(made)
    }
  }, [id])

  if (!url) return <span className={styles.thumbEmpty} aria-hidden />
  return <img src={url} alt="" className={styles.thumb} />
}

/** The voice row's mark: the orb, small and still, over four bars of a
    waveform. A playing orb belongs to the journey; here it is a label. */
function VoiceMark() {
  return (
    <span className={styles.voiceMark} aria-hidden>
      <span className={styles.orb} />
      <span className={styles.wave}>
        {[0.45, 1, 0.7, 0.3].map((h, i) => (
          <i key={i} style={{ '--h': h } as CSSProperties} />
        ))}
      </span>
    </span>
  )
}

function day(iso: string) {
  const at = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(at.getTime())) return iso
  return at.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function KeepRow({ keep, book, words }: { keep: Found; book?: Book; words: string[] }) {
  const kind = KIND[keep.type]
  const line = keep.text ? excerptAround(keep.text, words) : ''
  const where = [keep.chapter, keep.page ? `p. ${keep.page}` : null, keep.percent ? `${keep.percent}%` : null].filter(Boolean).join(' · ')

  return (
    <li>
      <Link
        to={`/book/${keep.bookId}#keep-${keep.id}`}
        className={styles.row}
        style={{ '--kind': `var(${kind.hue})` } as CSSProperties}
      >
        <span className={styles.mark}>
          {keep.type === 'image' && keep.hasMedia ? (
            <Thumb id={keep.id} />
          ) : keep.type === 'voice' ? (
            <VoiceMark />
          ) : (
            <kind.Icon size={18} />
          )}
        </span>

        <span className={styles.rowBody}>
          {keep.name && <span className={styles.rowName}>{keep.name}</span>}
          {line && <span className={styles.rowText}>{line}</span>}
          {!line && !keep.name && (
            <span className={styles.rowText}>{kind.one} kept on {day(keep.keptOn)}</span>
          )}
          <span className={styles.rowMeta}>
            {book ? book.title : 'a book you removed'}
            {where && ` · ${where}`}
            {` · ${day(keep.keptOn)}`}
          </span>
        </span>
      </Link>
    </li>
  )
}

function Results({ archive, query, onFindBook }: ResultsProps) {
  const words = terms(query)
  const [shelf, setShelf] = useState<Record<number, Book>>({})

  /* The book behind every result, for the line under it. One read of the
     books table, which is small and carries no media. */
  useEffect(() => {
    let live = true
    void db.books.toArray().then((books) => {
      if (!live) return
      setShelf(Object.fromEntries(books.map((book) => [book.id, book])))
    })
    return () => {
      live = false
    }
  }, [])

  const byKind = KINDS.map((type) => ({
    type,
    keeps: archive.keeps.filter((keep) => keep.type === type),
  })).filter((group) => group.keeps.length > 0)

  const nothing = archive.books.length === 0 && archive.keeps.length === 0

  /* Which kind the rail is narrowed to, or null for all of them.
     'books' is a member of the same axis rather than a special case: to the
     reader the shelf hits are one more sort of thing the word turned up.

     Held here and not lifted, and NOT reset by an effect. A new query rebuilds
     `byKind`, and the guard below simply drops a choice the new results cannot
     honour — so typing another word always lands on everything, without a
     render that shows the stale filter first. */
  const [only, setOnly] = useState<string | null>(null)
  const offered = [
    ...(archive.books.length > 0
      ? [{ id: 'books', label: archive.books.length === 1 ? 'Book' : 'Books', tally: archive.books.length, hue: '' }]
      : []),
    ...byKind.map(({ type, keeps }) => ({
      id: type,
      label: KIND[type].label,
      tally: keeps.length,
      hue: KIND[type].hue,
    })),
  ]
  /* One kind is not a choice, it is a label — and a rail of one chip is chrome
     charging rent. The whole control stays away until there is something to
     narrow. */
  const siftable = offered.length > 1
  const picked = siftable && offered.some((one) => one.id === only) ? only : null

  return (
    <div className={styles.results}>
      {/* What is being searched, said once and quietly. This was a pill in a
          segmented control that could not be deselected — a label pretending
          to be a choice. As a line of type it does the same job, tells no lie
          about being tappable, and gives back a whole row of the phone. */}
      {!nothing && <p className={styles.scope}>Everything you kept</p>}

      {archive.loose && !nothing && (
        <p className={styles.approx}>Nothing said that exactly. The nearest things you have kept:</p>
      )}

      {siftable && (
        <div className={styles.sift} role="group" aria-label="Narrow these results to one kind">
          <button
            type="button"
            className={styles.sieve}
            aria-pressed={picked === null}
            onClick={() => setOnly(null)}
          >
            {/* "All", not "Everything". The scope row directly above this one
                already reads "Everything you kept", and two stacked pill rows
                whose first pill says almost the same word is the sort of thing
                a reader has to stop and parse. */}
            All
          </button>
          {offered.map((one) => (
            <button
              key={one.id}
              type="button"
              className={styles.sieve}
              data-hue={one.hue ? '' : undefined}
              style={one.hue ? ({ '--kind': `var(${one.hue})` } as CSSProperties) : undefined}
              aria-pressed={picked === one.id}
              onClick={() => setOnly(picked === one.id ? null : one.id)}
            >
              {one.label}
              <span className={styles.sieveTally}>{one.tally}</span>
            </button>
          ))}
        </div>
      )}

      {archive.books.length > 0 && (picked === null || picked === 'books') && (
        <section className={styles.group}>
          <h2 className={styles.groupTitle}>
            <span className={styles.groupCount}>{archive.books.length}</span>
            {archive.books.length === 1 ? 'Book' : 'Books'}
          </h2>
          <ul className={styles.list}>
            {archive.books.map((book) => (
              <li key={book.id}>
                <Link to={`/book/${book.id}`} className={styles.row}>
                  <span className={styles.coverMark}>
                    <BookCover title={book.title} author={book.author} covers={coversOf(book)} width={44} />
                  </span>
                  <span className={styles.rowBody}>
                    <span className={styles.rowName}>{book.title}</span>
                    <span className={styles.rowMeta}>{book.author}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {byKind
        .filter(({ type }) => picked === null || picked === type)
        .map(({ type, keeps }) => (
          <section
            key={type}
            className={styles.group}
            style={{ '--kind': `var(${KIND[type].hue})` } as CSSProperties}
          >
            <h2 className={styles.groupTitle} data-kind="">
              <span className={styles.groupCount}>{keeps.length}</span>
              {KIND[type].label}
            </h2>
            <ul className={styles.list}>
              {keeps.map((keep) => (
                <KeepRow key={keep.id} keep={keep} book={shelf[keep.bookId]} words={words} />
              ))}
            </ul>
          </section>
        ))}

      {nothing && (
        <PaperSurface className={styles.blank}>
          {/* A drawing rather than a shrug. The pile is what was looked
              through; the leaf-shaped loupe over it is the same silhouette as
              the mark, doing a different job. */}
          <Vignette scene="search" className={styles.blankArt} />
          <p className={styles.blankLine}>
            Nothing you have kept says “{query}”.
          </p>
          <p className={styles.blankHint}>
            It may be a book you have not added yet — look for it in the
            catalogue and its cover will be waiting.
          </p>
          <button type="button" className={styles.blankAct} onClick={onFindBook}>
            Find “{query}” in the catalogue
          </button>
        </PaperSurface>
      )}
    </div>
  )
}

export default Results
