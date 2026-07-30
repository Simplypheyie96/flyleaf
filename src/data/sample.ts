/* Invented placeholder data so layout can be validated before the real
   book pipeline (03) and entry store (Dexie) are wired. No real books. */

export interface SampleBook {
  title: string
  author: string
  pagesRead: number
  pages: number
  highlightsThisWeek: number
  entryHint: string
  /** Tint token for the placeholder cover (replaced by real covers in 03). */
  coverHue: 'image' | 'quote' | 'note' | 'voice' | 'highlight'
}

export interface SampleMemory {
  type: 'quote' | 'note'
  text: string
  source: string
}

export const currentlyReading: SampleBook = {
  title: 'The Lantern Season',
  author: 'A. Winters',
  pagesRead: 214,
  pages: 502,
  highlightsThisWeek: 3,
  entryHint: '2 quotes · 1 voice memo',
  coverHue: 'image',
}

export const booksInProgress = 3

export const recentMemories: SampleMemory[] = [
  {
    type: 'quote',
    text: '“The rain kept its own kind of time.”',
    source: 'The Lantern Season',
  },
  {
    type: 'note',
    text: 'The lighthouse chapter reads like a memory of the future.',
    source: 'Chapter 12',
  },
]
