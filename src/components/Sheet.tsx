/* One sheet, however many sheets there are.

   Every sheet in Flyleaf is the same object — a glass panel rising from the
   bottom edge, draggable away, closing on Escape — and the only thing that
   differs is what is printed on it. This holds the object; the caller holds
   the print. */

import { useEffect, useRef } from 'react'
import type { CSSProperties, PointerEvent, ReactNode, RefObject } from 'react'
import GlassSurface from './GlassSurface'
import styles from './Sheet.module.css'

interface SheetProps {
  open: boolean
  onClose: () => void
  /** The sheet's accessible name — what a screen reader announces on open. */
  label: string
  /** A view-transition name, unique per sheet. Without one, a sheet vanishes
      instantly from any transition it is part of, because the top layer is
      not snapshotted. */
  name: string
  /** Take the whole allowed height instead of only as much as the print needs.
      A sheet that exists to show one object — a picture, a draft — has to hand
      that object whatever room is left over, and it cannot do that while its
      own height is being decided by the object. Off by default: an ordinary
      sheet should be exactly as tall as the rows in it and no taller. */
  fill?: boolean
  children: ReactNode
}

/* How far down the sheet has to be dragged before letting go puts it away,
   and how fast a short drag has to be moving to count instead.

   Two tests rather than one, because there are two gestures here and they
   feel nothing alike: a deliberate push down the screen, and a quick flick
   off the bottom. Distance alone would ignore the flick; speed alone would
   dismiss a slow, careful drag that stopped short — which reads as the sheet
   ignoring you. */
const DISMISS_AT = 96
const FLICK = 0.5 // px per ms

function Sheet({ open, onClose, label, name, fill = false, children }: SheetProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const { panel, grabProps } = useDragToDismiss(onClose)

  /* A native dialog rather than a div with a high z-index: it takes the top
     layer, traps focus, makes the page behind it inert and closes on Escape,
     none of which is worth reimplementing by hand and all of which is worth
     having. */
  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  useKeyboardFit(dialog, open)
  useFieldInView(dialog, open)

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      style={{ '--sheet-name': name } as CSSProperties}
      aria-label={label}
      onClose={onClose}
      // Clicking the backdrop is a click on the dialog element itself, since
      // the panel inside it is what actually fills the sheet.
      onClick={(event) => event.target === dialog.current && onClose()}
    >
      <GlassSurface
        ref={panel}
        className={fill ? `${styles.panel} ${styles.fill}` : styles.panel}
      >
        {/* The grab handle. A sheet that can be pushed away has to say so —
            without it the only way out is a button in the corner, and every
            reader who has used a phone tries the drag first and concludes the
            sheet is stuck.

            Decorative, and deliberately not focusable: it is a second route
            out for a thumb, never the only one. Close and Escape are the
            routes for everyone else, which is what keeps a drag-only dismissal
            from locking out a keyboard or a screen reader. */}
        <div className={styles.grab} {...grabProps}>
          <span className={styles.grabber} aria-hidden="true" />
        </div>

        <div className={styles.inner}>{children}</div>
      </GlassSurface>
    </dialog>
  )
}

/* KEEPING THE SHEET ABOVE THE KEYBOARD.
   ═══════════════════════════════════════
   On a phone this is the difference between a sheet you can type into and one
   the owner reported: open Add a book, tap the field, and the whole panel is
   thrown off the top of the screen — the search box and every result with it.

   The cause is that iOS does not shrink the page when the keyboard arrives. It
   shrinks the VISUAL viewport and scrolls it down inside a layout viewport that
   is still full height. A modal dialog lives in the top layer, fixed to that
   unchanged layout viewport, so it keeps its full height — the bottom half now
   behind the keyboard — and the scroll carries it up and out of sight. Nothing
   in CSS sees this: `svh`, `dvh` and `100%` all still describe the tall
   viewport, because as far as layout is concerned nothing happened.

   visualViewport is the only thing that reports it, so the two numbers it gives
   are written onto the dialog as custom properties and the stylesheet does the
   rest: the sheet becomes exactly as tall as the space left above the keyboard,
   and moves down by however far the page was scrolled to compensate.

   Only while a keyboard is actually up. `covered` is also non-zero for a
   collapsing URL bar, which is a ~60px change that must not be mistaken for
   one — hence the floor. Below it every property is removed rather than set to
   zero, so a sheet with no keyboard in front of it renders through exactly the
   rules it always did. */
const KEYBOARD_AT = 120

function useKeyboardFit(dialog: RefObject<HTMLDialogElement | null>, open: boolean) {
  useEffect(() => {
    const el = dialog.current
    const view = window.visualViewport
    if (!open || !el || !view) return

    const clear = () => {
      el.style.removeProperty('--sheet-room')
      el.style.removeProperty('--sheet-shift')
      delete el.dataset.keyboard
    }

    const fit = () => {
      /* The keyboard is the difference between the layout viewport's height
         and the visual viewport's — and NOTHING ELSE. The first version of
         this also subtracted `offsetTop`, which looked like rigour and was
         the owner's bug: `offsetTop` is how far Safari has scrolled the
         visual viewport down, it scrolls it exactly when a field is focused,
         and at full scroll the subtraction cancelled the keyboard out. The
         test read "no keyboard", cleared every property, and handed back a
         full-height sheet pinned to a viewport that was scrolled away — the
         reported "the modal disappears when I want to type". Where the
         viewport IS cannot change how tall the keyboard is. */
      const covered = window.innerHeight - view.height
      if (covered < KEYBOARD_AT) {
        clear()
        return
      }
      el.style.setProperty('--sheet-room', `${view.height}px`)
      el.style.setProperty('--sheet-shift', `${view.offsetTop}px`)
      el.dataset.keyboard = 'up'
    }

    fit()
    /* Both events: `resize` is the keyboard arriving and leaving, `scroll` is
       Safari sliding the visual viewport around underneath it while the reader
       moves between fields. Missing the second one puts the sheet back where
       the bug had it, one field later. */
    view.addEventListener('resize', fit)
    view.addEventListener('scroll', fit)
    return () => {
      view.removeEventListener('resize', fit)
      view.removeEventListener('scroll', fit)
      clear()
    }
  }, [dialog, open])
}

/* KEEPING THE FIELD YOU ARE TYPING IN ON THE SCREEN.
   ═════════════════════════════════════════════════
   The hook above wins back the strip of screen the keyboard left, which is
   half the job. The other half is that the field being typed into has to be
   inside that strip, and nothing arranges for it: the owner's report was that
   the add-book sheet is hard to type in because you cannot see what you are
   typing.

   Two ways it goes wrong, and they are different failures.

   The browser scrolls a focused field into view on its own, but it does that
   against the layout it can see AT THE MOMENT OF FOCUS — which is the sheet at
   full height, before visualViewport has reported anything and before the
   panel has been resized. By the time the sheet is the short strip it should
   be, the browser's scroll is answering a question nobody asked any more, and
   the field it carefully revealed is under the keyboard.

   And moving between fields with the keyboard ALREADY up fires no viewport
   event at all — same keyboard, same height, nothing resized — so the fit hook
   never runs and the third field of a form stays below the fold with the caret
   blinking in it.

   Hence both triggers: after every fit, and on every focus change inside the
   sheet. The scroll is local to whichever region inside the sheet actually
   scrolls; nothing walks out to the page, which is the failure mode
   `scrollIntoView` has here and the reason it is not used. */

/* Air left above and below the field, so it clears the edge of its scroller
   rather than sitting flush against it — a caret hard against a boundary reads
   as cut off whether or not it is. */
const FIELD_AIR = 16

function scrollerFor(node: Element, within: Element) {
  let el: Element | null = node.parentElement
  while (el && el !== within) {
    const flow = getComputedStyle(el).overflowY
    if ((flow === 'auto' || flow === 'scroll') && el.scrollHeight > el.clientHeight + 1) return el
    el = el.parentElement
  }
  return null
}

function useFieldInView(dialog: RefObject<HTMLDialogElement | null>, open: boolean) {
  useEffect(() => {
    const el = dialog.current
    if (!open || !el) return

    let frame = 0
    const reveal = () => {
      cancelAnimationFrame(frame)
      /* A frame late on purpose. Focus, the keyboard's arrival and the panel's
         resize all land in the same tick, and a measurement taken inside it is
         a measurement of the layout being replaced. */
      frame = requestAnimationFrame(() => {
        const field = document.activeElement
        if (!(field instanceof HTMLElement) || !el.contains(field)) return
        if (!field.matches('input, textarea, select, [contenteditable]')) return
        const box = scrollerFor(field, el)
        if (!box) return
        const target = field.getBoundingClientRect()
        const frame_ = box.getBoundingClientRect()
        const below = target.bottom + FIELD_AIR - frame_.bottom
        const above = frame_.top + FIELD_AIR - target.top
        /* Whichever edge it is past, and never both — a field taller than its
           scroller would otherwise be tugged at from both ends. Below wins
           because that is the keyboard's side. */
        if (below > 0) box.scrollTop += below
        else if (above > 0) box.scrollTop -= above
      })
    }

    const view = window.visualViewport
    el.addEventListener('focusin', reveal)
    view?.addEventListener('resize', reveal)
    view?.addEventListener('scroll', reveal)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('focusin', reveal)
      view?.removeEventListener('resize', reveal)
      view?.removeEventListener('scroll', reveal)
    }
  }, [dialog, open])
}

/* Dragging the sheet down to put it away.

   Written against pointer events rather than touch events so it is one code
   path for a thumb, a trackpad and a mouse, and so `setPointerCapture` keeps
   the gesture attached to the handle even when the finger slides off it —
   which it always does, because the handle is 28px tall and the drag is
   hundreds.

   The transform is written straight to the node rather than held in state.
   A drag produces a pointermove per frame, and re-rendering a sheet with a
   twelve-row list inside it at that rate is how a gesture that should be free
   starts dropping frames. Nothing else on screen depends on the offset, so
   nothing else needs to know about it. */
function useDragToDismiss(onClose: () => void) {
  const panel = useRef<HTMLDivElement>(null)
  const drag = useRef<{ from: number; at: number; by: number } | null>(null)

  function offset(by: number, settle: boolean) {
    const el = panel.current
    if (!el) return
    el.style.transition = settle ? 'transform var(--dur-base) var(--ease-out)' : 'none'
    el.style.transform = by ? `translateY(${by}px)` : ''
  }

  function release(settle: boolean) {
    drag.current = null
    offset(0, settle)
  }

  return {
    panel,
    grabProps: {
      onPointerDown(event: PointerEvent<HTMLDivElement>) {
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { from: event.clientY, at: event.timeStamp, by: 0 }
      },
      onPointerMove(event: PointerEvent<HTMLDivElement>) {
        const d = drag.current
        if (!d) return
        // Downward only. A bottom sheet dragged up has nowhere to go, and
        // letting it lift off the bottom edge exposes the gap behind it.
        d.by = Math.max(0, event.clientY - d.from)
        offset(d.by, false)
      },
      onPointerUp(event: PointerEvent<HTMLDivElement>) {
        const d = drag.current
        if (!d) return
        const speed = d.by / Math.max(1, event.timeStamp - d.at)
        if (d.by > DISMISS_AT || speed > FLICK) {
          /* Cleared without a transition and then closed in the same tick, so
             the reset is never painted — the sheet simply goes. Leaving the
             offset on the node would reopen it that far down the screen. */
          release(false)
          onClose()
          return
        }
        release(true)
      },
      // The gesture was taken away from us mid-drag — a system swipe, a call
      // arriving. The sheet was never dismissed, so it goes back.
      onPointerCancel() {
        if (drag.current) release(true)
      },
    },
  }
}

export default Sheet
