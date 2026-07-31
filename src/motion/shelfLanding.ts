import { flushSync } from 'react-dom'

/* Putting a book onto the shelf.

   The cover the reader is looking at in the sheet and the book that appears on
   the shelf are the same object, so it should travel rather than be deleted in
   one place and drawn in another. Both ends already carry the same
   `view-transition-name` — it is the book's id, which is stable and is the
   same number that draws its cover — so the browser will tween the real gap
   between them for free.

   What is not free is knowing when the far end exists. The write goes to
   IndexedDB and comes back to the shelf through a live query, so at the moment
   the sheet closes the shelf has not rendered the new book yet, and a
   transition captured then would find nothing to travel to. Hence the small
   handshake below: the sheet waits, the shelf says when it is showing. */

let waiting: { id: number; done: () => void } | null = null

/** Resolves when the shelf has rendered `id` — or after `timeout`, so a shelf
    that never arrives (wrong route, a failed write) costs a dropped animation
    rather than a frozen page. */
function untilShelved(id: number, timeout = 1200) {
  return new Promise<void>((resolve) => {
    let timer = 0
    const done = () => {
      if (waiting?.id !== id) return
      waiting = null
      window.clearTimeout(timer)
      resolve()
    }
    waiting = { id, done }
    timer = window.setTimeout(done, timeout)
  })
}

/** Called by the shelf on every render with the ids it is currently showing. */
export function shelved(ids: number[]) {
  if (waiting && ids.includes(waiting.id)) waiting.done()
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Saves the book and closes the sheet, with the cover travelling to the shelf
    when there is a shelf on screen to travel to. */
export async function landOnShelf(
  id: number,
  // `unknown`, because Dexie's put resolves with the new key and this has no
  // use for it — the point is only that the write is done.
  save: () => Promise<unknown>,
  close: () => void,
) {
  const start = (
    document as Document & {
      startViewTransition?: (cb: () => Promise<void>) => { finished: Promise<void> }
    }
  ).startViewTransition

  /* No shelf on screen means no destination: adding from Home or Settings is
     a perfectly normal thing to do, and a book that flies to a corner of a
     screen with no books on it reads as a glitch, not as an arrival. The book
     is still added; it is just added quietly. */
  const onShelf = document.querySelector('[data-shelf]') !== null

  // Reduced motion keeps the outcome and drops the journey. Same for engines
  // without the API: the sheet closes, the book is there. Nothing is lost but
  // the flourish.
  if (!start || !onShelf || prefersReducedMotion()) {
    await save()
    close()
    return
  }

  document.documentElement.dataset.landing = ''
  const transition = start.call(document, async () => {
    /* Listen before writing, not after. The live query can deliver the new
       book — and the shelf can render it — while `save()` is still settling,
       and a listener registered after that has already happened hears nothing
       and sits out the full timeout. Which is exactly what it did: 1.2s of
       dead air before a 420ms move. */
    const landed = untilShelved(id)
    await save()
    // flushSync so the sheet is gone from the captured DOM rather than a
    // render tick later, which would leave it in the new snapshot as well.
    flushSync(close)
    await landed
  })

  try {
    await transition.finished
  } finally {
    delete document.documentElement.dataset.landing
  }
}
