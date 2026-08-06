/* The first page of a journal, not a checklist.

   07 asks that a new reader be carried through every core capability without
   being lectured. The way that is done here: nothing is *told* to the reader
   and nothing is ticked by pressing a tick — every step completes because the
   reader actually did the thing, in the real screen, with their own book. A
   step is a fact about the database, not a box.

   Two steps have no record of themselves in the data — switching how the
   shelf is laid out, and searching — so those two set a flag when they
   happen. Both are one line at the site of the act, and both are honest: the
   flag is written by the reader's own gesture, never by arriving somewhere.

   THE WHOLE THING IS SKIPPABLE and it never comes back once dismissed. It
   also removes itself when the last step lands, which is the only ending
   worth designing for. */

import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import db, { type EntryType } from '../data/db'

export type StepId =
  | 'book'
  | 'journey'
  | 'quote'
  | 'note'
  | 'voice'
  | 'image'
  | 'thread'
  | 'shelf'
  | 'search'

export interface Step {
  id: StepId
  /** What the reader is invited to do, in their language. */
  invite: string
  /** The sentence under it — why it is worth doing, never how to do it. */
  why: string
  /** Where the invitation leads. */
  to: string
  /** The word on the button. */
  act: string
}

/* Order is the order a first evening actually goes: get a book on the shelf,
   open it, keep the thing you opened the app to keep, then the rest. */
export const STEPS: Step[] = [
  {
    id: 'book',
    invite: 'Put a book on the shelf',
    why: 'The one in your hands right now. Its cover will be waiting.',
    to: '/library',
    act: 'Add a book',
  },
  {
    id: 'journey',
    invite: 'Open its journey',
    why: 'Everything you keep from this book hangs on one thread, in order.',
    to: '/library',
    act: 'Open it',
  },
  {
    id: 'quote',
    invite: 'Keep a line you liked',
    why: 'Copy it out exactly. It will still be here in ten years.',
    to: '/library',
    act: 'Keep a quote',
  },
  {
    id: 'note',
    invite: 'Write down what you thought',
    why: 'While you still think it — that is the part you forget.',
    to: '/library',
    act: 'Write a note',
  },
  {
    id: 'voice',
    invite: 'Say something out loud',
    why: 'Thirty seconds of your own voice, to listen back to any time.',
    to: '/library',
    act: 'Record one',
  },
  {
    id: 'image',
    invite: 'Add a picture',
    why: 'The page, the cover, where you were sitting.',
    to: '/library',
    act: 'Add a picture',
  },
  {
    id: 'thread',
    invite: 'Follow a hunch',
    why: 'A plot thread you are working out, and how sure you are of it.',
    to: '/library',
    act: 'Start a thread',
  },
  {
    id: 'shelf',
    invite: 'Lay the shelf out your way',
    why: 'Stacked, spines out, or a wall of covers.',
    to: '/library',
    act: 'Try the views',
  },
  {
    id: 'search',
    invite: 'Find something you kept',
    why: 'One search over every word, picture and recording you have.',
    to: '/library',
    act: 'Search',
  },
]

const DONE_KEY = 'flyleaf-first-page'
const HIDE_KEY = 'flyleaf-first-page-hidden'

type Flag = 'journey' | 'shelf' | 'search'

function flags(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DONE_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

/** Record a step that leaves no trace in the data. Called at the site of the
    act — opening a journey, switching the shelf, searching. */
export function did(flag: Flag) {
  const have = flags()
  if (have.has(flag)) return
  have.add(flag)
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify([...have]))
  } catch {
    /* Then that step stays open. Harmless: the card is an invitation. */
  }
  window.dispatchEvent(new Event('flyleaf-progress'))
}

export function hideFirstPage() {
  try {
    localStorage.setItem(HIDE_KEY, '1')
  } catch {
    /* See above. */
  }
  window.dispatchEvent(new Event('flyleaf-progress'))
}

function hidden(): boolean {
  try {
    return localStorage.getItem(HIDE_KEY) === '1'
  } catch {
    return false
  }
}

export interface FirstPage {
  /** Every step, in order, with whether it has happened. */
  marks: { step: Step; done: boolean }[]
  /** The one being invited now — the first that has not happened. */
  next: Step | null
  done: number
  /** Nothing left, or the reader asked for it to go. */
  finished: boolean
  visible: boolean
}

/** Live progress across the whole first run. */
export function useFirstPage(): FirstPage | undefined {
  const [flagged, setFlagged] = useState(flags)
  const [away, setAway] = useState(hidden)

  useEffect(() => {
    const sync = () => {
      setFlagged(flags())
      setAway(hidden())
    }
    window.addEventListener('flyleaf-progress', sync)
    return () => window.removeEventListener('flyleaf-progress', sync)
  }, [])

  /* One count per kind rather than a read of the table: the question is only
     ever "is there at least one", and counting on the index answers it
     without touching a single recording. */
  const kept = useLiveQuery(async () => {
    const books = await db.books.count()
    const kinds: Partial<Record<EntryType, number>> = {}
    for (const type of ['quote', 'note', 'voice', 'image', 'thread'] as EntryType[]) {
      kinds[type] = await db.entries.where('type').equals(type).count()
    }
    return { books, kinds }
  }, [])

  if (!kept) return undefined

  const has = (type: EntryType) => (kept.kinds[type] ?? 0) > 0
  const state: Record<StepId, boolean> = {
    book: kept.books > 0,
    journey: flagged.has('journey'),
    quote: has('quote'),
    note: has('note'),
    voice: has('voice'),
    image: has('image'),
    thread: has('thread'),
    shelf: flagged.has('shelf'),
    search: flagged.has('search'),
  }

  const marks = STEPS.map((step) => ({ step, done: state[step.id] }))
  const done = marks.filter((mark) => mark.done).length
  const next = marks.find((mark) => !mark.done)?.step ?? null

  return {
    marks,
    next,
    done,
    finished: next === null,
    visible: !away && next !== null,
  }
}
