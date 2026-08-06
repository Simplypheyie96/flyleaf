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

   THE SILHOUETTE IS THE BRAND: a leaf body, round on three corners, squared at
   the bottom-left where the stem meets it. It is the same corner geometry the
   primary button uses (`--radius-leaf`), so a button and the mark read as the
   same family without the leaf being stamped on anything. */

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

export function Leaf({ size = 32, className }: { size?: number; className?: string }) {
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
      <path
        d="M256 76 C 355 76 436 157 436 256 C 436 355 355 436 256 436
           L 112 436 C 92 436 76 420 76 400 L 76 256 C 76 157 157 76 256 76 Z"
        className={styles.leafBody}
      />
      {/* A midrib out of the stem corner, and one side vein branching off it.

          Both details matter. The midrib STOPS SHORT of the far edge: a stroke
          that touches the outline on both sides turns any rounded shape into a
          prohibition sign, and an earlier draft of this read as exactly that.
          And the side vein starts ON the midrib rather than floating beside it
          — a branch is venation, a second free-standing stroke is a scribble.

          The install icon carries three veins, which it can afford at 512px on
          a home screen. At the 32–44px this is actually used, two is the most
          that survives. */}
      <g
        className={styles.leafVeins}
        fill="none"
        strokeWidth="20"
        strokeLinecap="round"
      >
        <path d="M120 398 Q 236 326 344 196" />
        <path d="M234 311 Q 266 280 296 232" />
      </g>
    </svg>
  )
}

function Wordmark({ markOnly = false, size = 32, className, title }: WordmarkProps) {
  const classes = [styles.wordmark, className].filter(Boolean).join(' ')

  if (markOnly) {
    return (
      <span className={classes} role={title ? 'img' : undefined} aria-label={title}>
        <Leaf size={size} />
      </span>
    )
  }

  return (
    <span className={classes} role={title ? 'img' : undefined} aria-label={title}>
      <Leaf size={size} />
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
