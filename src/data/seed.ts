/* ---- The demo shelf, and what is left of it ----

   Five invented books used to be laid down on every non-production build so a
   review link had something on its shelf. That is gone — see the sweep below,
   which is the only part of this file that still runs.

   The five identities remain because they have to: devices that were seeded
   are still carrying those rows, and some of them have pushed the rows into a
   reader's own Drive. Deleting this file would strand them there. */

import db, { type Book } from './db'
import { bookGrave } from './graves'

const PREVIEW_SHELF: Book[] = [
  {
    id: 366657726,
    title: 'The Salt Path',
    author: 'Raynor Winn',
    pages: 288,
    /* Somewhere in, so the journey header has a progress figure to show and
       is not reviewed with one of its three facts missing. Scaffolding, like
       the rest of this file. */
    pagesRead: 203,
    covers: [],
    formats: ['physical'],
    startedOn: '2019-03-14',
    addedAt: 1785519409830,
  },
  {
    id: 111111,
    title: 'A Field Guide to Quiet Hours',
    author: 'M. Hale',
    pages: 244,
    /* The book the preview journey hangs off, and the reason it is an
       invented one: everything kept from it below had to be written by hand,
       and putting invented quotations under a real author's name — even in
       scaffolding, even locally — is not a thing to do. */
    pagesRead: 168,
    covers: [],
    formats: ['physical', 'audio'],
    startedOn: '2026-07-02',
    addedAt: 1785494033136,
  },
  {
    id: 222222,
    title: 'Salt Meridian',
    author: 'R. Okonkwo',
    pages: 318,
    covers: [],
    /* Two at once — the paperback at home and the narrator on the way there.
       One book on the shelf has to carry a pair, or the multi-select in the
       journey header is only ever reviewed with a single answer in it. */
    formats: ['audio', 'physical'],
    startedOn: '2026-06-11',
    addedAt: 1785494029136,
  },
  {
    id: 333333,
    title: 'The Long Room',
    author: 'T. Fairweather',
    pages: 190,
    covers: [],
    formats: ['digital'],
    startedOn: '2026-05-20',
    addedAt: 1785494024136,
  },
  {
    id: 3816777860,
    title: 'Quiet',
    author: 'Susan Cain',
    year: 2012,
    pages: 368,
    /* `L` rather than the `M` this was originally saved with — see
       books/sources.ts for why the board wants the larger plate. */
    covers: ['https://covers.openlibrary.org/b/id/7079753-L.jpg?default=false'],
    formats: ['digital'],
    startedOn: '2026-07-31',
    addedAt: 1785493794416,
  },
]

/* Taking the demo shelf back off, for good.

   For most of this project a preview build laid down five invented books so
   there was something to look at, and this function took them off again before
   any sync so they could not travel into a reader's own Drive. The seeding is
   gone: the owner was reading her real journal on the preview link, and props
   arriving and leaving underneath her made the shelf count jump — five extra
   books on one launch, four on the next, neither of them hers.

   What is left is the sweep, and it now runs on every build rather than only
   the seeded ones, because the devices that need it are precisely the ones the
   seed already reached. It costs one keyed lookup on a launch with nothing to
   find.

   IT DELETES ONLY A ROW THAT IS STILL THE PROP, and the id is not enough to
   decide that — which was a real bug, not a theoretical one, and the reason
   the owner watched books she had genuinely added vanish off the preview link.

   Two of the five props ARE real books, deliberately, and they carry the id
   `seedFrom(title, author)` computes so that adding "Quiet" through search on
   a seeded shelf edited the row already there instead of shelving it twice.
   That is the same mechanism read the other way: after such an add the row is
   the reader's book, at the prop's id, and deleting by id alone throws away a
   book they shelved themselves along with everything they kept in it.

   So identity is the whole row, not the key: title, author, and the literal
   `addedAt` written above. A book added through search carries the moment it
   was added, which is never one of these five constants — so it survives, and
   the untouched prop beside it does not.

   AND IT LEAVES NO HEADSTONES ANY MORE. It used to, and that was the worse
   half of the same bug the paragraph above describes.

   A headstone for a book is `b:<id>` and NOTHING ELSE — it has to be, because
   the row it is meant to delete is by then already gone and there is nothing
   left to compare a title against. So the careful three-field guard above
   protected the row on the device doing the sweeping, and then wrote a note
   that travelled to every OTHER device saying "delete 366657726" — which on a
   device holding the reader's own copy of The Salt Path, at exactly that id
   because that is how `seedFrom` is designed, deletes her book. Every sync.
   Forever. That is the owner's report from both ends: books coming back and
   going away again, a shelf count flipping between two numbers, and "that
   book isn't on your shelf" appearing over a book she had open.

   Without the headstone, the props can come back down from a Drive copy
   written before any of this existed — which is what the headstone was for. So
   the sweep runs again AFTER the merge instead, on the way up. See sync.ts:
   nothing that arrives survives to be exported, and nothing has to be said
   about ids that were never only ours to speak for.

   `forgetSeedGraves` takes down the ones already written. It is not a
   migration and does not need a stamp: five keyed deletes, idempotent, and
   the keys are ours by construction. */
const SEED_GRAVES = PREVIEW_SHELF.filter((book) => typeof book.id === 'number').map((book) =>
  bookGrave(book.id!),
)

export async function forgetSeedGraves() {
  await db.graves.bulkDelete(SEED_GRAVES)
}

export async function unseed() {
  await forgetSeedGraves()

  const props = new Map(
    PREVIEW_SHELF.filter((book) => typeof book.id === 'number').map((book) => [book.id!, book]),
  )

  await db.transaction('rw', db.books, db.entries, db.graves, async () => {
    const here = await db.books.bulkGet([...props.keys()])
    const stale = here.filter((book): book is Book => {
      if (!book || typeof book.id !== 'number') return false
      const prop = props.get(book.id)
      if (!prop) return false
      /* All three, because any one alone can coincide. `addedAt` is the load
         bearing one — it is a constant here and a clock reading everywhere
         else — and the title and author guard against a prop whose id was
         reused by an import from another device. */
      return (
        book.title === prop.title && book.author === prop.author && book.addedAt === prop.addedAt
      )
    })
    if (!stale.length) return
    const ids = stale.map((book) => book.id!)
    await db.entries.where('bookId').anyOf(ids).delete()
    await db.books.bulkDelete(ids)
  })
}

