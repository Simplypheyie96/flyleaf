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
import * as redraw from './redraw'

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
   list of seven imports three times over.

   Seven, not eight. The three sets were a comparison exercise and it ended
   when the last choice was made; vocabulary arrived afterwards and was drawn
   straight to order, so back-porting it into Pressed, Marginalia and Plates
   would be three drawings made for a table that is already spent. The map it
   returns is therefore partial, and `cardFor` reads `DRAWN` first — see the
   note there. */
function setOf(mod: {
  Quote: ComponentType<CardProps>
  Note: ComponentType<CardProps>
  Voice: ComponentType<CardProps>
  Picture: ComponentType<CardProps>
  Character: ComponentType<CardProps>
  Location: ComponentType<CardProps>
  Thread: ComponentType<CardProps>
}): Partial<Record<EntryType, ComponentType<CardProps>>> {
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

export const SETS: Record<Direction, Partial<Record<EntryType, ComponentType<CardProps>>>> = {
  pressed: setOf(pressed),
  marginalia: setOf(marginalia),
  plates: setOf(plates),
}

/* Which set each type is drawn from.

   Four of the eight are settled here. The other four — characters, plot
   threads, voice and vocabulary — had every set drawing turned down or never
   had one, and were drawn to order instead, so their lines below are read by
   nothing but `?dir=`; see `DRAWN`. They are kept at their nearest neighbour
   rather than deleted, so that switching the whole journey to one set still
   renders every card. */
export const CHOSEN: Record<EntryType, Direction> = {
  quote: 'plates',
  vocabulary: 'plates', // no set drawing exists — only `?dir=` reads this
  note: 'pressed',
  voice: 'plates', // superseded by DRAWN — only `?dir=` still reads this
  image: 'plates',
  character: 'pressed', // superseded by DRAWN — only `?dir=` still reads this
  place: 'pressed',
  thread: 'pressed', // superseded by DRAWN — only `?dir=` still reads this
}

/* Drawn to order, outside the three sets.

   A set is a comparison exercise, and it ends when the last choice is made;
   back-porting a card into all three so one of them can point at it would be
   work done for a table that is about to be deleted. So a type whose drawing
   came from neither of the three lives in `redraw.tsx` and is named here. This
   wins over `CHOSEN` for the types it lists. */
const DRAWN: Partial<Record<EntryType, ComponentType<CardProps>>> = {
  character: redraw.Character,
  vocabulary: redraw.Vocabulary,
  thread: redraw.Thread,
  voice: redraw.Voice,
}

/* A whole journey, drawn as something other than the app draws it.

   The gallery shows three keeps of one type at a time, which is enough to
   judge a drawing and not enough to judge a page: what a set actually feels
   like is thirteen keeps of seven different types running down one thread,
   with the dividers and the ties between them. `?dir=marginalia` redraws every
   card from one set so that can be looked at.

   A preview handle, not a product feature: nothing links to it, an unknown
   value falls straight back to the real drawing, and it comes out with the
   gallery. */
export function cardFor(
  type: EntryType,
  preview?: URLSearchParams | null,
): ComponentType<CardProps> {
  const dir = preview?.get('dir')
  /* `?? DRAWN[type]` rather than a bare index: a set that has no drawing of a
     type falls back to the one the journey really uses, so the handle stays a
     preview of what differs instead of a hole where vocabulary should be. */
  if (dir && dir in SETS) return SETS[dir as Direction][type] ?? DRAWN[type]!
  return DRAWN[type] ?? SETS[CHOSEN[type]][type]!
}
