# Premium Review Checklist

> Run each PR/screen against this on the Vercel preview before you approve a merge.
> The bar: "does this feel like an expensive, polished, modern app?" If several
> boxes fail, request changes before approving.

## For EVERY screen (both light AND dark, mobile AND desktop)

### Look & consistency
- [ ] Consistent radius language (cards, buttons, inputs, modals, nav).
- [ ] Glass chrome (nav/sheets) reads premium; aged-paper content stays warm.
- [ ] Warm accent used with restraint, not everywhere.
- [ ] Generous, rhythmic spacing; clear hierarchy; nothing cramped.
- [ ] Matches the rest of the app — no screen feels older or "off."
- [ ] Each content type has its own visual identity — not one pattern repeated.

### Geometry (measured, not eyeballed)

Read the real numbers off the rendered page at 390 and at desktop. "Looks right"
does not pass this section.

- [ ] Every box's leading and trailing gap match. The leading edge is almost always
      right; it is the trailing edge that drifts.
- [ ] Text and artwork run the full width of the box they sit in — no invisible
      second gutter from an inherited cap (`--measure`, a global `p` rule, a token).
- [ ] Components are aligned to the same edges as their neighbours: a label, its
      card, and the column all end on the same x.
- [ ] Nothing overlaps a control or a tap target at the longest realistic content.
- [ ] No dead space inside a component. If a region is empty, it is empty on purpose
      and the reason is written down.
- [ ] Element sizes track their importance — nothing dominating or shrunken by accident.

### States (the premium tell)
- [ ] Hover, press, and visible focus states on interactive elements.
- [ ] Loading state (skeletons, not jarring spinners where possible).
- [ ] Empty state (warm + inviting, not a blank void).
- [ ] Error state (clear, on-brand).

### Motion
- [ ] Smooth, subtle transitions; never flashy.
- [ ] prefers-reduced-motion honored.
- [ ] Voice orb feels premium (scoped to that component only).

### Accessibility
- [ ] AA+ contrast everywhere.
- [ ] Keyboard-navigable; logical tab order; 44px+ tap targets.

### Responsive
- [ ] Right on phone (390px), iPad, and desktop. Nothing cut off or overlapping.

### Process
- [ ] The PR lists which skills were applied and their scope.
- [ ] Skills were consulted from design-skills-cheatsheet.md before building.
- [ ] Static look was approved before motion/dark/desktop were added.

---

## Screen-specific extras

### Library home (02) — Stack / Shelf / Grid
- [ ] All three views distinct; switching animates (no hard cut).
- [ ] Currently-reading hero + greeting feel personal.

### Add book & covers (03)
- [ ] Real covers fetched first; generated fallback looks hand-made (not AI).
- [ ] Title/author typeset by the app, crisp; no coverless book.

### Book detail / journey (04)
- [ ] Reads like a real scrapbook (rotated cards, tape/torn edges, paper).
- [ ] Plot-thread spine feels woven; entries hang off it logically.
- [ ] Voice orb: warm, premium, listen-back works; orbs reference scoped here only.
- [ ] Tap targets honest despite the organic layout.

### Add entry (05)
- [ ] Glass sheet; all 5 entry types; capturing feels effortless, autosaves.

### Onboarding (07)
- [ ] Teaches by doing; welcoming, not instructional; every step skippable.

### Auth & sync (09)
- [ ] Works with just a handle (no forced login).
- [ ] Export/import works; optional Google sync works; gentle backup nudge.

### Install (11)
- [ ] Android/desktop install button; iPhone/iPad "Add to Home Screen" guide.

### Support (10)
- [ ] Paystack tip jar is admin-safe: secret key server-side, verified server-side.

---

## Safety re-check (every PR)
- [ ] Free-tier only — no paid service slipped in without a flag.
- [ ] API keys (Google, Paystack) in Vercel env vars, never in the repo.
- [ ] No merge to main without my explicit sign-off.

---
*Drafted with Dia*
