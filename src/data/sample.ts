/* Invented placeholder data so layout can be validated before the real
   book pipeline (03) and entry store (Dexie) are wired. No real books. */

export interface SampleBook {
  title: string
  author: string
  pagesRead: number
  pages: number
  highlightsThisWeek: number
  entryHint: string
}

export type SampleMemory =
  | { type: 'quote'; text: string; source: string }
  | { type: 'note'; text: string; source: string }
  | { type: 'voice'; duration: string; source: string; date: string }

export const currentlyReading: SampleBook = {
  title: 'The Lantern Season',
  author: 'A. Winters',
  pagesRead: 214,
  pages: 502,
  highlightsThisWeek: 3,
  entryHint: '2 quotes · 1 voice memo',
}

export const recentMemories: SampleMemory[] = [
  {
    type: 'quote',
    text: 'The rain kept its own kind of time.',
    source: 'The Lantern Season',
  },
  {
    type: 'voice',
    duration: '0:42',
    source: 'The Lantern Season',
    date: '12 Jul',
  },
  {
    type: 'note',
    text: 'The lighthouse chapter reads like a memory of the future.',
    source: 'Chapter 12',
  },
]
