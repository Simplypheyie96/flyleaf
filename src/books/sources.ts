/* Finding a book.

   Two public catalogues, queried together and merged: Open Library first
   because its records are richer for older and non-English editions, Google
   Books second because it is better on recent trade paperbacks and on
   anything self-published. Neither is asked to be authoritative — a search
   result only has to be recognisable enough for the reader to point at the
   right book. What we keep afterwards is ours.

   Both are called straight from the browser rather than through a function of
   ours. That is deliberate, and it is the whole cost story: no server to run,
   no key to hold or rotate, no shared project quota that a busy week could
   exhaust for everybody, and the rate limit that applies is the reader's own
   IP rather than a pool. It also means search keeps working from a preview
   build, a fork, or localhost with nothing configured.

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

export async function searchBooks(
  query: string,
  signal?: AbortSignal,
): Promise<BookResult[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const [open, google] = await Promise.all([
    orNothing(searchOpenLibrary(q, signal)),
    orNothing(searchGoogleBooks(q, signal)),
  ])

  return merge(open, google).slice(0, TOTAL)
}

/* ---- Open Library ---- */

async function searchOpenLibrary(q: string, signal?: AbortSignal) {
  // `fields` matters: the default response carries every edition of every
  // work and runs to megabytes on a common query.
  const url = new URL('https://openlibrary.org/search.json')
  url.searchParams.set('q', q)
  url.searchParams.set(
    'fields',
    'title,author_name,first_publish_year,number_of_pages_median,cover_i',
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
        covers: doc.cover_i ? [openLibraryCover(doc.cover_i)] : [],
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
}

/* `default=false` is the important part: without it a missing cover returns a
   grey placeholder image with a 200, which we would happily print on the
   board. With it the request 404s, the <img> errors, and the book falls
   through to a drawn cover — which is the behaviour we actually want. */
function openLibraryCover(id: number) {
  return `https://covers.openlibrary.org/b/id/${id}-M.jpg?default=false`
}

/* ---- Google Books ---- */

async function searchGoogleBooks(q: string, signal?: AbortSignal) {
  const url = new URL('https://www.googleapis.com/books/v1/volumes')
  url.searchParams.set('q', q)
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

/** A source that fails contributes nothing, rather than failing the search. */
async function orNothing(work: Promise<BookResult[]>): Promise<BookResult[]> {
  try {
    return await work
  } catch {
    return []
  }
}
