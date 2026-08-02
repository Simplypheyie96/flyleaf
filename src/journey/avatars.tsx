/* Cameos, for the characters a reader is following.

   The drawing before this one was a circle with a smaller circle on top of an
   arc — which is the account glyph. Every phone puts it in the corner of every
   settings screen, and no amount of hair on top of it changes what it is: a
   picture of a *user*. A character in a novel is not a user, and putting the
   sign-in avatar on a card about Aunt Bel made the card look like a contacts
   entry that had wandered in.

   So this is the other portrait people have actually kept in books: the paper
   cameo. Cut from black stock, left-facing, head and shoulders, mounted in an
   oval — the thing a nineteenth-century reader slipped between the flyleaf and
   the cover of exactly the sort of book this app is for. It costs nothing to
   draw, it is unmistakably not a UI glyph, and it belongs to the same family
   as the pressed sprig and the needlework on the covers.

   The whole set is *silhouette*, which has one consequence worth stating
   plainly: a solid shape has no inside. There is no eye, no mouth line, no
   parting. Every difference between one person and the next has to happen on
   the outline — a heavier crown, a blunt end at the jaw, a knot standing proud
   at the back, a visor reaching forward over the brow. That constraint is why
   these read at 44px, where the drawn features of the old set turned to grey.

   Chosen by appearance and nothing else. No gender field, no picker labelled
   "he / she / other", no caption under any of them: a reader picks the
   likeness that looks most like the person in their head, the way you would
   pick a face out of a crowd, and the app records which drawing they picked.
   Nothing is inferred from it and nothing is asked. */

const solid = { fill: 'currentColor', stroke: 'none' } as const

/** The profile every cameo is cut from: crown, brow, nose, lip, chin, jaw,
    skull. Face to the left, the way a cameo is always mounted. */
const HEAD =
  'M24 6.6 C 19.6 6.6 16.8 9.6 16.2 13.6 C 16 15 15.7 16.4 15.4 17.4 ' +
  'C 15.1 18.3 15.6 18.8 16.3 19.1 C 15.3 20 13.5 21.4 13.1 22.2 ' +
  'C 12.7 23 13.6 23.4 15.1 23.6 C 16.1 23.8 15.9 24.3 15.5 24.9 ' +
  'C 15.1 25.5 15.3 26 15.9 26.3 C 15.7 27.4 15.8 28.7 16.6 29.7 ' +
  'C 18.1 31.6 20.8 32.6 23.7 32.6 C 29 32.6 32.8 29.3 34 24.4 ' +
  'C 34.8 21.1 35 17.2 34.1 13.9 C 33.1 9.7 29 6.6 24 6.6 Z'

/** Neck and shoulders. Shared by every cameo — the styles differ above the
    collar, which is where anyone looks anyway. */
const BUST =
  'M19.8 29.2 C 19.8 33 18.8 34.8 15.8 36 C 11.4 37.8 8.6 41 8 45.4 ' +
  'L 40 45.4 C 39.4 41 36.4 37.6 31.6 36 C 28.6 35 27.6 33 27.6 29.2 Z'

/* A crown of hair with a little weight to it, used on its own and as the base
   under the knot, the braid, the locs, the beard and the spectacles. It sits
   proud of the skull and comes to a point at the temple, so even the plainest
   head in the set is not the bare one. */
const CROP =
  'M14.8 18.4 C 14.3 12.2 18 5 24.7 5 C 31.6 5 36.2 10.4 36.2 17.7 ' +
  'C 36.2 21.3 35.6 24.2 34.6 26.5 C 35 20.5 34.2 14.7 31.5 11.8 ' +
  'C 28.4 8.5 22.3 9.4 18.7 12.7 C 17 14.3 15.6 16.2 14.8 18.4 Z'

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

/* Each entry is everything above the collar. The head is drawn inside the
   entry rather than once underneath, because two of them need to change it:
   the wrap covers the crown outright, and the spectacles cut a lens out of the
   silhouette with an even-odd rule, which only works when the lens and the
   head are subpaths of the same fill. */
const FACES: Record<AvatarId, React.ReactNode> = {
  /* Nothing added. Not a placeholder — a shaved head is a look, and having it
     in the set is what keeps the absence of hair from reading as "we could not
     find your person". */
  shaved: <path {...solid} d={HEAD} />,

  crop: (
    <g {...solid}>
      <path d={HEAD} />
      <path d={CROP} />
    </g>
  ),

  /* Blunt, and ending on the jaw — the whole style is one decision about where
     to stop, so the outline stops there hard instead of tapering. */
  bob: (
    <g {...solid}>
      <path d={HEAD} />
      <path
        d="M14.6 18.6 C 14.2 12 18 5 24.8 5 C 32 5 36.8 10.2 36.8 18
           L 36.8 29 C 36.8 31.4 35.2 32.8 33 32.8 C 31.3 32.8 30.2 32 29.5 30.6
           C 32 27 32.5 21 31.6 16 C 30.6 10.4 26 8.6 21.4 10.6
           C 18 12 15.8 15 14.6 18.6 Z"
      />
    </g>
  ),

  /* Past the shoulder, with the flare a length like this actually has. */
  long: (
    <g {...solid}>
      <path d={HEAD} />
      <path
        d="M14.6 18.6 C 14.2 12 18 5 24.8 5 C 32 5 36.8 10.2 36.8 18
           C 36.8 26.2 38.6 34.2 39.8 41.8 C 40.1 43.6 38.9 44.9 37 44.9
           C 35.2 44.9 34 43.7 33.8 41.8 C 33 34.8 32.7 26.2 31.6 16
           C 30.6 10.4 26 8.6 21.4 10.6 C 18 12 15.8 15 14.6 18.6 Z"
      />
    </g>
  ),

  /* Seven overlapping rounds. The bumps are the point: on a silhouette,
     texture can only exist as a broken edge. */
  curls: (
    <g {...solid}>
      <path d={HEAD} />
      <circle cx="22.4" cy="6.4" r="4.6" />
      <circle cx="29.6" cy="7.4" r="4.6" />
      <circle cx="34.8" cy="12.4" r="4.4" />
      <circle cx="36.6" cy="19" r="4.2" />
      <circle cx="35.4" cy="25.2" r="4" />
      <circle cx="17.2" cy="11.2" r="4.2" />
      <circle cx="15" cy="16.6" r="3.4" />
    </g>
  ),

  bun: (
    <g {...solid}>
      <path d={HEAD} />
      <path d={CROP} />
      <circle cx="37.6" cy="9.6" r="4.8" />
      <path d="M32 9.4 C 33.6 7.4 35.6 6.6 37.6 6.8 L 37.6 12.4 C 35.4 12.6 33.4 11.6 32 9.4 Z" />
    </g>
  ),

  /* One plait, scalloped down the edge so it reads as woven rather than as a
     rope or a tail. */
  braids: (
    <g {...solid}>
      <path d={HEAD} />
      <path d={CROP} />
      <path
        d="M35 18 C 37.3 18 38.4 20 37.6 22 C 36.8 24 38.4 25.4 38 27.6
           C 37.6 29.8 35.8 30.6 36.2 32.8 C 36.6 35 38 36.6 37.4 38.8
           C 36.9 40.8 35.3 41.7 33.7 41.2 C 32.1 40.8 31.5 39.2 32.1 37.4
           C 32.7 35.6 31.3 34.2 31.5 32 C 31.7 29.8 33.4 28.8 33 26.8
           C 32.6 24.8 31 23.6 31.6 21.4 C 32.1 19.5 33.3 18 35 18 Z"
      />
    </g>
  ),

  /* Four, at four lengths. Even ends would read as a comb. */
  locs: (
    <g {...solid}>
      <path d={HEAD} />
      <path d={CROP} />
      <rect x="33.4" y="12" width="2.9" height="21" rx="1.45" />
      <rect x="36.2" y="16" width="2.9" height="16" rx="1.45" />
      <rect x="29.8" y="7.6" width="2.9" height="10" rx="1.45" />
      <rect x="24.4" y="4.6" width="2.9" height="8" rx="1.45" />
    </g>
  ),

  /* Cloth, not hair: the dome is smooth and taller than a skull, the hairline
     is gone, and the knot sits where a knot sits. */
  wrap: (
    <g {...solid}>
      <path d={HEAD} />
      <path
        d="M15.2 20.6 C 14.4 12.2 18.6 4 25.2 4 C 32.4 4 37.4 9.9 37.4 18
           C 37.4 22.4 36.6 25.9 35.2 28.2 L 31.4 28.2
           C 33 24.8 33.7 21.1 33.7 18 C 33.7 12.9 30.3 9.2 25.2 9.2
           C 20.2 9.2 16.8 13.4 16.6 20.6 Z"
      />
      <path
        d="M34.2 23.8 C 38.2 24.2 40.8 26.6 40.8 29.4 C 40.8 31.5 39.1 32.8 37.2 32
           C 34.9 31.1 33.8 28.3 34.2 23.8 Z"
      />
    </g>
  ),

  /* The visor is the whole silhouette — a shape that reaches out past the brow
     is the one hat everybody recognises from the side. */
  cap: (
    <g {...solid}>
      <path d={HEAD} />
      <path d="M15.6 17.2 C 15.6 10.2 19.6 5.2 25.2 5.2 C 31.3 5.2 35.6 10 35.6 17 C 35.6 17.9 35.5 18.6 35.4 19.2 L 15.8 19.2 C 15.7 18.5 15.6 17.9 15.6 17.2 Z" />
      <path d="M35.4 16.7 C 35.4 19.6 34.4 20.7 32 20.9 C 24 21.7 15 21.1 9.6 19.9 C 8.2 19.6 8.2 18 9.6 17.6 C 16 15.8 27 15.3 35.4 16.7 Z" />
    </g>
  ),

  /* Jaw and chin carried forward and down. In profile a beard is a change to
     the *outline* of the face, which is the only place it could show. */
  beard: (
    <g {...solid}>
      <path d={HEAD} />
      <path d={CROP} />
      <path
        d="M16.1 22.4 C 15 24 14.5 25.8 14.5 27.6 C 14.5 32.6 18.4 36.4 23.6 36.4
           C 29.1 36.4 33.1 32.5 33.9 26.4 C 34.3 23.4 34.1 20.7 33.6 18.6
           C 33.6 22.6 32.7 26.2 30.6 28.8 C 28.1 31.8 24.3 32.6 21 31.1
           C 18.7 30.1 17.3 27.8 16.9 24.8 C 16.8 23.9 16.5 23.1 16.1 22.4 Z"
      />
      <path d="M15.6 23.4 C 17.4 23.2 19.4 23.6 20.6 24.4 C 18.8 24.6 16.9 24.4 15.8 24 Z" />
    </g>
  ),

  /* The lens is cut out of the head with an even-odd fill rather than drawn on
     top of it, because ink on ink is nothing. The little bar in front is the
     rim clearing the brow — that protrusion is what makes the hole read as
     glass and not as an eye. */
  specs: (
    <g {...solid}>
      <path
        fillRule="evenodd"
        d={`${HEAD} M22.5 20.5 A 3.5 3.5 0 1 1 15.5 20.5 A 3.5 3.5 0 1 1 22.5 20.5 Z`}
      />
      <path d={CROP} />
      <path d="M15.4 19.1 C 14.1 18.9 13.1 19.2 12.6 19.9 C 12.1 20.6 12.3 21.4 13.1 21.9 L 14.4 21.9 C 13.9 21.4 13.8 20.8 14.1 20.3 C 14.4 19.8 14.9 19.4 15.6 19.3 Z" />
    </g>
  ),
}

interface AvatarProps {
  id?: string
  size?: number
}

/* An entry written before this set existed, or one carrying an id from a later
   version of the app, still has to draw a person. Falling back to the plainest
   head is deliberate: it is a real choice in the set, so nothing on screen
   ever looks broken. */
function resolve(id: string | undefined): AvatarId {
  return AVATARS.includes(id as AvatarId) ? (id as AvatarId) : 'shaved'
}

/** One cut cameo, on a transparent ground. The medallion around it belongs to
    the card, not to the drawing — this is ink, and it takes the colour of
    whatever it is printed on. */
export function Avatar({ id, size = 44 }: AvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      {FACES[resolve(id)]}
      <path {...solid} d={BUST} />
    </svg>
  )
}

export default Avatar
