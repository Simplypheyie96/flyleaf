/* THE FLYLEAF — the home screen as the page the app is named after.

   A flyleaf is the blank leaf at the front of a book, and for four hundred
   years it is where the person holding the book wrote in it: their name, the
   date, who gave it to them, what they thought of it. That is the whole
   premise of this app, and no screen in it has ever actually been one.

   So this direction is the least clever of the three on purpose. It is one
   blank page, ruled, with a pen already on the first line and the book's name
   printed small at the head — and under it, the leaves that have already been
   written on, stacked the way the front matter of a book stacks. Nothing is
   arranged, nothing is dealt into columns, nothing is turned face up. You open
   the app and you are looking at somewhere to write.

   Two things follow from that, and they are the reason this is a candidate
   rather than a nicer empty state:

     · The first run and the hundredth are the SAME OBJECT. Every other home
       screen this app has had was two designs — a welcome, then a feed — so
       the first thing a reader learned was that the screen they were looking
       at was about to be replaced. Here the blank page is the product. On day
       one the stack under it is empty; on day one hundred it is thick. The
       page itself never changes.

     · It puts the writing surface above the fold instead of behind a button.
       The keep sheet is two taps away from every other direction. Here the
       first line of it is on the home screen, in the hand, waiting.

   The cost is that it says nothing about what is IN the book — no cast, no
   places, no open questions. It is a place to write, not a world. That is the
   trade being offered.

   Sample content until the entry store lands. Invented, as everything in
   `data/sample.ts` is. */

import { Link } from 'react-router-dom'
import PaperSurface from '../../components/PaperSurface'
import LeafButton from '../../components/LeafButton'
import { KIND } from '../../journey/kinds'
import type { EntryType } from '../../data/db'
import { count } from '../../journey/lexicon'
import styles from './Flyleaf.module.css'

const BOOK = {
  id: '111111',
  title: 'The Lantern Season',
  author: 'A. Winters',
  page: 214,
  pages: 502,
}

/** A leaf already written on. `when` is what a reader would say, not a date. */
interface Leaf {
  type: EntryType
  text: string
  when: string
}

const WRITTEN: Leaf[] = [
  {
    type: 'quote',
    text: 'The lamp was lit every night of that winter, and no one ever admitted to lighting it.',
    when: 'last night',
  },
  { type: 'thread', text: 'The signature in the log is not hers.', when: 'Tuesday' },
  { type: 'note', text: 'Bel counts the boats twice. Once out, once back.', when: 'last week' },
]

/* ── The page ──────────────────────────────────────────────────────────────

   Ruled, tilted a fraction, taped at the head. The rules are drawn in CSS
   rather than being a row of empty elements, because they are the paper and
   not the content — a screen reader has no business being told there are nine
   horizontal lines. */

function Page({ empty }: { empty: boolean }) {
  return (
    <PaperSurface taped rotate={-0.6} className={styles.page}>
      <p className={styles.imprint}>
        {empty ? (
          'Your flyleaf'
        ) : (
          <>
            {BOOK.title}
            <span className={styles.sep} aria-hidden="true">·</span>
            {BOOK.author}
          </>
        )}
      </p>

      {/* The written line sits ON the first rule rather than above the ruled
          block, which is the whole illusion: ink on a line, not a label over a
          texture. Everything under it is blank paper waiting. */}
      <div className={styles.ruled}>
        <p className={styles.hand}>
          {empty
            ? 'the first thing you don’t want to forget…'
            : 'what you don’t want to forget about page 214…'}
        </p>
      </div>

      <div className={styles.nib}>
        <LeafButton
          onClick={() =>
            window.dispatchEvent(new CustomEvent('flyleaf-find-book', { detail: '' }))
          }
        >
          {empty ? '+ Add a book' : 'Write it down'}
        </LeafButton>
      </div>
    </PaperSurface>
  )
}

/* ── The stack ─────────────────────────────────────────────────────────────

   What has already been written, drawn as the leaves it is: each one sits a
   little lower and a little further in than the one above it, so the pile has
   a fore-edge. Only the top leaf is fully read; the ones under it show their
   first line and their edge, which is exactly as much as a stack of paper
   shows you before you lift it. */

function Stack() {
  return (
    <section aria-labelledby="flyleaf-written" className={styles.stack}>
      <h2 id="flyleaf-written" className={styles.stackLabel}>
        Already written
      </h2>
      <ul className={styles.leaves}>
        {WRITTEN.map((leaf, i) => {
          const kind = KIND[leaf.type]
          return (
            <PaperSurface
              as="li"
              key={leaf.text}
              tone={kind.tone}
              rotate={i % 2 === 0 ? 0.7 : -0.9}
              className={styles.leaf}
              style={{ '--edge': `var(${kind.hue})` } as never}
            >
              <Link to={`/book/${BOOK.id}`} className={styles.leafLink}>
                <span className={styles.leafMark} aria-hidden="true">
                  <kind.Icon size={15} />
                </span>
                <span className={styles.leafText}>{leaf.text}</span>
                <span className={styles.leafWhen}>{leaf.when}</span>
              </Link>
            </PaperSurface>
          )
        })}
      </ul>
    </section>
  )
}

/* The empty stack is one leaf with nothing on it — not a message where the
   pile will be. A reader who has just arrived should see the shape of what
   they are about to make, and an outline of a page says that in no words. */
function Unwritten() {
  return (
    <section aria-labelledby="flyleaf-written" className={styles.stack}>
      <h2 id="flyleaf-written" className={styles.stackLabel}>
        Already written
      </h2>
      <p className={styles.blank}>Nothing on this one yet.</p>
    </section>
  )
}

function Flyleaf({ empty }: { empty: boolean }) {
  return (
    <div className={styles.flyleaf}>
      <Page empty={empty} />
      {empty ? <Unwritten /> : <Stack />}
      {!empty && (
        <p className={styles.foot}>
          {count(WRITTEN.length, { one: 'leaf', many: 'leaves' })} in this book
          <span className={styles.sep} aria-hidden="true">·</span>
          <Link to="/library" className={styles.footLink}>
            your other books
          </Link>
        </p>
      )}
    </div>
  )
}

export default Flyleaf
