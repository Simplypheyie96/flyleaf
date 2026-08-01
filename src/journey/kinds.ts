/* The seven kinds of keep, in one place.

   Everything the app needs to know about a type that is not the type itself:
   what to call it, what glyph stands for it, what paper it is printed on, what
   the capture sheet has to ask for. One registry rather than seven switch
   statements scattered across the journey, so adding an eighth kind is a block
   of text here and nothing else.

   What this file deliberately does *not* hold is the card. A quote card and a
   voice card differ by structure — a rail, a black bar, a ruled sheet, a
   medallion — and structure does not compress into a config object. The rule
   the whole screen is built on is that colour is the last thing telling these
   apart, not the first, so `hue` below is only ever a filter chip and a notch;
   the card itself is a drawn thing in Keep.tsx. */

import type { ComponentType } from 'react'
import type { EntryType, Stance } from '../data/db'
import type { PaperTone } from '../components/PaperSurface'
import {
  CharacterIcon,
  ImageIcon,
  NoteIcon,
  PlaceIcon,
  QuoteIcon,
  ThreadIcon,
  VoiceIcon,
} from '../components/TabIcons'

/** What the capture sheet has to put in front of the reader. */
export interface Asks {
  /** The words, and what to call the field. `none` means the kind has no
      writing of its own — only voice does, until it is transcribed. */
  text: { label: string; placeholder: string } | null
  /** A title of its own, above the body. */
  name: { label: string; placeholder: string } | null
  /** Pick a drawn person. */
  avatar: boolean
  /** How sure the reader is. */
  stance: boolean
  /** What can be attached, if anything. `optional` is the place card: a map is
      welcome and a place without one is still a place. */
  media: 'none' | 'image' | 'audio' | 'optional-image'
}

export interface Kind {
  one: string
  many: string
  /** The sentence on the capture sheet's own title bar. */
  invite: string
  tone: PaperTone
  Icon: ComponentType<{ size?: number }>
  /** The custom property carrying this kind's identity colour. */
  hue: string
  asks: Asks
}

/* Order matters and is not alphabetical. The first four are things lifted out
   of the book; the last three are things the reader builds about it while
   reading. The filter row, the capture menu and the colophon all walk this
   list, so they agree with each other without trying. */
export const KINDS: readonly EntryType[] = [
  'quote',
  'note',
  'voice',
  'image',
  'character',
  'place',
  'thread',
]

export const KIND: Record<EntryType, Kind> = {
  quote: {
    one: 'quote',
    many: 'quotes',
    invite: 'Keep a line',
    tone: 'quote',
    Icon: QuoteIcon,
    hue: '--color-quote',
    asks: {
      text: { label: 'The line', placeholder: 'Copy it out exactly as it is written…' },
      name: null,
      avatar: false,
      stance: false,
      media: 'none',
    },
  },
  note: {
    one: 'note',
    many: 'notes',
    invite: 'Write a note',
    tone: 'note',
    Icon: NoteIcon,
    hue: '--color-note',
    asks: {
      text: { label: 'The note', placeholder: 'What you thought, while you still think it…' },
      name: null,
      avatar: false,
      stance: false,
      media: 'none',
    },
  },
  voice: {
    one: 'voice memo',
    many: 'voice memos',
    invite: 'Record a voice memo',
    tone: 'voice',
    Icon: VoiceIcon,
    hue: '--color-voice',
    asks: {
      /* A memo can carry a line of writing, but it is a label for the
         recording rather than the keep itself — the recording is the keep. */
      text: { label: 'Label', placeholder: 'What this one is about…' },
      name: null,
      avatar: false,
      stance: false,
      media: 'audio',
    },
  },
  image: {
    one: 'picture',
    many: 'pictures',
    invite: 'Add a picture',
    tone: 'image',
    Icon: ImageIcon,
    hue: '--color-image',
    asks: {
      text: { label: 'Caption', placeholder: 'A line under it…' },
      name: null,
      avatar: false,
      stance: false,
      media: 'image',
    },
  },
  character: {
    one: 'character',
    many: 'characters',
    invite: 'Follow a character',
    tone: 'character',
    Icon: CharacterIcon,
    hue: '--color-character',
    asks: {
      text: { label: 'What you know', placeholder: 'Who they are, what they want, what you make of them…' },
      name: { label: 'Name', placeholder: 'What they are called' },
      avatar: true,
      stance: false,
      media: 'none',
    },
  },
  place: {
    one: 'place',
    many: 'places',
    invite: 'Mark a place',
    tone: 'place',
    Icon: PlaceIcon,
    hue: '--color-place',
    asks: {
      text: { label: 'The lore', placeholder: 'What happens here, and what the book says about it…' },
      name: { label: 'Place', placeholder: 'What it is called' },
      avatar: false,
      stance: false,
      /* A reader who has a map of the place can pin it; one who does not gets
         a drawn field instead, and neither looks like the poor relation. */
      media: 'optional-image',
    },
  },
  thread: {
    one: 'plot thread',
    many: 'plot threads',
    invite: 'Pull a thread',
    tone: 'thread',
    Icon: ThreadIcon,
    hue: '--color-thread',
    asks: {
      text: { label: 'The thread', placeholder: 'What you think is going on…' },
      name: { label: 'Calling it', placeholder: 'A few words to find it by' },
      avatar: false,
      stance: true,
      media: 'none',
    },
  },
}

/* ── Stance ───────────────────────────────────────────────────────────────

   Only plot threads carry one. Three steps, and the order is the whole point:
   a thread that starts as a hunch and ends up certain is the shape of reading
   a novel, and the journey draws that hardening — the notch gets heavier and
   the link between threads gets more solid as the reader gets more sure. */

export const STANCES: readonly Stance[] = ['hunch', 'suspicion', 'certain']

export const STANCE: Record<Stance, { label: string; blurb: string; weight: number }> = {
  hunch: { label: 'Hunch', blurb: 'A feeling, nothing more', weight: 1 },
  suspicion: { label: 'Suspicion', blurb: 'Something is pointing at it', weight: 2 },
  certain: { label: 'Certain', blurb: 'You would bet on it', weight: 3 },
}
