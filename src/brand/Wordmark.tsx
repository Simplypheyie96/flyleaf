import type { CSSProperties } from 'react'
import styles from './brand.module.css'

/* The mark, in one place.

   It existed twice as `<img src="/leaf-icon.svg">` — the install icon, borrowed
   for the splash and the welcome. That file is built for a home screen: a sky
   panel with rounded corners, white leaf, blue veins, every colour baked in.
   On a home screen that is exactly right. Inside the app it is wrong twice
   over: the panel puts a blue tile on a blue sky, and the baked colours do not
   know it is night.

   So the same silhouette is drawn here instead, in the app's own tokens — the
   paper the cards are made of, the ink they are written in, the accent the
   handwriting uses. The install icon keeps its panel and stays where it
   belongs; this is the mark as it appears on paper.

   THE MARK IS THE ROSETTE, AND IT WAS ALREADY IN THE APP.

   Five drawings were thrown away here — a disc with a branch over it, a
   turned-back page corner, a lens cut from two arcs, and two variations on an
   open book — and the whole exercise was a mistake, because the app already
   had a mark and nobody had noticed. The blossom is stitched into every
   generated cover in the library, and it is the glyph on the button that keeps
   something on a book's page: the one shape a reader touches on the way to
   doing the thing this app is for. Meanwhile the splash and the welcome showed
   a book. Two marks is not a richer identity, it is a disconnect — you cannot
   tell someone what your app looks like if it looks like two things.

   So this is KeepIcon, at 512 instead of 24. Not a version of it, not a
   redraw in its spirit: the identical construction, multiplied by 512/24.
   Petal centres sit 5.8 from the middle of a 24 box, each an ellipse 3.5 long
   by 2.8 across lying on its own radius, 72° apart; inner tips reach 2.3 and
   the eye is 1.8, leaving a half-unit ring of air. Those numbers × 21.3333 are
   the ones below, which is why they look arbitrary and are not.

   Radial, so it has no wrong way up and no optical centring to fudge — its
   bounding box is square on the 512 box in both axes. Solid, with no keyline:
   at 20px a fill and its outline are the same few pixels arguing and the whole
   thing greys out. And a flower is one of about four silhouettes a person can
   name from the corner of their eye, which is the only test a mark at 20px in
   a tab bar actually has to pass. */

interface WordmarkProps {
  /** Just the leaf, no logotype. */
  markOnly?: boolean
  /** Height of the mark in px; the logotype scales with it. */
  size?: number
  className?: string
  /** Give it a label when it is the only thing naming the app on a screen;
      leave it off when the word "Flyleaf" is already written beside it. */
  title?: string
}

/** Six subpaths in one path: five petals from twelve o'clock round, then the
    eye. Each petal is two half-arcs between the ends of its own major axis,
    with the axis rotation set to the same angle as the radius it sits on —
    -90, -18, 54, 126, 198.

    Nothing overlaps and everything winds the same way, so nonzero and even-odd
    fill this identically and there is no rule to get wrong. The eye is a
    free-standing disc rather than a hole, for the reason KeepIcon gives: a
    knocked-out centre needs a background to knock out to, and this mark sits on
    open sky, on a home-screen tile and on paper.

    THE FOUR FILES MOVE TOGETHER. public/leaf-icon.svg and
    public/leaf-icon-maskable.svg carry this exact `d`, differing only by a
    scale transform for the tile margin, and the PNGs beside them are rendered
    from those. And src/components/TabIcons.tsx holds the same drawing at 24 —
    that one is the source; these numbers are it × 21.3333. Change one, change
    all five. */
export const MARK =
  'M256 57.6 A74.67 59.73 -90 1 1 256 206.93 A74.67 59.73 -90 1 1 256 57.6 Z' +
  'M444.69 194.69 A74.67 59.73 -18 1 1 302.66 240.85' +
  ' A74.67 59.73 -18 1 1 444.69 194.69 Z' +
  'M372.61 416.51 A74.67 59.73 54 1 1 284.84 295.68' +
  ' A74.67 59.73 54 1 1 372.61 416.51 Z' +
  'M139.39 416.51 A74.67 59.73 126 1 1 227.16 295.68' +
  ' A74.67 59.73 126 1 1 139.39 416.51 Z' +
  'M67.31 194.69 A74.67 59.73 198 1 1 209.34 240.85' +
  ' A74.67 59.73 198 1 1 67.31 194.69 Z' +
  'M217.6 256 A38.4 38.4 0 1 1 294.4 256 A38.4 38.4 0 1 1 217.6 256 Z'

/* Kept the export name it had when it drew a leaf, then a book, and now the
   blossom. Renamed to Mark, because that is the only thing it has ever
   actually been and the next redraw should not have to argue with a noun. */
export function Mark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d={MARK} className={styles.markBody} />
    </svg>
  )
}

function Wordmark({ markOnly = false, size = 32, className, title }: WordmarkProps) {
  const classes = [styles.wordmark, className].filter(Boolean).join(' ')
  /* Handed to CSS because the air beside the mark is a fraction of the MARK,
     not a spacing step — the drawing leaves a fixed share of its own box empty
     on each side, and that dead margin scales with `size` while a token does
     not. brand.module.css does the sum. */
  const sized = { '--mark-size': `${size}px` } as CSSProperties

  if (markOnly) {
    return (
      <span className={classes} style={sized} role={title ? 'img' : undefined} aria-label={title}>
        <Mark size={size} />
      </span>
    )
  }

  return (
    <span className={classes} style={sized} role={title ? 'img' : undefined} aria-label={title}>
      <Mark size={size} />
      {/* Typeset by us, in the display serif, never drawn as paths — the name
          then inherits every weight and hinting fix the type system gets. */}
      <span
        className={styles.logotype}
        style={{ fontSize: `${Math.round(size * 0.72)}px` }}
        aria-hidden={title ? true : undefined}
      >
        Flyleaf
      </span>
    </span>
  )
}

export default Wordmark
