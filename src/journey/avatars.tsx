/* Drawn people, for the characters a reader is following.

   These are chosen by *appearance* and nothing else. There is no gender field
   here, no "he / she / other" picker, and no label under any of them: a reader
   picks the likeness that looks most like the person in their head, the same
   way they would pick a face out of a crowd, and the app records which drawing
   they picked. Nothing is inferred from it and nothing is asked.

   Same hand as the icons — one box, round caps, 1.8 stroke — with one
   departure: hair is *filled* rather than outlined. At medallion size a
   hairline outline of hair turns to mush, and the fill is what makes twelve
   heads read as twelve different people at a glance. The face stays stroked so
   the drawing keeps its lightness and inherits the card's ink either way. */

const line = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const solid = { fill: 'currentColor', stroke: 'none' } as const

/** The face and shoulders every avatar is built on. */
const FACE = 'M24 11.5 A 8.5 8.5 0 1 1 23.99 11.5 Z'
const SHOULDERS = 'M9.5 42 C 9.5 34 16 29.5 24 29.5 C 32 29.5 38.5 34 38.5 42'

/* Every id is a hairstyle, a covering or a feature — never a person and never
   a category of person. Stored on the entry as a plain string, so adding one
   below is additive and an unknown id simply falls back. */
export const AVATARS = [
  'crop',
  'bob',
  'long',
  'curls',
  'bun',
  'braids',
  'locs',
  'wrap',
  'cap',
  'beard',
  'specs',
  'shaved',
] as const

export type AvatarId = (typeof AVATARS)[number]

const HAIR: Record<AvatarId, React.ReactNode> = {
  crop: (
    <path
      {...solid}
      d="M14.5 20.5 C 14.5 12.8 18.6 8.5 24 8.5 C 29.4 8.5 33.5 12.8 33.5 20.5 C 32.6 17 29.6 15.2 24 15.2 C 18.4 15.2 15.4 17 14.5 20.5 Z"
    />
  ),
  bob: (
    <path
      {...solid}
      d="M13.5 26.5 L 13.5 18.5 C 13.5 12.2 18 8.5 24 8.5 C 30 8.5 34.5 12.2 34.5 18.5 L 34.5 26.5 C 32.9 26.5 31.9 25 31.9 22.6 L 31.9 17.6 C 29.7 15.6 27 14.9 24 14.9 C 21 14.9 18.3 15.6 16.1 17.6 L 16.1 22.6 C 16.1 25 15.1 26.5 13.5 26.5 Z"
    />
  ),
  long: (
    <path
      {...solid}
      d="M13.5 34.5 L 13.5 18.5 C 13.5 12.2 18 8.5 24 8.5 C 30 8.5 34.5 12.2 34.5 18.5 L 34.5 34.5 C 32.9 33.5 31.9 30.5 31.9 26.5 L 31.9 17.6 C 29.7 15.6 27 14.9 24 14.9 C 21 14.9 18.3 15.6 16.1 17.6 L 16.1 26.5 C 16.1 30.5 15.1 33.5 13.5 34.5 Z"
    />
  ),
  curls: (
    <g {...solid}>
      <circle cx="24" cy="10.5" r="5" />
      <circle cx="16.6" cy="14.5" r="4.4" />
      <circle cx="31.4" cy="14.5" r="4.4" />
      <circle cx="19.3" cy="10" r="3.8" />
      <circle cx="28.7" cy="10" r="3.8" />
      <path d="M14.8 18.5 C 16.6 15.6 20 14.4 24 14.4 C 28 14.4 31.4 15.6 33.2 18.5 Z" />
    </g>
  ),
  bun: (
    <g {...solid}>
      <circle cx="24" cy="5.6" r="3.6" />
      <path d="M14.5 20.5 C 14.5 12.8 18.6 8.5 24 8.5 C 29.4 8.5 33.5 12.8 33.5 20.5 C 32.6 16.6 29.6 14.8 24 14.8 C 18.4 14.8 15.4 16.6 14.5 20.5 Z" />
    </g>
  ),
  braids: (
    <g {...solid}>
      <path d="M14.5 20 C 14.5 12.5 18.6 8.5 24 8.5 C 29.4 8.5 33.5 12.5 33.5 20 C 32.6 16.4 29.6 14.7 24 14.7 C 18.4 14.7 15.4 16.4 14.5 20 Z" />
      <rect x="12.2" y="18" width="3.4" height="14" rx="1.7" />
      <rect x="32.4" y="18" width="3.4" height="14" rx="1.7" />
    </g>
  ),
  locs: (
    <g {...solid}>
      <path d="M14.5 19.5 C 14.5 12.4 18.6 8.5 24 8.5 C 29.4 8.5 33.5 12.4 33.5 19.5 C 32.6 16.2 29.6 14.6 24 14.6 C 18.4 14.6 15.4 16.2 14.5 19.5 Z" />
      <rect x="12.6" y="16.5" width="3" height="12" rx="1.5" />
      <rect x="16.4" y="12.5" width="3" height="8" rx="1.5" />
      <rect x="28.6" y="12.5" width="3" height="8" rx="1.5" />
      <rect x="32.4" y="16.5" width="3" height="12" rx="1.5" />
    </g>
  ),
  wrap: (
    <g {...solid}>
      <path d="M13.2 27 C 13.2 27 12.8 22 12.8 19.5 C 12.8 12.4 17.8 7.8 24 7.8 C 30.2 7.8 35.2 12.4 35.2 19.5 C 35.2 22 34.8 27 34.8 27 L 31 27 C 31.8 24 32 21.5 32 19.5 C 32 15.2 28.6 12.4 24 12.4 C 19.4 12.4 16 15.2 16 19.5 C 16 21.5 16.2 24 17 27 Z" />
      <path d="M31.4 25.5 L 36.6 30.8 C 37.4 31.6 36.9 33 35.8 33 L 31.4 33 Z" />
    </g>
  ),
  cap: (
    <g {...solid}>
      <path d="M14 17.5 C 14 11.6 18.5 8 24 8 C 29.5 8 34 11.6 34 17.5 Z" />
      <path d="M12.6 17.5 L 38.5 17.5 C 39.3 17.5 39.6 18.6 38.9 19 C 35.6 20.9 30.4 21.6 24 21.6 C 19.6 21.6 15.8 21.3 12.6 20.6 Z" />
    </g>
  ),
  beard: (
    <g {...solid}>
      <path d="M14.8 19.8 C 14.8 12.7 18.8 8.8 24 8.8 C 29.2 8.8 33.2 12.7 33.2 19.8 C 32.3 16.4 29.4 14.8 24 14.8 C 18.6 14.8 15.7 16.4 14.8 19.8 Z" />
      <path d="M15.8 19 C 16.6 19 17 19.8 17 21.2 C 17 26.4 20 29.4 24 29.4 C 28 29.4 31 26.4 31 21.2 C 31 19.8 31.4 19 32.2 19 C 32.8 19 33.2 19.6 33.2 20.6 C 33.2 28 29.2 32 24 32 C 18.8 32 14.8 28 14.8 20.6 C 14.8 19.6 15.2 19 15.8 19 Z" />
    </g>
  ),
  specs: (
    <g>
      <path
        {...solid}
        d="M14.5 20 C 14.5 12.5 18.6 8.5 24 8.5 C 29.4 8.5 33.5 12.5 33.5 20 C 32.6 16.4 29.6 14.7 24 14.7 C 18.4 14.7 15.4 16.4 14.5 20 Z"
      />
      <g {...line}>
        <circle cx="19.4" cy="21.2" r="3.5" />
        <circle cx="28.6" cy="21.2" r="3.5" />
        <path d="M22.9 21.2 L 25.1 21.2" />
        <path d="M15.9 21.2 L 14.2 21.9" />
        <path d="M32.1 21.2 L 33.8 21.9" />
      </g>
    </g>
  ),
  /* No hair at all. Not a placeholder — a shaved head is a look, and having it
     in the set is what keeps the *absence* of hair from reading as "we could
     not find your person". */
  shaved: null,
}

interface AvatarProps {
  id?: string
  size?: number
}

/* An entry written before this set existed, or one carrying an id from a
   later version of the app, still has to draw a person. Falling back to the
   plainest head is deliberate: it is a real choice in the set, so nothing on
   screen ever looks broken. */
function resolve(id: string | undefined): AvatarId {
  return AVATARS.includes(id as AvatarId) ? (id as AvatarId) : 'shaved'
}

/** One drawn person, on a transparent ground. The medallion around it belongs
    to the card, not to the drawing — this is ink, and it takes the colour of
    whatever it is printed on. */
export function Avatar({ id, size = 44 }: AvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <g {...line}>
        <path d={FACE} />
        <path d={SHOULDERS} />
      </g>
      {HAIR[resolve(id)]}
    </svg>
  )
}

export default Avatar
