/* The reader's face, beside the reader's name.

   DiceBear's `adventurer` set, drawn LOCALLY from the npm packages rather than
   fetched from api.dicebear.com. Flyleaf has to open on a plane, and an avatar
   that is a network request is an avatar that is a grey box on the one morning
   the wifi is out. It is also the same rule the rest of the app keeps: nothing
   about the reader leaves the device, and a request to an avatar service every
   launch is a request that says who is launching.

   THE CHOICE IS A SEED, not a picture. What is stored is one short string, so
   a face costs a dozen bytes in localStorage next to the handle and is redrawn
   identically for ever. Same seed, same face, on any device the journey lands
   on.

   Licence: the adventurer style is CC BY 4.0 by Lisa Wischofsky. That
   attribution is a condition of using it and it lives on the Licensing page —
   see legal/documents.tsx. Do not ship this component without it. */

import { useMemo } from 'react'
import { Avatar as Rendered, Style } from '@dicebear/core'
import definition from '@dicebear/styles/adventurer.json'
import styles from './Face.module.css'

/* Validating the definition costs a beat and building one face costs well
   under a millisecond, so the expensive half is paid once, and only by a
   screen that actually shows a face. Same shape as journey/face.tsx. */
let sheet: Style<typeof definition> | undefined
function styleSheet() {
  sheet ??= new Style(definition)
  return sheet
}

/* Twelve to choose from. More is a catalogue to scroll and fewer is not a
   choice; twelve fills two comfortable rows on a phone and every one of them
   is a different face at a glance rather than the same face in a new jumper.

   DRAWN, NOT ROLLED. The first version of this list was twelve names handed to
   the generator as seeds, which hashes them into a random pick of hair, skin,
   eyes and mouth. Nobody ever looked at what came out, and what came out was
   twelve faces that all read the same way — no range at all, in a chooser
   whose entire job is range. So every face here is specified part by part and
   the sheet was rendered and looked at before it shipped: four skin tones,
   three each; short hair and long; a shaved head, a braid, a top knot; two
   pairs of glasses, freckles, one earring; silver hair as well as black. Faces
   that read masculine, feminine and neither, because readers are all three.

   The name is still the key, so it is still one short string in storage and a
   reader who already picked one keeps it. It is a label for a slot, not a
   claim about the person in the picture — nobody in Flyleaf is called any of
   these. `note` is what a screen reader hears: what is actually visible, and
   never a guess at who the face is. */
type Look = Record<string, unknown>

const LOOKS: Record<string, { note: string; look: Look }> = {
  Aneka: {
    note: 'black hair with a blunt fringe',
    look: { hairVariant: 'long07', hairColor: '#0e0e0e', skinColor: '#f2d3b1', eyesVariant: 'variant02', eyebrowsVariant: 'variant12', mouthVariant: 'variant02' },
  },
  Milo: {
    note: 'short dark hair',
    look: { hairVariant: 'short01', hairColor: '#0e0e0e', skinColor: '#763900', eyesVariant: 'variant24', eyebrowsVariant: 'variant10', mouthVariant: 'variant01' },
  },
  Sadie: {
    note: 'auburn waves and freckles',
    look: { hairVariant: 'long17', hairColor: '#562306', skinColor: '#ecad80', eyesVariant: 'variant02', eyebrowsVariant: 'variant09', mouthVariant: 'variant19', detailsVariant: 'freckles', detailsProbability: 100 },
  },
  Jude: {
    note: 'blond hair and round glasses',
    look: { hairVariant: 'short08', hairColor: '#b9a05f', skinColor: '#763900', eyesVariant: 'variant03', eyebrowsVariant: 'variant05', mouthVariant: 'variant27', glassesVariant: 'variant02', glassesProbability: 100 },
  },
  Nala: {
    note: 'dark hair in a bun',
    look: { hairVariant: 'long13', hairColor: '#0e0e0e', skinColor: '#763900', eyesVariant: 'variant26', eyebrowsVariant: 'variant12', mouthVariant: 'variant29' },
  },
  Kian: {
    note: 'short curls',
    look: { hairVariant: 'short03', hairColor: '#0e0e0e', skinColor: '#9e5622', eyesVariant: 'variant25', eyebrowsVariant: 'variant15', mouthVariant: 'variant01' },
  },
  Ivy: {
    note: 'a pale blue bob',
    look: { hairVariant: 'long21', hairColor: '#85c2c6', skinColor: '#f2d3b1', eyesVariant: 'variant26', eyebrowsVariant: 'variant09', mouthVariant: 'variant27' },
  },
  Odin: {
    note: 'a shaved head',
    look: { hairVariant: 'short19', hairColor: '#0e0e0e', skinColor: '#9e5622', eyesVariant: 'variant24', eyebrowsVariant: 'variant10', mouthVariant: 'variant01' },
  },
  Wren: {
    note: 'ginger hair and freckles',
    look: { hairVariant: 'short05', hairColor: '#cb6820', skinColor: '#f2d3b1', eyesVariant: 'variant25', eyebrowsVariant: 'variant09', mouthVariant: 'variant30', detailsVariant: 'freckles', detailsProbability: 100 },
  },
  Zuri: {
    note: 'plum buns and a small earring',
    look: { hairVariant: 'long23', hairColor: '#592454', skinColor: '#9e5622', eyesVariant: 'variant19', eyebrowsVariant: 'variant10', mouthVariant: 'variant28', earringsVariant: 'variant02', earringsProbability: 100 },
  },
  Bramble: {
    note: 'a top knot and closed eyes',
    look: { hairVariant: 'short12', hairColor: '#0e0e0e', skinColor: '#ecad80', eyesVariant: 'variant20', eyebrowsVariant: 'variant10', mouthVariant: 'variant29' },
  },
  Juniper: {
    note: 'a silver braid and glasses',
    look: { hairVariant: 'long16', hairColor: '#afafaf', skinColor: '#ecad80', eyesVariant: 'variant02', eyebrowsVariant: 'variant15', mouthVariant: 'variant02', glassesVariant: 'variant04', glassesProbability: 100 },
  },
}

export const FACES = Object.keys(LOOKS)

/* Off unless a face asks for them. The generator gives glasses, earrings and
   freckles a one-in-ten chance of turning up on their own, and a face that is
   specified down to the eyebrow should not still be rolling dice for jewellery
   — it would draw a different picture on a different version of the package. */
const BARE = {
  glassesProbability: 0,
  earringsProbability: 0,
  detailsProbability: 0,
}

const cache = new Map<string, string>()

/** The drawing for a seed, as a data URI. Cached: the picker paints twelve at
    once and Home repaints its one on every render, and each of these is ~8KB
    of SVG to build. */
export function faceUri(seed: string): string {
  const hit = cache.get(seed)
  if (hit) return hit

  /* No background from the generator — it only takes hex, and a hex disc does
     not follow the theme. The ring and the paper behind it are CSS, so the
     face sits on the app's own material in both modes.

     `scale` is a multiplier here, not a percentage: the generator takes 0–10,
     so 1.1 draws the head a tenth larger than its box and fills the disc
     instead of leaving a band of nothing round it. A percentage would be a
     validation error, which is no face at all.

     A seed with no entry in LOOKS still draws something. That is not a case
     the picker can produce, but an imported journey from an older version can,
     and a journey that arrives with a face nobody recognises should land on a
     face rather than on a gap. */
  const uri = new Rendered(styleSheet(), {
    seed,
    ...BARE,
    ...LOOKS[seed]?.look,
    scale: 1.1,
    translateY: 5,
  }).toDataUri()

  cache.set(seed, uri)
  return uri
}

interface Props {
  seed: string
  /** Rendered size, in px. */
  size?: number
  className?: string
}

/** One face on its paper disc. Decorative by default — the name is right next
    to it everywhere it appears, so an alt text would read the same thing
    twice. */
function Face({ seed, size = 40, className }: Props) {
  const uri = useMemo(() => faceUri(seed), [seed])

  return (
    <span
      className={[styles.face, className].filter(Boolean).join(' ')}
      style={{ inlineSize: size, blockSize: size }}
    >
      <img src={uri} alt="" width={size} height={size} draggable={false} />
    </span>
  )
}

/* THE CHOOSING. A radio group, not twelve buttons: these are twelve answers to
   one question, and a screen reader should hear "1 of 12" rather than twelve
   unrelated presses. Roving tabstop comes free with real radios — one Tab to
   reach the group, arrows to move inside it.

   Deselecting is allowed. The middle option is not "no face"; the face is
   simply optional, so pressing the one already chosen puts it back to none and
   Home goes back to a greeting with no picture. */
export function FacePicker({
  value,
  onPick,
  label,
}: {
  value: string
  onPick: (seed: string) => void
  label: string
}) {
  return (
    <div className={styles.picker} role="radiogroup" aria-label={label}>
      {FACES.map((seed, i) => {
        const on = value === seed
        return (
          <button
            key={seed}
            type="button"
            role="radio"
            aria-checked={on}
            /* What is in the picture, not who is in it. "Face 3 of 12" tells a
               screen-reader user the count and nothing they could choose on,
               and any label naming a gender would be a guess about a drawing.
               So: hair, and anything worn. */
            aria-label={`Face ${i + 1} of ${FACES.length}: ${LOOKS[seed].note}`}
            className={on ? styles.pickOn : styles.pick}
            onClick={() => onPick(on ? '' : seed)}
          >
            <Face seed={seed} size={56} />
          </button>
        )
      })}
    </div>
  )
}

export default Face
