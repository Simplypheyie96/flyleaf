/* One sheet, however many sheets there are.

   Every sheet in Flyleaf is the same object — a glass panel rising from the
   bottom edge, draggable away, closing on Escape — and the only thing that
   differs is what is printed on it. This holds the object; the caller holds
   the print. */

import { useEffect, useRef } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'
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

function Sheet({ open, onClose, label, name, children }: SheetProps) {
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
      <GlassSurface ref={panel} className={styles.panel}>
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
