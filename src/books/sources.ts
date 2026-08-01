/* Finding a book.

   Two public catalogues, queried together and merged: Open Library first
   because its records are richer for older and non-English editions, Google
   Books second because it is better on recent trade paperbacks and on
   anything self-published. Neither is asked to be authoritative — a search
   result only has to be recognisable enough for the reader to point at the
   right book. What we keep afterwards is ours.

   Both are called straight from the browser rather than through a function of
   ours: no server to run and no key to hold or rotate, and search keeps
   working from a preview build, a fork, or localhost with nothing configured.

   That has one cost, and it is worth stating plainly rather than discovering
   again. Keyless Google Books requests are billed to a single anonymous
   Google project shared by everyone on the internet who calls it without a
   key, so it answers `429 Quota exceeded … for consumer
   'project_number:624717413613'` for long stretches — not because of anything
   this reader did, and not something a different IP fixes. Treat Google as a
   bonus that is often simply absent. Open Library has no such pool and is the
   source that has to carry the search, which is why it is asked for every
   cover identifier it holds rather than just the obvious one.

   Nothing here may ever be load-bearing. Both sources are allowed to be down,
   rate-limited, or wrong; the reader can always type the book in by hand, and
   a book with no cover anywhere still gets one. */

import { seedFrom } from './seed'

export interface BookResult {
  /** The book's identity: dedupe key, React key, and the cover's seed. */
  id: number
  title: string
  author: string
  year?: number
  pages?: number
  /** Cover URLs to try in order. Empty is normal, and not a failure. */
  covers: string[]
}

/** Per source. Deep results are noise — nobody scrolls a book search. */
const PER_SOURCE = 12
const TOTAL = 20

export interface SearchOutcome {
  results: BookResult[]
  /* How many of the catalogues actually answered.
     Zero and nothing found are two different sentences to say to a reader. One
     means the book is not in these catalogues under that spelling; the other
     means the search never happened — no signal, a blocking network, both
     services down at once. Telling someone on a train that their book "may be
     out of print" is a small lie, and it sends them off to check the spelling
     of a title that was never looked up. */
  answered: number
}

export async function searchBooks(
  query: string,
  signal?: AbortSignal,
): Promise<SearchOutcome> {
  const q = query.trim()
  if (q.length < 2) return { results: [], answered: 0 }

  // Decided once, here, so both catalogues are asked the same question in
  // whichever dialect each one speaks.
  const isbn = asIsbn(q)

  const [open, google] = await Promise.all([
    orNothing(searchOpenLibrary(q, isbn, signal)),
    orNothing(searchGoogleBooks(q, isbn, signal)),
  ])

  const answered = [open, google].filter((list) => list !== null).length
  const results = lendCovers(merge(open ?? [], google ?? [])).slice(0, TOTAL)
  return { results, answered }
}

/* ---- ISBN ----

   Someone holding the book can read the number off the back of it, which is
   the one search term that is never misspelled and never ambiguous between two
   books with the same title.

   A bare ISBN typed into a plain keyword search does already find the book in
   Open Library, by coincidence rather than by design: the number appears in
   the indexed text. Asking the ISBN field directly is the same request and one
   round trip either way, and it cannot drift into matching a page number or a
   year in some unrelated record.

   Detection is on shape, not on the check digit. A mistyped digit should come
   back as "no such book" from the catalogue rather than be quietly re-run as a
   title search, because a thirteen-digit string is not a title and searching
   for it as one only produces confident nonsense. Requiring the 978/979 prefix
   on the long form is what keeps an arbitrary run of thirteen digits from
   being treated as a book number at all. */
function asIsbn(query: string) {
  // Hyphens are how ISBNs are printed; spaces are how they get typed.
  const bare = query.replace(/[\s-‐-―]/g, '').toUpperCase()
  if (/^\d{9}[\dX]$/.test(bare)) return bare
  if (/^97[89]\d{10}$/.test(bare)) return bare
  return undefined
}

/* Only the number the reader typed is searched, and deliberately so.

   The obvious next move is to convert between the ten- and thirteen-digit
   forms and search both, since they name the same book. It was written, tried,
   and taken back out. It bought nothing: every book tested already resolves
   under either form, because Open Library files a work's editions together and
   the record therefore carries whichever numbers those editions were printed
   with. And it cost something real — converting a mistyped 9781111111111 lands
   on 1111111111, which is a placeholder number that genuinely sits on several
   junk records, so a search that should have said "nothing came back" returned
   four unrelated books instead. A wrong answer is worse than no answer here,
   because the reader has no way to tell it is wrong. */

/* ---- Open Library ---- */

async function searchOpenLibrary(q: string, isbn: string | undefined, signal?: AbortSignal) {
  // `fields` matters: the default response carries every edition of every
  // work and runs to megabytes on a common query.
  const url = new URL('https://openlibrary.org/search.json')
  /* `isbn:` is a field query, which is the point: a book number that matches
     nothing returns nothing rather than falling back to a loose text match on
     the digits, so a mistyped number is answered honestly instead of with
     whatever record happens to contain that string. */
  url.searchParams.set('q', isbn ? `isbn:${isbn}` : q)
  /* cover_edition_key and isbn are asked for because `cover_i` alone leaves a
     lot of books bare. `cover_i` is the cover of the *work*, and plenty of
     works have none while the specific edition Open Library considers primary
     does — that edition is cover_edition_key. ISBNs reach a third shelf again,
     which is where older and translated editions tend to be filed.

     They cost nothing extra: same request, same round trip, and each one is
     only ever a URL we hand to an <img> that is already prepared to fail. */
  url.searchParams.set(
    'fields',
    'title,author_name,first_publish_year,number_of_pages_median,cover_i,cover_edition_key,isbn',
  )
  url.searchParams.set('limit', String(PER_SOURCE))

  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Open Library ${res.status}`)
  const body = (await res.json()) as { docs?: OpenLibraryDoc[] }

  return (body.docs ?? []).flatMap((doc) => {
    const author = doc.author_name?.[0]
    if (!doc.title || !author) return []
    return [
      {
        id: seedFrom(doc.title, author),
        title: doc.title,
        author,
        year: doc.first_publish_year,
        pages: doc.number_of_pages_median,
        covers: openLibraryCovers(doc),
      },
    ]
  })
}

interface OpenLibraryDoc {
  title?: string
  author_name?: string[]
  first_publish_year?: number
  number_of_pages_median?: number
  cover_i?: number
  cover_edition_key?: string
  isbn?: string[]
}

/* Every route to a cover this record knows about, best first. BookCover walks
   the list and stops at the first that decodes, so a longer list only ever
   costs anything for a book that would otherwise have had no photograph at
   all — and a book that has none still gets its drawn cover at the end.

   Only two ISBNs. A work can list a hundred editions, and the ones past the
   first couple are book-club reissues and foreign printings whose jackets are
   not the book the reader pictured; each one is also another 404 to wait
   through before the drawn cover appears. */
function openLibraryCovers(doc: OpenLibraryDoc) {
  const urls = [
    doc.cover_i && coverUrl('id', doc.cover_i),
    doc.cover_edition_key && coverUrl('olid', doc.cover_edition_key),
    ...(doc.isbn ?? []).slice(0, 2).map((isbn) => coverUrl('isbn', isbn)),
  ]
  return [...new Set(urls.filter((url) => typeof url === 'string'))]
}

/* `default=false` is the important part: without it a missing cover returns a
   grey placeholder image with a 200, which we would happily print on the
   board. With it the request 404s, the <img> errors, and the book falls
   through to the next candidate and finally to a drawn cover — which is the
   behaviour we actually want. */
function coverUrl(kind: 'id' | 'olid' | 'isbn', key: string | number) {
  return `https://covers.openlibrary.org/b/${kind}/${key}-M.jpg?default=false`
}

/* ---- Google Books ---- */

async function searchGoogleBooks(q: string, isbn: string | undefined, signal?: AbortSignal) {
  const url = new URL('https://www.googleapis.com/books/v1/volumes')
  /* Google documents `isbn:` as the way to search by book number, and unlike
     Open Library a bare number here is not reliably the same query. Sent as
     the reader typed it, normalised: Google resolves the two forms to one
     volume itself, so there is nothing to pair up.

     Not verified against the live service. Keyless Google answered 429 to
     every call while this was written, as it usually does — see the note at
     the top of the file. Written to the documented syntax and left to prove
     itself on a day the quota is open, which is the same footing the rest of
     this source is on. */
  url.searchParams.set('q', isbn ? `isbn:${isbn}` : q)
  url.searchParams.set('maxResults', String(PER_SOURCE))
  url.searchParams.set('printType', 'books')
  url.searchParams.set('fields', 'items(volumeInfo(title,authors,publishedDate,pageCount,imageLinks))')

  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Google Books ${res.status}`)
  const body = (await res.json()) as { items?: { volumeInfo?: GoogleVolume }[] }

  return (body.items ?? []).flatMap(({ volumeInfo: v }) => {
    const author = v?.authors?.[0]
    if (!v?.title || !author) return []
    const cover = googleCover(v.imageLinks)
    return [
      {
        id: seedFrom(v.title, author),
        title: v.title,
        author,
        // publishedDate is anything from "2011" to "2011-06-14".
        year: Number(v.publishedDate?.slice(0, 4)) || undefined,
        pages: v.pageCount,
        covers: cover ? [cover] : [],
      },
    ]
  })
}

interface GoogleVolume {
  title?: string
  authors?: string[]
  publishedDate?: string
  pageCount?: number
  imageLinks?: Record<string, string>
}

function googleCover(links?: Record<string, string>) {
  const url = links?.thumbnail ?? links?.smallThumbnail
  if (!url) return undefined
  return (
    url
      // Served over http, which a secure page will not load at all.
      .replace(/^http:/, 'https:')
      // The default thumbnail is drawn with a curled page corner over it —
      // charming in 2009, and wrong on a board that already has its own edge.
      .replace(/&edge=curl/, '')
      // zoom=1 is ~128px wide and blurs on the smallest cover we render.
      .replace(/&zoom=\d/, '&zoom=2')
  )
}

/* ---- Merging ---- */

/* The same book arrives from both sources spelled differently — curly versus
   straight apostrophes, accents, a stray double space. seedFrom already
   normalises all of that to give a book one stable cover, so reusing it here
   means two records merge on exactly the condition under which they would
   have drawn the same cover anyway. One identity, used for both jobs. */
function merge(...lists: BookResult[][]) {
  const byId = new Map<number, BookResult>()

  for (const list of lists) {
    for (const book of list) {
      const seen = byId.get(book.id)
      if (!seen) {
        byId.set(book.id, book)
        continue
      }
      // First source wins on the fields it has; the second fills the gaps and
      // adds its cover as a second thing to try if the first URL fails.
      seen.year ??= book.year
      seen.pages ??= book.pages
      for (const url of book.covers) {
        if (!seen.covers.includes(url)) seen.covers.push(url)
      }
    }
  }

  return [...byId.values()]
}

/* ---- Lending covers between near-identical records ----

   A book arrives from one catalogue without a cover and from the other with
   one, under a title just different enough not to merge: Open Library files
   Raynor Winn's memoir as "Salt Path", Google Books as "The Salt Path". The
   strict key sees two books, and the reader gets a drawn cover for a book
   whose photograph we are already holding two rows down the same list.

   So after merging, every result is offered the covers of its looser match —
   leading article dropped, subtitle dropped, the author's last name only —
   appended after its own. The looseness is deliberate and safe here in a way
   it would not be for merging: the worst case is a different edition's jacket
   for the same book by the same author, and the reader is reading the title as
   well as looking at the board when they point at the right one. Merging those
   records instead would throw away a title the reader might have been
   searching for.

   Appended rather than only filled in when a record has nothing. Once Open
   Library started offering an OLID and ISBN route to a cover, "has no covers"
   stopped meaning "has no cover": a record can now carry three URLs that all
   404 and would have been passed over as already provided for. Sitting at the
   end of the list, a lent cover costs nothing until everything ahead of it has
   actually failed.

   Nothing extra is fetched — this only reuses URLs already in hand. */
function looseKey(title: string, author: string) {
  const stem = title
    .toLowerCase()
    // "Quiet: The Power of Introverts" and "Quiet" are the same book to a
    // reader; so are a title and its parenthesised series note.
    .split(/[:(]/)[0]
    .replace(/^(the|a|an)\s+/, '')
    .replace(/[^a-z0-9]+/g, '')
  // Catalogues disagree constantly about initials and middle names, and agree
  // about surnames.
  const surname =
    author.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/).pop() ?? ''
  return `${stem}|${surname}`
}

function lendCovers(results: BookResult[]) {
  const lenders = new Map<string, string[]>()
  for (const book of results) {
    if (!book.covers.length) continue
    const key = looseKey(book.title, book.author)
    // First one wins: results arrive in relevance order, so the earliest
    // match is the closest edition.
    if (!lenders.has(key)) lenders.set(key, book.covers)
  }

  for (const book of results) {
    const lent = lenders.get(looseKey(book.title, book.author))
    if (!lent) continue
    for (const url of lent) {
      if (!book.covers.includes(url)) book.covers.push(url)
    }
  }

  return results
}

/* A source that fails contributes nothing, rather than failing the search —
   but it says so. `null` is a source that never answered; `[]` is a source that
   answered and holds no such book. Google returns the second constantly on its
   shared keyless quota, and the difference is the whole reason the caller can
   tell an empty shelf from a dead line. */
async function orNothing(work: Promise<BookResult[]>): Promise<BookResult[] | null> {
  try {
    return await work
  } catch {
    return null
  }
}
