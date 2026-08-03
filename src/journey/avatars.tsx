/* The face, held at arm's length.

   Everything that actually draws a person lives in ./face, and it is expensive
   to carry: the generator validates its own style sheet on the way in, and the
   validator alone is over a megabyte before the drawing instructions are
   counted. Loaded flat, that is 71KB gzipped added to the first thing the app
   downloads — paid by every reader on the shelf, before a single character has
   been kept.

   So it is not loaded flat. This file is the seam: it holds the shape every
   card already calls, and reaches for the generator only once a person is
   actually on screen. A reader who never keeps a character never downloads it.

   Nothing here draws anything. Two lines of real work: refuse an empty name,
   and wait for the module. */

import { lazy, Suspense } from 'react'

const Face = lazy(() => import('./face'))

interface AvatarProps {
  name?: string
  /** What the reader wrote about this person. Read for cues, never shown. */
  note?: string
  /** How many times the reader has asked for a different face. */
  face?: number
}

/** The person, filling whatever it is mounted in. The mount — its shape, its
    fill, its ring — belongs to the card, which is how one picture can be a
    small oval pressed into a journey card and a portrait plate on another.

    Nothing at all when there is no name, rather than a placeholder: an empty
    mount is an unfilled plate, which is a real thing and reads as one. A
    question mark or a grey head would read as a bug.

    The same is true of the wait. Every mount in the app draws its own paper
    and its own ring before this fills, so the fallback is that unfilled plate
    — which is why it is nothing. A spinner inside a 46-pixel oval would be a
    louder event than the picture it is standing in for. */
export function Avatar({ name, note, face }: AvatarProps) {
  const known = name?.trim()
  if (!known) return null
  return (
    <Suspense fallback={null}>
      <Face name={known} note={note} face={face} />
    </Suspense>
  )
}

export default Avatar
