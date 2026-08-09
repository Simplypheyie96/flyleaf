/* CHOOSING THE JACKET.

   Deliberately not a destination. The owner's framing was that this is a
   by-the-way — most readers will take whatever cover arrives and never think
   about it — so it is never a row of its own with a label explaining itself.
   It hangs off the cover the reader is already looking at, in both places it
   exists: a small mark on the corner of that cover, and a strip of the
   alternatives that unfolds under it.

   A strip rather than a modal grid, and the same unfolding idiom the date
   picker in the add sheet already uses, so the sheet gains a behaviour it
   already had rather than a new kind of surface. Horizontal because covers
   are tall: five of them across a phone is one comfortable scroll, where a
   grid of five would push the button that finishes the flow off the screen.

   The tiles are real covers at real proportions and nothing else — no
   captions, no edition years. The catalogues do not agree on edition data
   well enough to print it, and the whole question here is one the eye
   answers: that one, not that one. */

import BookCover from './BookCover'
import { CheckIcon, EditIcon } from './TabIcons'
import { DRAWN } from '../books/covers'
import styles from './CoverChoice.module.css'

/** The little mark that opens the strip. Sits on the bottom edge of the cover
 *  it changes, half over the jacket and half below it, inside a positioned
 *  wrapper the caller owns — so it costs the layout nothing and needs no row,
 *  no label, and no space of its own anywhere. It began life as a disc in the
 *  corner and covered too much of the artwork; on the edge it hides a sliver
 *  of margin instead of a piece of the picture.
 *
 *  Absent entirely when there is nothing to choose between, which is the same
 *  test `CoverStrip` makes: a mark that opens an empty drawer is worse than
 *  no mark. */
export function SwapCoverTab({ covers, open, onToggle }: {
  covers: string[]
  open: boolean
  onToggle: () => void
}) {
  if (covers.length === 0) return null
  return (
    <button
      type="button"
      className={styles.swap}
      onClick={onToggle}
      aria-expanded={open}
      aria-label={`Change the cover — ${covers.length + 1} to choose from`}
      title="Change the cover"
    >
      <EditIcon size={13} />
    </button>
  )
}

/** The same mark, on a book that is already on the shelf — where it opens the
 *  whole edit sheet rather than a strip of jackets, and where it is therefore
 *  never absent. On the shelf the question is not only "which cover" but "is
 *  any of this right", and a book that arrived from another app with no
 *  author and no jacket is precisely the book with nothing to swap between.
 *  Hiding the way in from the reader who needs it most was the bug. */
export function EditBookTab({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={styles.swap}
      onClick={onToggle}
      aria-expanded={open}
      aria-label="Edit this book"
      title="Edit this book"
    >
      <EditIcon size={13} />
    </button>
  )
}

interface Props {
  title: string
  author: string
  /** Every candidate, in catalogue order — `book.covers` itself, unrotated. */
  covers: string[]
  /** Index into `covers`, or `DRAWN`. */
  pick: number
  onPick: (pick: number) => void
}

/** The strip of alternatives. Renders nothing at all when there is no real
 *  choice to make: one catalogue cover and our drawn one is a choice, but a
 *  book with no catalogue cover at all is already wearing the only jacket
 *  there is, and offering to swap it for itself is a control that lies. */
export function CoverStrip({ title, author, covers, pick, onPick }: Props) {
  if (covers.length === 0) return null

  return (
    <div className={styles.strip} role="radiogroup" aria-label="Cover">
      {[...covers.map((_, i) => i), DRAWN].map((index) => {
        const on = index === pick
        return (
          <button
            key={index}
            type="button"
            role="radio"
            aria-checked={on}
            className={styles.tile}
            data-on={on || undefined}
            onClick={() => onPick(index)}
            /* The only words in the control, and they are for the screen
               reader alone — sighted readers are comparing pictures. */
            aria-label={
              index === DRAWN ? 'Flyleaf’s drawn cover' : `Cover ${index + 1} of ${covers.length}`
            }
          >
            <BookCover
              size="thumb"
              width={54}
              title={title}
              author={author}
              /* One url per tile, so a tile shows the cover it stands for and
                 cannot quietly fall through to its neighbour's. The drawn tile
                 gets an empty list, which is what draws ours. */
              covers={index === DRAWN ? [] : [covers[index]]}
              className={styles.tileCover}
            />
            {on && (
              <span className={styles.ticked} aria-hidden="true">
                <CheckIcon size={13} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default CoverStrip
