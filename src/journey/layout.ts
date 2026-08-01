/* What a reading of a book is.

   The journey used to be one screen with a `data-variant` on it, and the three
   "variations" were three CSS skins over identical markup. That is a fine way
   to offer three densities and a poor way to offer three ideas: everything the
   readings could disagree about — where the cover goes, whether there is a
   masthead, what the entries are grouped by, whether there are groups at all —
   was fixed by the shared DOM before the CSS got a look in.

   So a reading is a component now, and this is the whole of what the route
   hands it. Three things are the route's: the data, the chrome that must look
   the same in all three (the switch, the sift, the fair copy), and the point in
   the page the back bar watches. Everything else — the masthead, the order, the
   grouping, the way a keep is reached — belongs to the reading, which is what
   makes them a real choice.

   Deliberately not passed: the dock, the sheets, the menus. Those are the same
   in every reading, they live on the route, and a reading that could move them
   would be a fourth screen rather than a third view. */

import type { ReactNode } from 'react'
import type { Book, Entry, Strand } from '../data/db'
import type { Row, Sift } from './order'

export interface Reading {
  book: Book
  /** Everything kept from this book, unsifted — for counts and tallies. */
  keeps: Entry[]
  strands: Strand[]
  /** The keeps to actually show, sifted and ordered. */
  rows: Row[]
  sift: Sift
  /** The switch and the two whole-journey actions. Each reading decides where
      they sit, because in one of them they are a toolbar and in another they
      are part of a masthead. */
  tools: ReactNode
  /** Dropped at the foot of whatever the reading calls its masthead. The back
      bar takes the title over when this goes up past it. */
  /** Drop this on an empty div at the foot of the masthead. It is a callback
      ref, not an object ref — see useCollapse in components/BackBar. */
  sentinel: (node: HTMLDivElement | null) => void
  onMenu: (keep: Entry) => void
  onMotif: (motif: string) => void
  onAbout: () => void
  /** Close a strand that is still running. */
  onTie: (strand: Strand) => void
}

/** How far into the block of pages the reader is, 0–1, or null when either
    number is missing. Never guessed: a bookmark at an invented depth is worse
    than no bookmark. */
export function depthOf(book: Book) {
  if (!book.pages || book.pagesRead === undefined) return null
  return Math.min(1, Math.max(0, book.pagesRead / book.pages))
}
