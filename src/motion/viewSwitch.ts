import { flushSync } from 'react-dom'

/* Three ways to move books between Stack, Shelf and Grid.
   All three are here so the difference can be felt rather than described;
   once one is chosen the other two — and the trial UI in Library — go. */
export type SwitchEngine = 'morph' | 'crossfade' | 'flip'

export const SWITCH_ENGINES: SwitchEngine[] = ['morph', 'crossfade', 'flip']

export const ENGINE_KEY = 'flyleaf-switch-engine'

export function getStoredEngine(): SwitchEngine {
  const stored = localStorage.getItem(ENGINE_KEY)
  return SWITCH_ENGINES.includes(stored as SwitchEngine)
    ? (stored as SwitchEngine)
    : 'morph'
}

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

/* ---- A · Morph — the browser tweens the real thing ----
   Each book carries a view-transition-name, so the same book is tracked from
   its stack position to its spine to its grid cell and the browser animates
   the gap. The one approach where a book genuinely travels; also the one that
   needs a modern engine, hence the fallback. Timing lives in motion.css. */
function morph(apply: () => void) {
  const start = (
    document as Document & { startViewTransition?: (cb: () => void) => void }
  ).startViewTransition
  if (!start) {
    apply()
    return
  }
  start.call(document, () => flushSync(apply))
}

/* ---- B · Cross-fade — the page turns ----
   The outgoing view settles down and out, the incoming one rises in with a
   small stagger. Nothing is tracked between views, so no book travels; it
   reads as turning to a different page of the same shelf. Cheapest, works
   everywhere, and never distorts. Driven by a phase class in Library. */
export type FadePhase = 'idle' | 'out' | 'in'

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

/* ---- C · FLIP — measured by hand ----
   Rects before, rects after, then each book is thrown back to where it was
   and animated to where it now belongs. Same travel as the morph but under
   our own easing and stagger, and it works in every browser. The cost is that
   only the box is interpolated, not its contents — a wide cover scaled down
   into a narrow spine stretches on the way. */
function flip(root: HTMLElement | null, apply: () => void) {
  if (!root) {
    apply()
    return
  }
  const before = new Map<string, DOMRect>()
  for (const el of root.querySelectorAll<HTMLElement>('[data-book]')) {
    before.set(el.dataset.book!, el.getBoundingClientRect())
  }

  flushSync(apply)

  const duration = ms('--dur-move', 420)
  const stagger = ms('--stagger', 45)
  const easing = getComputedStyle(document.documentElement)
    .getPropertyValue('--ease-move')
    .trim()

  const items = [...root.querySelectorAll<HTMLElement>('[data-book]')]
  items.forEach((el, i) => {
    const a = before.get(el.dataset.book!)
    if (!a) return
    const b = el.getBoundingClientRect()
    if (!b.width || !b.height) return

    // Centre-to-centre: both boxes scale about their own centre, so matching
    // centres is what keeps the book from swinging as it resizes.
    const dx = a.left + a.width / 2 - (b.left + b.width / 2)
    const dy = a.top + a.height / 2 - (b.top + b.height / 2)
    const sx = a.width / b.width
    const sy = a.height / b.height
    if (!dx && !dy && sx === 1 && sy === 1) return

    el.animate(
      [
        {
          transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
          opacity: 0.6,
        },
        { transform: 'none', opacity: 1 },
      ],
      {
        duration,
        easing: easing || 'ease-out',
        delay: i * stagger,
        fill: 'backwards',
      },
    )
  })
}

/** Runs `apply` (the setState that swaps the view) under the chosen engine. */
export function runSwitch(
  engine: SwitchEngine,
  apply: () => void,
  ctx: {
    root: HTMLElement | null
    setPhase: (p: FadePhase) => void
    schedule: (fn: () => void, delay: number) => void
  },
) {
  // Reduced motion doesn't mean no motion — a hard cut leaves you to work out
  // on your own that the shelf changed. Every engine routes through the
  // cross-fade instead, which the token swap has already stripped down to pure
  // opacity: --travel is 0 so nothing slides, --stagger is 0 so the books go
  // together, and --dur-move is short. A dissolve, and nothing travels.
  if (prefersReducedMotion()) {
    return crossfade(apply, ctx.setPhase, ctx.schedule)
  }
  if (engine === 'morph') return morph(apply)
  if (engine === 'flip') return flip(ctx.root, apply)
  return crossfade(apply, ctx.setPhase, ctx.schedule)
}
