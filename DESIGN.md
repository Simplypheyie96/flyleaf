# Design System — Flyleaf

> **This file is an index, not an authority.** Flyleaf's visual system was authored
> deliberately and lives in two places that outrank this file. Read them, don't
> summarise them from here — a summary drifts, and the values below would go stale.
>
> This exists so tooling that expects a `DESIGN.md` finds one and is routed correctly.

## Where the authority actually lives

| Question | Read | Status |
|---|---|---|
| Every colour, surface, material, shadow, radius | **`src/styles/tokens.css`** (772 lines) | **Single source of truth.** Declared as such in `CLAUDE.md`. Already OKLCH. No hard-coded colour may exist outside it. |
| Motion values and reduced-motion behaviour | **`src/styles/motion.css`** + `src/motion/` | Authority for timing/easing |
| Typefaces, type scale, tracking | **`src/styles/tokens.css`** (the `---- Type ----` block) and **`src/main.tsx`** for what is actually loaded | Single source of truth. Four voices: serif / sans / mono / hand |
| Direction, guardrails, negative prompt, IA, per-screen skill routing | **`CLAUDE.md`** (212 lines) | Standing brief for the whole project |
| Texture, rhythm, chrome polish — **qualities only** | **`refs/inspirations/`**, `refs/journey-references.md` | Strictly scoped; see the guardrail below |
| Per-screen build specs | `01-…md` through `12-…md` | Fed one at a time |

## The direction, in one paragraph

Glass chrome over a scrapbook world: Apple-style floating glassmorphic navigation
hovering above tactile, slightly-rotated paper content on a textured sky. Light is an
open-sky day, dark is a night sky — never pure black, and derived as one variable change
from light, never by inverting lightness. Featherweight cool shadows (5–9% alpha) over
hairline borders. One futuristic object in the whole app: the voice-memo orb.

**Not:** a social feed, a cold pure-white background, cute-but-childish, or glass bought
at the cost of contrast.

## Rules that are easy to violate by accident

- **No hard-coded colour outside `tokens.css`.** Dark mode is a `[data-theme='dark']`
  swap; a literal hex anywhere else silently breaks it.
- **Never stack two look packs.** `glassmorphism` / `glass-dark-ui` are scoped to the
  **chrome only** — never the content. Scrapbook texture is custom, guided by `refs/`.
- **References are for qualities only.** Never surface a reference's names, branding,
  logos, book titles, author names, or colour identity. `orbs.jakubantalik.com` informs
  the voice orb *only*. Run `audit-reference-originality` before shipping.
- **The serif has exactly one weight.** `--font-serif` is Instrument Serif: 400, a true
  italic, and nothing else — chosen because it sets about a quarter narrower than a text
  serif, and a book title is the longest string in the app. Never ask it for a bold. The
  browser will synthesise one, and on strokes this fine that smears them instead of
  thickening them. Hierarchy in the serif is made out of **size**, and every serif rule
  states `font-weight: 400` rather than inheriting — an `h1` defaults to bold otherwise.
- **AA+ in both themes, always.** The token sheet's comments record the measurements
  behind specific values — read the comment before changing a number, because several
  were tuned to clear a measured failure.
- **Motion is never skipped, never unguarded.** Every interaction ships with a
  `prefers-reduced-motion` fallback.

## Build order (from CLAUDE.md — applies to every screen)

1. Static layout, light mode, mobile, no motion — approve the look first
2. Secondary states and variants
3. Motion, one interaction at a time, each with reduced-motion fallback
4. Dark mode, derived as one variable change from light
5. iPad and desktop — first-class, not stretched phones

## If you are about to write a real DESIGN.md here

Don't. Extend `tokens.css` and `CLAUDE.md` instead. Three competing authorities is how
a system that currently holds together starts contradicting itself.
