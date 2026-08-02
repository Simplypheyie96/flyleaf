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

/* The fourth drawing, for the two types that have not got one yet.

   Characters and threads are not part of any set: all three of their drawings
   were turned down, so `redraw.tsx` holds three fresh candidates for each,
   lettered rather than named because they are not directions and none of them
   is going to become one. Whichever is picked moves into the set it belongs
   beside and this table goes. */
const CANDIDATES: Partial<Record<EntryType, Record<string, ComponentType<CardProps>>>> = {
  character: {
    a: redraw.CharacterMonogram,
    b: redraw.CharacterCallingCard,
    c: redraw.CharacterTracked,
  },
  thread: {
    a: redraw.ThreadQuestion,
    b: redraw.ThreadGauge,
    c: redraw.ThreadOpenFile,
  },
}

/** Which query parameter swaps a candidate in, per type. */
const HANDLE: Partial<Record<EntryType, string>> = { character: 'ch', thread: 'th' }

/* A whole journey, drawn as something other than `CHOSEN` says.

   The gallery shows three keeps of one type at a time, which is enough to
   judge a drawing and not enough to judge a page: what a set actually feels
   like is thirteen keeps of seven different types running down one thread,
   with the dividers and the ties between them. Two handles do that here.
   `?dir=marginalia` redraws every card from one set. `?ch=b&th=a` swaps in a
   fourth-drawing candidate for just those two types and leaves the five that
   are settled exactly as the app draws them, which is the only way to judge a
   character card — beside the quotes and notes it will actually live with.

   The per-type handle wins where both are given, since it is the more specific
   request. Preview handles, not product features: nothing links to either, an
   unknown value falls straight back to `CHOSEN`, and both come out with the
   gallery once the seven choices are made. */
export function cardFor(
  type: EntryType,
  preview?: URLSearchParams | null,
): ComponentType<CardProps> {
  if (preview) {
    const handle = HANDLE[type]
    const pick = handle ? preview.get(handle)?.trim().toLowerCase() : undefined
    const candidate = pick ? CANDIDATES[type]?.[pick] : undefined
    if (candidate) return candidate

    const dir = preview.get('dir')
    if (dir && dir in SETS) return SETS[dir as Direction][type]
  }
  return SETS[CHOSEN[type]][type]
}
