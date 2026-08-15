/* Content for the card gallery.

   Three keeps per type, invented for the purpose and belonging to no real book
   — the point is to judge a drawing against writing of a realistic length,
   including the awkward ones: a quote that runs four lines, a character with no
   name to give, a thread whose title is a whole sentence, a headword seventeen
   letters long with nowhere sensible to break. */

import type { Entry, EntryType } from '../../data/db'

/* Nothing here is ever written to the database — these ids sit far outside the
   range Dexie hands out, so a sample can never collide with a real keep. */
let next = 900_001
function keep(part: Omit<Entry, 'id' | 'bookId' | 'createdAt'>): Entry {
  return { id: next++, bookId: 0, createdAt: 0, ...part }
}

export const SAMPLES: Record<EntryType, Entry[]> = {
  quote: [
    keep({
      type: 'quote',
      keptOn: '2026-06-14',
      page: 41,
      text: 'The house had been holding its breath since March, and not one of us thought to tell it that it could stop.',
    }),
    keep({
      type: 'quote',
      keptOn: '2026-06-21',
      page: 118,
      text: 'He said the word later the way other people say never, and I believed both halves of it.',
    }),
    keep({
      type: 'quote',
      keptOn: '2026-07-02',
      page: 7,
      text: 'Rain on the skylight, and the long argument of the pipes.',
    }),
  ],
  vocabulary: [
    keep({
      type: 'vocabulary',
      keptOn: '2026-06-16',
      page: 63,
      name: 'susurrus',
      text: 'A whispering or rustling sound. Used here of the orchard, twice in one page.',
      /* The looked-up state: phonetic and part of speech as the dictionary
         hands them back, so the gallery shows the full column. */
      phonetic: '/suˈsʌr.əs/',
      pos: 'n.',
    }),
    /* The stress case: a compound with no break a reader would accept, and a
       gloss short enough that the card is almost entirely headword. If the
       drawing survives this one it survives everything. Deliberately left
       hand-written — no phonetic, no part of speech — so the gallery always
       shows both honest states of the card. */
    keep({
      type: 'vocabulary',
      keptOn: '2026-06-29',
      name: 'verschlimmbessern',
      text: 'To make something worse by trying to improve it.',
    }),
    keep({
      type: 'vocabulary',
      keptOn: '2026-07-11',
      page: 204,
      name: 'apricity',
      text: 'The warmth of the sun in winter. Apparently obsolete, which seems like a waste of a good word — I have wanted it for years without knowing it existed.',
    }),
  ],
  note: [
    keep({
      type: 'note',
      keptOn: '2026-06-15',
      text: 'I keep circling the sister. She is not the one being punished, but she is the one who keeps apologising.',
    }),
    keep({
      type: 'note',
      keptOn: '2026-06-28',
      chapter: 'Nine',
      text: 'Second time through this chapter. The first time I thought it was about the fire. It is not about the fire.',
    }),
    keep({
      type: 'note',
      keptOn: '2026-07-09',
      text: 'The ferry timetable is doing something. Every time it changes, somebody leaves and nobody says goodbye.',
    }),
  ],
  voice: [
    keep({
      type: 'voice',
      keptOn: '2026-06-18',
      duration: 47,
      text: 'Walked home the long way arguing with chapter nine out loud.',
    }),
    keep({
      type: 'voice',
      keptOn: '2026-06-30',
      duration: 22,
      text: 'On the bus, had to stop and say this bit into my phone before I lost it.',
    }),
    keep({
      type: 'voice',
      keptOn: '2026-07-11',
      duration: 96,
      text: 'Three in the morning and I cannot sleep. Something about the lighthouse.',
    }),
  ],
  image: [
    keep({
      type: 'image',
      keptOn: '2026-06-16',
      text: 'The bridge from chapter four, more or less, at entirely the wrong time of year.',
    }),
    keep({
      type: 'image',
      keptOn: '2026-06-27',
      text: 'My grandmother’s copy. Somebody underlined this in 1974 and I would like to know why.',
    }),
    keep({
      type: 'image',
      keptOn: '2026-07-06',
      text: 'Tried drawing the kitchen the way it is described. Got the window badly wrong.',
    }),
  ],
  character: [
    keep({
      type: 'character',
      keptOn: '2026-06-13',
      name: 'Vesna Mardal',
      text: 'Keeps the accounts, and everybody else’s secrets. Says less with every chapter.',
    }),
    keep({
      type: 'character',
      keptOn: '2026-06-24',
      name: 'The younger brother',
      text: 'Never named. Two hundred pages in, I no longer think he is going to be.',
    }),
    keep({
      type: 'character',
      keptOn: '2026-07-05',
      name: 'Aunt Clement',
      text: 'Arrives with the weather and leaves before anyone has the chance to thank her.',
    }),
  ],
  place: [
    keep({
      type: 'place',
      keptOn: '2026-06-17',
      name: 'The Sea Road',
      text: 'Six miles of it, and the book measures every argument against how far along it they have got.',
    }),
    keep({
      type: 'place',
      keptOn: '2026-06-29',
      name: 'Halloran’s Yard',
      text: 'Where the boats go to be forgotten. Everything important happens here, and it happens twice.',
    }),
    keep({
      type: 'place',
      keptOn: '2026-07-10',
      name: 'The Winter Room',
      text: 'Shut up from October. The only room in the house with the lock on the inside.',
    }),
  ],
  thread: [
    keep({
      type: 'thread',
      keptOn: '2026-06-19',
      name: 'The letters were never sent',
      stance: 'hunch',
      text: 'Three people mention posting it. Not one of them mentions it arriving.',
    }),
    keep({
      type: 'thread',
      keptOn: '2026-07-01',
      name: 'She knew about the fire',
      stance: 'suspicion',
      text: 'She is the only person in the house who never asks a single question about it.',
    }),
    keep({
      type: 'thread',
      keptOn: '2026-07-12',
      name: 'The house is telling this',
      stance: 'certain',
      text: 'Chapter twelve settles it. Nobody standing in that room could have seen what we are shown.',
    }),
  ],
}

/* ── Stand-in media ───────────────────────────────────────────────────────
   Both are made on the device out of nothing: no network, no bundled asset,
   no cost. The gallery needs a picture that is actually a picture and a
   recording that the play control can actually run, or two of the seven
   drawings would be judged on their empty state. */

/** A drawn abstract, seeded off the keep so each sample differs. */
export async function drawnPicture(seed: number): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = 900
  canvas.height = 600
  const ctx = canvas.getContext('2d')
  if (!ctx) return new Blob()

  /* mulberry32, same generator the drawings use. */
  let a = seed >>> 0
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const hue = 190 + r() * 140
  const sky = ctx.createLinearGradient(0, 0, 0, 600)
  sky.addColorStop(0, `hsl(${hue} 32% 82%)`)
  sky.addColorStop(1, `hsl(${hue + 30} 26% 62%)`)
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 900, 600)

  /* A low sun and three headlands, which is enough to read as a photograph of
     somewhere at thumbnail size. */
  ctx.fillStyle = `hsl(${hue - 30} 55% 88% / 0.75)`
  ctx.beginPath()
  ctx.arc(180 + r() * 540, 150 + r() * 120, 40 + r() * 30, 0, Math.PI * 2)
  ctx.fill()

  for (let i = 0; i < 3; i++) {
    const base = 380 + i * 60
    ctx.fillStyle = `hsl(${hue + i * 14} 24% ${44 - i * 11}%)`
    ctx.beginPath()
    ctx.moveTo(0, 600)
    ctx.lineTo(0, base)
    for (let x = 0; x <= 900; x += 60) {
      ctx.lineTo(x, base - Math.sin((x / 900) * Math.PI * (1 + i)) * (50 + r() * 40))
    }
    ctx.lineTo(900, 600)
    ctx.closePath()
    ctx.fill()
  }

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? new Blob()), 'image/png')
  })
}

/** A silent recording of the stated length, so the transport is live without
    the gallery ever making a noise at anybody. */
export function silence(seconds: number): Blob {
  const rate = 8000
  const frames = Math.round(rate * seconds)
  const buffer = new ArrayBuffer(44 + frames)
  const view = new DataView(buffer)
  const ascii = (at: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(at + i, text.charCodeAt(i))
  }
  ascii(0, 'RIFF')
  view.setUint32(4, 36 + frames, true)
  ascii(8, 'WAVEfmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, rate, true)
  view.setUint32(28, rate, true)
  view.setUint16(32, 1, true)
  view.setUint16(34, 8, true) // 8-bit, whose silence is 128 rather than 0
  ascii(36, 'data')
  view.setUint32(40, frames, true)
  new Uint8Array(buffer, 44).fill(128)
  return new Blob([buffer], { type: 'audio/wav' })
}
