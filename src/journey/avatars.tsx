/* The mark that stands for a character.

   Two drawings have been thrown out here for the same reason, and it is worth
   writing the reason down so a third one does not get attempted.

   The first was a circle with a smaller circle on an arc — the account glyph
   every phone puts in the corner of every settings screen. The second was a
   set of twelve paper cameos: left-facing silhouettes, cut from black stock,
   picked from a grid the reader scrolled through. The cameo was the better
   object and it still failed, in two ways at once. Twelve solid heads at 34px
   are one repeated shape with the differences pushed out to the crown, so the
   picker asked a reader to choose between drawings they could not tell apart;
   and worse, a picture of a face *claims a face*. Aunt Bel already has one, in
   the reader's head, from the sentences in the book. Ours is not theirs, and
   putting ours on the card writes over theirs.

   That is the same argument the place cards settled with a map: the drawing has
   to answer a question the book cannot contradict. For a place, that question
   is *where*. For a person it is *who*, and the answer a book has always used
   for that is the name — so the mark is the name's own initial, cut into a
   portrait oval and reversed out of it, the way a name is stamped on a plate
   under a portrait or on the plate inside a cover.

   It is a letter, which is the most ordinary avatar on the internet, so it is
   worth being exact about what keeps it from being that one. It is set in the
   book face at 400 rather than a UI sans at 600. It sits in an oval taller than
   it is wide — a cameo mount, not a bubble. And the ground is filled and the
   letter reversed, so it reads as something pressed rather than something
   defaulted to. None of that is decoration on a fallback; it is the object.

   The picker went with the faces. There is nothing to pick any more: a reader
   who has typed the name has already said everything this mark needs. */

import s from './avatars.module.css'

/* An article at the front of a name is not what the name is about. "The boy
   from the ferry" and "The younger brother" both stamp T, which is a plate that
   tells you nothing; B and Y are two different people at a glance. Nothing else
   is stripped — a name that starts with a title keeps it, because "Aunt Bel" is
   how the reader thinks of her and A is the letter they would write. */
const ARTICLE = /^(?:the|a|an)\s+/i

/** The letter a name is stamped with: the first one in it, past any article,
    upper-cased in the reader's own locale. Empty when there is no letter to
    take — a name of digits or punctuation stamps nothing rather than stamping
    something wrong. */
export function initial(name: string | undefined): string {
  const found = name?.replace(ARTICLE, '').match(/\p{L}/u)
  return found ? found[0].toLocaleUpperCase() : ''
}

interface AvatarProps {
  name?: string
  /** The mount's own size. The letter is set from it, not from the page. */
  size?: number
}

/** One stamped initial, on a transparent ground. The oval around it belongs to
    the card — this is ink, and it takes the colour of whatever it is pressed
    into, which is how the same mark can be reversed out of a filled plate on
    one card and inked onto paper on another.

    Nothing at all when there is no letter, rather than a placeholder: an empty
    mount is an unlettered plate, which is a real thing and reads as one. A
    question mark or a dash would read as a bug. */
export function Avatar({ name, size = 44 }: AvatarProps) {
  const letter = initial(name)
  if (!letter) return null
  /* 0.68 of the mount, which lands the cap at a little under half its height.
     Smaller than that and the plate reads as a badge with a letter on it rather
     than as a letter that has been stamped into a plate; larger and the mount
     stops being a mount. */
  return (
    <span className={s.monogram} style={{ fontSize: `${size * 0.68}px` }} aria-hidden="true">
      {letter}
    </span>
  )
}

export default Avatar
