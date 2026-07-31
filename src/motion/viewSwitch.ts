import { flushSync } from 'react-dom'

/* How books move between Stack, Shelf and Grid.

   Morph is the answer. Each book carries a view-transition-name, so the
   browser tracks the same book from its stack position to its spine to its
   grid cell and animates the real gap — the only approach where a book
   genuinely travels rather than being redrawn somewhere else.

   The cross-fade below is not a second option; it is the fallback, and it
   earns its place twice: browsers without the View Transitions API, and
   readers who asked for reduced motion. */

export type FadePhase = 'idle' | 'out' | 'in'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Milliseconds from a duration token, so JS timing can't drift from CSS. */
function ms(token: string, fallback: number) {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim()
  const n = raw.endsWith('ms')
    ? parseFloat(raw)
    : raw.endsWith('s')
      ? parseFloat(raw) * 1000
      : NaN
  return Number.isFinite(n) ? n : fallback
}

/* The outgoing view settles down and out, the incoming one rises in on a
   stagger. Nothing is tracked between views, so no book travels: it reads as
   turning to a different page of the same shelf. Timing lives in Library's
   stylesheet; this only drives the phase. */
function crossfade(
  apply: () => void,
  setPhase: (p: FadePhase) => void,
  schedule: (fn: () => void, delay: number) => void,
) {
  setPhase('out')
  schedule(() => {
    flushSync(apply)
    setPhase('in')
    schedule(() => setPhase('idle'), ms('--dur-move', 420))
  }, ms('--dur-quick', 180))
}

/** Runs `apply` (the setState that swaps the view) with the books in motion. */
export function runSwitch(
  apply: () => void,
  ctx: {
    setPhase: (p: FadePhase) => void
    schedule: (fn: () => void, delay: number) => void
  },
) {
  // Reduced motion doesn't mean no motion — a hard cut leaves you to work out
  // on your own that the shelf changed. The cross-fade is what's left after
  // the token swap strips it to pure opacity: --travel is 0 so nothing slides,
  // --stagger is 0 so the books go together. A dissolve, and nothing travels.
  if (prefersReducedMotion()) {
    return crossfade(apply, ctx.setPhase, ctx.schedule)
  }

  const start = (
    document as Document & { startViewTransition?: (cb: () => void) => void }
  ).startViewTransition

  // No View Transitions API — the cross-fade is the graceful floor, not a
  // hard cut, so the switch still reads as a change on older engines.
  if (!start) {
    return crossfade(apply, ctx.setPhase, ctx.schedule)
  }

  start.call(document, () => flushSync(apply))
}
