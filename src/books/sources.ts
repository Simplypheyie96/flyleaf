/* Finding a book.

   Three public catalogues, queried together and merged, in this order of
   trust: OPEN LIBRARY first, because its records are richer for older and
   non-English editions and it is the only one that knows a book's *first*
   publication year. APPLE BOOKS second, because it is where the last ten
   years of trade and self-published fiction actually live, and because its
   relevance ranking is far better than Open Library's on a bare title.
   GOOGLE BOOKS third — see the quota note below; treat it as a source that
   is usually simply absent. None is asked to be authoritative — a search
   result only has to be recognisable enough for the reader to point at the
   right book. What we keep afterwards is ours.

   Apple was added after two failures the owner hit on the same book, which
   turned out to be one failure wearing two hats. Searching "conform" put
   Ariel Sullivan's novel nowhere in Open Library's 9,100 fuzzy matches —
   Conformal mapping, A Conformable Wife — and it surfaced only once the
   author narrowed the query to a single hit. And its Open Library record
   carries no cover at all: all six ISBNs and all four edition IDs 404 on the
   cover server, so the fall-through below was walking a list with nothing at
   the end of it. Google, the source meant to catch exactly that, was 429ing.
   Apple answers both: it ranks that book first for the bare word "conform",
   and it has the jacket.

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

   Nothing here may ever be load-bearing. Every source is allowed to be down,
   rate-limited, or wrong; the reader can always type the book in by hand, and
   a book with no cover anywhere still gets one. */

import { seedFrom } from './seed'
import { cleanCovers } from './covers'

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

  const [open, apple, google] = await Promise.all([
    orNothing(searchOpenLibrary(q, isbn, signal)),
    orNothing(searchAppleBooks(q, isbn, signal)),
    orNothing(searchGoogleBooks(q, isbn, signal)),
  ])

  const answered = [open, apple, google].filter((list) => list !== null).length
  /* Order is the trust order, because `merge` lets the first source to claim a
     field keep it. Open Library's year is a first-publication year; Apple's is
     the day an ebook went on sale, which for Things Fall Apart is 1992. */
  const results = lendCovers(merge(q, open ?? [], apple ?? [], google ?? [])).slice(0, TOTAL)
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
  const isbns = (doc.isbn ?? []).slice(0, 2)
  const urls = [
    doc.cover_i && coverUrl('id', doc.cover_i),
    doc.cover_edition_key && coverUrl('olid', doc.cover_edition_key),
    ...isbns.map((isbn) => coverUrl('isbn', isbn)),
    /* Amazon last: Open Library's art is cleaner when it exists, but for an
       Amazon-imprint book (Lake Union, Montlake, 47North…) it is the only
       host that answers at all — those books are never sold on Apple Books
       and sit in Open Library with no cover. See amazonCover for why a miss
       here needs BookCover's own guard rather than an onError. */
    ...isbns.map((isbn) => isbn10Of(isbn)).filter((ten): ten is string => Boolean(ten))
      .slice(0, 1)
      .map(amazonCover),
  ]
  return cleanCovers(urls.filter((url): url is string => typeof url === 'string'))
}

/* Amazon's static cover host. No API, no key, no quota — addressed by ISBN-10
   ONLY: a 13 answers the miss shape even for a book it holds. The catch is
   that a miss is not a 404 but a 200 carrying a 43-byte 1×1 GIF (measured),
   which decodes without error — so an <img> onError never fires for it, and
   BookCover rejects it by its dimensions instead. */
function amazonCover(isbn10: string) {
  return `https://images-na.ssl-images-amazon.com/images/P/${encodeURIComponent(isbn10)}.01.LZZ.jpg`
}

/* The 10-digit form of an ISBN, which is the only key Amazon's host takes.
   A 978-prefixed 13 converts (drop the prefix, recompute the check digit);
   a 979 book has no 10-digit form at all. */
function isbn10Of(isbn: string): string | undefined {
  const n = isbn.replace(/[^0-9Xx]/g, '')
  if (n.length === 10) return n.toUpperCase()
  if (n.length !== 13 || !n.startsWith('978')) return undefined
  const core = n.slice(3, 12)
  let sum = 0
  for (let i = 0; i < 9; i++) sum += (10 - i) * Number(core[i])
  const check = (11 - (sum % 11)) % 11
  return core + (check === 10 ? 'X' : String(check))
}

/* `default=false` is the important part: without it a missing cover returns a
   grey placeholder image with a 200, which we would happily print on the
   board. With it the request 404s, the <img> errors, and the book falls
   through to the next candidate and finally to a drawn cover — which is the
   behaviour we actually want. */
/* `L` rather than `M` because of where these end up. `M` is 180px across, and
   the Stack board draws a cover at up to 210 CSS pixels — so on the phones this
   is built for the jacket was being blown up rather than sampled down, and it
   went soft exactly where the reader looks at it longest. `L` caps the long
   edge at 500px, which is 337 across on a normal 2:3 jacket: still short of a
   3x board, but comfortably over it at 1.5x and no longer upscaling anywhere.

   Same free Open Library endpoint, same `default=false` behaviour — checked
   both sizes against a cover that exists and one that does not, and `L` answers
   200 and 404 in exactly the places `M` does, so the fall-through below is
   untouched. The cost is about 2.4x the bytes, once, on a book being added. */
function coverUrl(kind: 'id' | 'olid' | 'isbn', key: string | number) {
  return `https://covers.openlibrary.org/b/${kind}/${key}-L.jpg?default=false`
}

/* ---- Apple Books ----

   The iTunes Search API, which is what Apple Books is searchable through. No
   key, no quota to share with strangers, and `access-control-allow-origin: *`,
   so it is callable straight from the page like the other two.

   `country` is stated rather than left to Apple's IP guess: the US storefront
   is the widest ebook catalogue, and a reader in Lagos searching for a British
   novel should get the same answer as a reader in London. It selects a
   catalogue to search, not a price to show — nothing here is for sale.

   No page count in these records, and the year is the ebook's release date
   rather than the book's. Both are left to Open Library, which is why Apple
   sits second in the merge. */

async function searchAppleBooks(q: string, isbn: string | undefined, signal?: AbortSignal) {
  const url = new URL('https://itunes.apple.com/search')
  /* There is no ISBN field to query. A bare number as the search term does
     find some books — it is in the indexed text of the record — and finds
     nothing for others, which is the correct answer either way. */
  url.searchParams.set('term', isbn ?? q)
  url.searchParams.set('media', 'ebook')
  url.searchParams.set('country', 'US')
  url.searchParams.set('limit', String(PER_SOURCE))

  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Apple Books ${res.status}`)
  /* Served as text/javascript — a leftover from the days this endpoint was
     called with a JSONP callback. The body is ordinary JSON; `res.json()`
     does not care what the content type claims. */
  const body = (await res.json()) as { results?: AppleBook[] }

  return (body.results ?? []).flatMap((book) => {
    if (!book.trackName || !book.artistName) return []
    const cover = appleCover(book.artworkUrl100)
    return [
      {
        id: seedFrom(book.trackName, book.artistName),
        title: book.trackName,
        author: book.artistName,
        year: Number(book.releaseDate?.slice(0, 4)) || undefined,
        covers: cover ? [cover] : [],
      },
    ]
  })
}

interface AppleBook {
  trackName?: string
  artistName?: string
  releaseDate?: string
  artworkUrl100?: string
}

/* Apple serves one artwork at whatever size the path asks for, so the 100px
   thumbnail in the record is really a template. 600 to match Open Library's
   `-L`, which caps its long edge at 500 — both land comfortably above the
   210px the board draws a jacket at, on a 2x phone.

   `bb` fits the long edge inside the box rather than padding to a square:
   measured, 600x600bb returns 400x600 on a normal 2:3 jacket, so this is a
   cover and not a cover in a frame. */
function appleCover(artwork?: string) {
  if (!artwork) return undefined
  return artwork.replace(/\/100x100bb\.jpg$/, '/600x600bb.jpg')
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

/* The same book arrives from several sources spelled differently — curly
   versus straight apostrophes, accents, a stray double space. seedFrom already
   normalises all of that to give a book one stable cover, so reusing it here
   means two records merge on exactly the condition under which they would
   have drawn the same cover anyway. One identity, used for both jobs.

   TWO SEPARATE QUESTIONS, and running them together is what made this wrong
   the first time. Which record's *fields* win is a question about trust, and
   the answer is the source order — Open Library's first-publication year beats
   Apple's ebook release date. What order the results are *shown* in is a
   question about relevance, and the source order is a terrible answer to it.

   Concatenating meant every one of Open Library's twelve results came before
   Apple's first. So a reader searching "conform" got Conformal mapping,
   Conformity and conflict and A Conformable Wife — Open Library's fuzzy
   matches against 9,100 records — while the book they meant sat at position
   thirteen, because Apple had ranked it first and Apple went second. That is
   the exact failure the owner reported: the book only appeared once she added
   the author, which narrowed Open Library to a single hit.

   So results are interleaved by RANK instead: every source's best result, then
   every source's second, and so on. A book that two catalogues both rank
   highly rises above one that only Open Library liked, and the source order
   survives only as the tie-break between records at equal rank. */
function merge(query: string, ...lists: BookResult[][]) {
  const typed = stem(query)
  const byId = new Map<number, BookResult>()
  /* Where to show it: best rank any source gave it, and which source that
     was. Only ever improved, never worsened, by a later source. */
  const place = new Map<number, [rank: number, source: number]>()

  lists.forEach((list, source) => {
    list.forEach((book, rank) => {
      const standing = place.get(book.id)
      if (!standing || rank < standing[0]) place.set(book.id, [rank, source])

      const seen = byId.get(book.id)
      if (!seen) {
        byId.set(book.id, book)
        return
      }
      // First source wins on the fields it has; later ones fill the gaps and
      // add their covers as further things to try if the first URL fails.
      seen.year ??= book.year
      seen.pages ??= book.pages
      for (const url of book.covers) {
        if (!seen.covers.includes(url)) seen.covers.push(url)
      }
    })
  })

  return [...byId.values()].sort((a, b) => {
    const [rankA, sourceA] = place.get(a.id) ?? [Infinity, Infinity]
    const [rankB, sourceB] = place.get(b.id) ?? [Infinity, Infinity]
    return match(a, typed) - match(b, typed) || rankA - rankB || sourceA - sourceB
  })
}

/* Ahead of rank, because it is a stronger signal than either catalogue's own.
   Somebody who types a whole title has told us the title; a source that ranks
   its own loose match above it is simply wrong, and both of them do. Open
   Library leads "the salt path" with the Dutch translation, Het zoutpad, and
   leads "conform" with Conformity and conflict.

   Three tiers only, and no scoring beyond them. Exact is what they typed.
   Starts-with catches the subtitle a catalogue has glued on. Everything else
   keeps the order its source gave it, which is the right default — this is a
   correction to relevance ranking, not a replacement for one. An author-name
   query matches no title, lands entirely in the last tier, and is left
   untouched. */
function match(book: BookResult, typed: string) {
  if (!typed) return 2
  const title = stem(book.title)
  if (title === typed) return 0
  return title.startsWith(typed) ? 1 : 2
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
/* A title reduced to the part a reader would say out loud. Shared by the
   loose match below and by the relevance tiers above, so "The Salt Path", the
   query "salt path" and "Salt Path: A Memoir" are all one string. */
function stem(title: string) {
  return (
    title
      .toLowerCase()
      // "Quiet: The Power of Introverts" and "Quiet" are the same book to a
      // reader; so are a title and its parenthesised series note.
      .split(/[:(]/)[0]
      .replace(/^(the|a|an)\s+/, '')
      .replace(/[^a-z0-9]+/g, '')
  )
}

function looseKey(title: string, author: string) {
  const key = stem(title)
  // Catalogues disagree constantly about initials and middle names, and agree
  // about surnames.
  const surname =
    author.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/).pop() ?? ''
  return `${key}|${surname}`
}

function lendCovers(results: BookResult[]) {
  const lenders = new Map<string, string[]>()
  for (const book of results) {
    book.covers = cleanCovers(book.covers)
    if (!book.covers.length) continue
    const key = looseKey(book.title, book.author)
    // First one wins: results arrive in relevance order, so the earliest
    // match is the closest edition.
    if (!lenders.has(key)) lenders.set(key, book.covers)
  }

  for (const book of results) {
    const lent = lenders.get(looseKey(book.title, book.author))
    if (!lent) continue
    book.covers = cleanCovers([...book.covers, ...lent])
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
