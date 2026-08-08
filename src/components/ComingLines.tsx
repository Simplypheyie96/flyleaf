/* One promise at a time, under the first-run card.

   This replaces a rabbit holding a thought bubble. Three attempts at drawing
   that creature all landed somewhere between odd and unpleasant, and the
   bubble it was thinking into had to be explained by a label anyway — which is
   a caption on a caption on a drawing that was not earning either. What the
   section actually needed was small: a lead-in that says WHEN this happens,
   and one sentence at a time saying what. The illustration budget for this
   screen went into the book at the top of the card instead, where a reader
   looks first.

   Rotating rather than listed: three promises printed as bullets are a feature
   table, true and unread; one line that changes is a thing being said.

   ACCESSIBILITY, and it is not optional — this is auto-updating content
   (WCAG 2.2.2), so it owes the reader a way to stop it:
   · pointer over it or keyboard focus inside it pauses the cycle, and the
     block is focusable so that is reachable without a mouse;
   · reduced motion never starts the cycle and prints all three instead — no
     information exists only for people who can watch it move;
   · no live region. A line announcing itself every six seconds would talk over
     whatever the reader was actually doing. */

import { useEffect, useState } from 'react'
import styles from './ComingLines.module.css'

const HOLD = 6000

interface Props {
  /** The quiet lead-in above the lines — what makes them make sense. */
  lead: string
  lines: readonly string[]
}

function ComingLines({ lead, lines }: Props) {
  const [at, setAt] = useState(0)
  const [held, setHeld] = useState(false)

  const still =
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (held || still || lines.length < 2) return
    const t = setInterval(() => setAt((i) => (i + 1) % lines.length), HOLD)
    return () => clearInterval(t)
  }, [held, still, lines.length])

  return (
    <div
      className={styles.wrap}
      tabIndex={0}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <p className={styles.lead}>{lead}</p>

      {still ? (
        <ul className={styles.all}>
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        /* ALL THREE ARE IN ONE GRID CELL, one visible. Rendering only the
           current line would resize the block on every swap — these are one
           and two lines long — and a paragraph that grows and shrinks under
           its own text is a jumping layout. Stacked, the block takes the
           height of the longest and never moves again. The inactive two carry
           `visibility: hidden`, which takes them out of the accessibility tree
           as well as out of sight. */
        <div className={styles.deck}>
          {lines.map((line, i) => (
            <p
              key={line}
              className={i === at ? styles.lineOn : styles.line}
              aria-hidden={i !== at}
            >
              {line}
            </p>
          ))}
        </div>
      )}

      {!still && lines.length > 1 && (
        <span className={styles.marks} aria-hidden="true">
          {lines.map((line, i) => (
            <i key={line} className={i === at ? styles.markOn : styles.mark} />
          ))}
        </span>
      )}
    </div>
  )
}

export default ComingLines
