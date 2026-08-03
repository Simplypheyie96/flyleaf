/* The mark that stands for a character: a drawn person.

   The drawing itself lives in cards/art.tsx beside the map, because it is the
   same kind of object — penned, seeded, pure, and never fetched — and a second
   pen kept somewhere else drifts away from the first one. All this file owns is
   the question that file cannot answer: which seed a name turns into.

   Three marks have stood here and the note in art.tsx says why each went. The
   short version, so nobody has to go and read it: an account glyph said
   nothing, twelve cut-paper silhouettes were one shape twelve times, and the
   stamped initial that replaced them was my own substitution for a picture I
   did not want to draw. A character card exists to show a person. */

import { Portrait } from './cards/art'
import s from './avatars.module.css'

/* An article at the front of a name is not what the name is about, and it is
   the one part of a name that says nothing about who has it: "The boy from the
   ferry" and "The younger brother" would otherwise draw from the same three
   letters before they diverge, and a hash cares about every one of them.
   Nothing else is stripped — "Aunt Bel" is how the reader thinks of her, title
   and all. */
const ARTICLE = /^(?:the|a|an)\s+/i

/** A name turned into a number, case- and space-insensitively so that "aunt
    bel", "Aunt  Bel" and "Aunt Bel" are one person rather than three.

    FNV-1a, for the one property that matters: a single changed letter has to
    move the whole number, or "Marek" and "Marec" get the same face and the
    reader is looking at a bug. Nothing here is a checksum and nothing is
    stored — it is a pure function from a name to a drawing, so a character
    keeps their face across devices with nothing written down anywhere. */
export function nameSeed(name: string): number {
  const key = name.replace(ARTICLE, '').toLocaleLowerCase().replace(/\s+/g, ' ').trim()
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

interface AvatarProps {
  name?: string
}

/** The person, on a transparent ground, filling whatever it is mounted in. The
    mount — its shape, its fill, what colour the ink comes out — belongs to the
    card, which is how the same drawing can be a small oval pressed into a
    journey card and a portrait plate on another.

    It fills rather than sits inside, because it is a bust and a bust runs off
    the bottom of its own frame; a figure floating with air all round it is a
    sticker. Whatever mounts it has to clip.

    Nothing at all when there is no name, rather than a placeholder: an empty
    mount is an unfilled plate, which is a real thing and reads as one. A
    question mark or a grey head would read as a bug. */
export function Avatar({ name }: AvatarProps) {
  const key = name?.trim()
  if (!key) return null
  return <Portrait seed={nameSeed(key)} className={s.figure} />
}

export default Avatar
