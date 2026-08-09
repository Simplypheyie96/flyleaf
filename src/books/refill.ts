/* THE COVERS AN IMPORTED BOOK ARRIVED WITHOUT.

   A book added by hand goes through the search, so it comes with its jackets
   attached. A book brought in from another app's export does not: `adopt` can
   only read what is in the file, and the files carry titles, authors and dates
   — not cover URLs. It shelved every one of them with `covers: []`, and
   nothing ever went back to look. The owner hit this exactly: Destiny's Edge
   came in from a JSON file with no cover, and searching for the same book by
   hand a minute later produced the real one. Two paths to the same shelf, one
   of which never asked.

   The project brief is unambiguous about this — "There must NEVER be a
   coverless book when a real cover exists anywhere" — so this is the pass that
   goes back and asks, using the same `searchBooks` the add sheet uses. There
   is no second cover pipeline here and there must never be one.

   RETROACTIVE ON PURPOSE. It sweeps the whole shelf, not just what was
   imported in this session, because the books that need it most are already
   sitting there wearing a drawn cover from an import that happened weeks ago.
   Run once per launch, quietly, and it costs nothing on a shelf where every
   book already has a jacket: the query below is over an index and matches no
   rows.

   WHAT IT WILL NOT TOUCH:
   - A book with covers already. It is not a re-ranker.
   - A book whose reader chose `DRAWN`. That is an answer, not a gap, and
     overwriting it would take away a choice they made on purpose.
   - Anything, if the catalogues do not answer. A search that comes back empty
     leaves the row exactly as it was, so the next launch tries again rather
     than recording "there is no cover" as a fact. */

import { searchBooks } from './sources'
import { DRAWN } from './covers'
import db from '../data/db'
import type { Book } from '../data/db'

/** How many books one pass will look up. A shelf of eighty imported books
    should not fire eighty searches at three catalogues the moment the app
    opens — it would be slow, rude to the free services carrying it, and the
    fastest way to get rate-limited into finding nothing. The rest are picked
    up on the next launch. */
const PER_PASS = 12

/** Between lookups. Three catalogues per book, spaced enough that a shelf
    being repaired never looks like a scraper. */
const BREATH_MS = 1200

let ran = false

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

/** Is this the same book, or just something with a similar name?

    `seedFrom(title, author)` is how both `adopt` and `searchBooks` mint an id,
    so an exact identity match is free and certain. Failing that we compare the
    titles directly, because the catalogues disagree constantly about authors
    ("M.L. Wang", "ML Wang", "Wang, M. L.") and would fail an honest match on
    punctuation alone. A wrong cover is worse than no cover, so the title has
    to match outright — no prefixes, no fuzz. */
function same(book: Book, result: { id: number; title: string }) {
  if (result.id === book.id) return true
  const plain = (words: string) =>
    words.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  return plain(result.title) === plain(book.title)
}

async function fill(book: Book): Promise<boolean> {
  /* Title and author, which is what the reader would have typed. Author
     included because a bare title is how "Conform" ended up nowhere in nine
     thousand matches — see the note at the top of sources.ts. */
  const { results } = await searchBooks(`${book.title} ${book.author}`.trim())
  let hit = results.find((result) => same(book, result) && result.covers.length)

  /* Nothing under both. Catalogue author strings differ from the exporting
     app's often enough that this second try is not a long shot — it is the
     common case for self-published fiction. */
  if (!hit) {
    const { results: bare } = await searchBooks(book.title)
    hit = bare.find((result) => same(book, result) && result.covers.length)
  }
  if (!hit) return false

  await db.books.update(book.id, { covers: hit.covers, editedAt: Date.now() })
  return true
}

/** Go and get the jackets for every book that arrived without one.

    Never throws: a shelf repair failing is not something to interrupt a reader
    over, and every book it cannot answer for still has a drawn cover to wear
    in the meantime. Returns how many it managed, for the callers that care. */
export async function fillMissingCovers(): Promise<number> {
  // Once per launch. Two callers asking at the same moment is the normal
  // case — a route mounting while an import finishes — and neither of them
  // should cause the same searches to run twice.
  if (ran) return 0
  ran = true

  let filled = 0
  try {
    const bare = await db.books
      .filter((book) => book.covers.length === 0 && book.coverPick !== DRAWN)
      .limit(PER_PASS)
      .toArray()

    for (const [index, book] of bare.entries()) {
      if (index) await wait(BREATH_MS)
      try {
        if (await fill(book)) filled += 1
      } catch {
        /* One book's lookup failed — no signal, a 429, a catalogue down. The
           row is untouched, so the next launch asks again. */
      }
    }
  } catch {
    /* The database itself was unavailable. Nothing to repair, nothing said. */
  }
  return filled
}

/** Let a fresh import be swept even though a pass already ran this launch —
    the whole point being that the books it just shelved are the coverless
    ones. Called after a restore, not by the reader. */
export function allowAnotherPass() {
  ran = false
}
