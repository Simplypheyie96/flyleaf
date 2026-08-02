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

/* Which set each type is drawn from.

   Six of the seven are settled. Threads are not: all three drawings were
   turned down, so that line is a holding value and not a choice — it stays on
   Pressed only so the thread renders while the drawing is settled. Characters
   are settled but are not drawn from a set at all, so their line here is used
   by nothing but `?dir=`; see `DRAWN` below. */
export const CHOSEN: Record<EntryType, Direction> = {
  quote: 'plates',
  note: 'pressed',
  voice: 'plates',
  image: 'plates',
  character: 'pressed', // superseded by DRAWN — only `?dir=` still reads this
  place: 'pressed',
  thread: 'pressed', // holding — rejected, awaiting its own drawing
}

/* Drawn to order, outside the three sets.

   A set is a comparison exercise, and it ends when the last choice is made;
   back-porting a card into all three so one of them can point at it would be
   work done for a table that is about to be deleted. So a type whose drawing
   came from neither of the three lives in `redraw.tsx` and is named here. This
   wins over `CHOSEN` for the types it lists. */
const DRAWN: Partial<Record<EntryType, ComponentType<CardProps>>> = {
  character: redraw.Character,
}

/* Still being chosen. Threads only: three drawings that put the stance where
   the rejected ones put a count, lettered rather than named because they are
   not directions and none of them is going to become one. Whichever is picked
   moves into `DRAWN` and this table goes. */
const CANDIDATES: Partial<Record<EntryType, Record<string, ComponentType<CardProps>>>> = {
  thread: {
    a: redraw.ThreadQuestion,
    b: redraw.ThreadGauge,
    c: redraw.ThreadOpenFile,
  },
}

/** Which query parameter swaps a candidate in, per type. */
const HANDLE: Partial<Record<EntryType, string>> = { thread: 'th' }

/* A whole journey, drawn as something other than the app draws it.

   The gallery shows three keeps of one type at a time, which is enough to
   judge a drawing and not enough to judge a page: what a set actually feels
   like is thirteen keeps of seven different types running down one thread,
   with the dividers and the ties between them. Two handles do that here.
   `?dir=marginalia` redraws every card from one set. `?th=a` swaps in a thread
   candidate and leaves the six settled types exactly as the app draws them,
   which is the only way to judge one — beside the quotes and notes it will
   actually live with.

   The per-type handle wins where both are given, since it is the more specific
   request. Preview handles, not product features: nothing links to either, an
   unknown value falls straight back to the real drawing, and both come out
   with the gallery once the last choice is made. */
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
  return DRAWN[type] ?? SETS[CHOSEN[type]][type]
}
