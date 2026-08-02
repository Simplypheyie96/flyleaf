/* WHICH DRAWING A KEEP GETS

   Three complete sets of the seven cards exist side by side. Each set is a
   whole design language rather than a skin — Pressed builds every keep as a
   physical thing in an album, Marginalia sets almost all of them straight onto
   the page with a mark in the margin, and Plates makes the container the idea.

   `CHOSEN` is the only place that decides which set the live journey draws
   from, and it is per type, so the seven can come from three different sets
   once the choices are made. Changing a reader's mind about quotes is one word
   on one line; nothing else in the app knows the directions exist.

   The gallery at /lab/cards renders all three sets against the same content so
   the choice can be made by looking rather than by imagining. */

import type { ComponentType } from 'react'
import type { EntryType } from '../../data/db'
import type { CardProps } from './shared'
import * as pressed from './pressed'
import * as marginalia from './marginalia'
import * as plates from './plates'

export type Direction = 'pressed' | 'marginalia' | 'plates'

/** What each set is, in the reader's own words rather than in ours. */
export const DIRECTIONS: { id: Direction; name: string; blurb: string }[] = [
  {
    id: 'pressed',
    name: 'Pressed',
    blurb: 'Everything is a thing kept in an album — torn, taped, franked, knotted.',
  },
  {
    id: 'marginalia',
    name: 'Marginalia',
    blurb: 'Almost no cards. A mark in the margin, and the words set on the page.',
  },
  {
    id: 'plates',
    name: 'Plates',
    blurb: 'Each keep is a plate with its own silhouette and its own lettering.',
  },
]

/* The module namespaces line up one-to-one, so this is a mapping rather than a
   list of seven imports three times over. */
function setOf(mod: {
  Quote: ComponentType<CardProps>
  Note: ComponentType<CardProps>
  Voice: ComponentType<CardProps>
  Picture: ComponentType<CardProps>
  Character: ComponentType<CardProps>
  Location: ComponentType<CardProps>
  Thread: ComponentType<CardProps>
}): Record<EntryType, ComponentType<CardProps>> {
  return {
    quote: mod.Quote,
    note: mod.Note,
    voice: mod.Voice,
    image: mod.Picture,
    character: mod.Character,
    place: mod.Location,
    thread: mod.Thread,
  }
}

export const SETS: Record<Direction, Record<EntryType, ComponentType<CardProps>>> = {
  pressed: setOf(pressed),
  marginalia: setOf(marginalia),
  plates: setOf(plates),
}

/* The live journey. One line per type; nothing else has to change.

   Five of the seven are settled. Characters and threads are not: all three
   drawings were turned down for both, so their lines below are a holding
   value and not a choice — they stay on Pressed only so the thread renders
   while the two are redrawn. Do not read them as decided. */
export const CHOSEN: Record<EntryType, Direction> = {
  quote: 'plates',
  note: 'pressed',
  voice: 'plates',
  image: 'plates',
  character: 'pressed', // holding — rejected, awaiting a fourth drawing
  place: 'pressed',
  thread: 'pressed', // holding — rejected, awaiting a fourth drawing
}

/* A whole journey, drawn in one direction throughout.

   The gallery shows three keeps of one type at a time, which is enough to
   judge a drawing and not enough to judge a page: what a set actually feels
   like is thirteen keeps of seven different types running down one thread,
   with the dividers and the ties between them. `?dir=marginalia` on a book's
   own URL redraws every card from that set without touching `CHOSEN`, so the
   three can be looked at as pages rather than as swatches.

   A preview handle, not a product feature. Nothing links to it, an unknown
   value falls straight back to `CHOSEN`, and it comes out with the gallery
   once the seven choices are made. */
export function cardFor(type: EntryType, preview?: string | null): ComponentType<CardProps> {
  const dir = preview && preview in SETS ? (preview as Direction) : CHOSEN[type]
  return SETS[dir][type]
}
