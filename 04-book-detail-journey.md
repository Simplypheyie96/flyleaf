# 04 — Screen: Book Detail / The Journey

> Feed after 03. This is the soul of Flyleaf: the scrapbook page where the plot-
> thread, entries, and the voice orb live. Take the most care here.

## Core idea
Opening a book opens its journey — a vertical scrapbook timeline. A woven thread
runs top-to-bottom as a spine; entries (notes, quotes, voice memos, images,
highlights) hang off it like taped-in mementos. Scrolling feels like weaving the
memory of that book together.

## Layout (wireframe in words)
- Header: the book — cover, title, author, progress, format, dates. Feels like
  the inside cover of a real book.
- The thread: a vertical woven/stitched spine down the page.
- Entries: hang off the thread in scrapbook style — slightly rotated paper cards,
  taped/torn edges, photo-corner mounts for images. Each entry uses its type's
  muted-warm color + icon (quote / note / voice / image / highlight).
- Voice memo entries: rendered as the ORB (see below) with a waveform.
- Floating glass "+ add entry" action stays on top.

## The plot thread (build carefully)
- Vertical spine, NOT a free 2D weave (buildable + reliable on mobile).
- Entries branch off left/right of the spine in reading order (chapter/page when
  known). On desktop/iPad the branches spread wider.
- As you scroll, the thread appears to "stitch" forward (draw-on animation).

## The voice orb (the one futuristic object)
- A glowing, softly-pulsing orb — like talking to an AI.
- Recording: orb pulses/animates with the voice; candle-glow intensifies.
- Playback: tap to listen back; orb glows + a warm waveform animates.
- This is the deliberate contrast against the hand-made scrapbook. Make it feel
  special, calm, and premium — not gimmicky.
- **Reference (SCOPED to the orb ONLY):** orbs.jakubantalik.com is a good visual
  reference for the glow/pulse/premium feel of THIS component only. Also relevant
  skill: `thinking-orbs`. Do NOT let this reference's cold/futuristic mood leak
  into any other part of the app — everything else stays warm and analog.

## Animation (step 3)
- Book open: a page-turn / cover-open transition from the library into detail.
- Thread stitches on scroll; entries settle in with a gentle tape-down motion.
- Orb pulse (record) + glow (playback).

## Constraints
- MATERIAL: entries = aged paper/tactile; add-entry sheet + orb chrome = glass.
- Underlying entry ORDER stays logical/linear even though placement looks organic.
- Tap targets 44px+ despite the scrapbook look (accessibility over decoration).

## Negative prompt
No rigid rectangular feed of entries. No 2D free-weave thread (spine only for
v1). No cold/clinical voice UI — the orb is warm. No inaccessible tap targets.
No reference names/branding.

## Responsive
Mobile: single spine, entries alternate sides narrowly. iPad/desktop: wider
branching, thread can sit left with entries flowing right, larger media.

## Build order + gates
1. Static: header + thread spine + a few placeholder entries, light, mobile → STOP.
2. All five entry types styled correctly → STOP.
3. Motion: book-open, thread stitch, entry settle, orb pulse/glow → STOP.
4. Dark mode → STOP. 5. Desktop/iPad → STOP.

## Success
Opening a book feels like opening a kept memory. The thread makes the journey
feel woven. Entries feel taped-in by hand. The orb feels like a small piece of
the future. It's beautiful AND fully accessible.
