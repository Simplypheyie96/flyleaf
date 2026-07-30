# 07 — Onboarding & Guided First Run

> Feed after 06. The welcoming first-run experience that teaches the app by
> carrying the user through it — not by lecturing.

## Core idea
A first-time user should feel welcomed and gently guided until they've seen every
core capability: add a book, open its journey, add each entry type, use the voice
orb, switch shelf views, and search. Teaching happens through doing, not modals
full of text.

## Layout & flow
- Warm welcome: a short, personal opening that sets the keepsake tone (name /
  username choice, optional Google/Goodreads connect to preserve data — all
  lightweight and skippable).
- Guided journey: interactive coach marks + a gentle "do this next" thread that
  literally walks the user along their first book:
  1. Add your first book (real cover appears / beautiful generated one).
  2. Open its journey (see the thread + scrapbook).
  3. Add a quote, then a note.
  4. Try a voice memo on the orb (record + listen back).
  5. Add an image (photo-corner mount).
  6. Make a highlight (chapter/page/paragraph).
  7. Switch shelf views (Stack/Shelf/Grid).
  8. Try global search.
- Progress feels like filling the first page of a journal, not a checklist.

## Animation (step 3)
- Coach marks fade/point softly; the guiding thread draws forward as steps
  complete; celebratory but subtle motion at the end. Reduced-motion fallbacks.

## Constraints
- Welcoming, not instructional: minimal words, lots of showing.
- Every step is skippable; never trap the user.
- Works as a PWA first-run (post-install).

## Negative prompt
No wall-of-text tutorial. No blocking mandatory steps. No childish hand-holding.
No cold empty states — every empty state invites the next action warmly.

## Success
By the end, the user has personally touched every core feature and it felt like
being carried along, not taught. They understand the app without having read
instructions.

## Gates
Static flow → STOP. Motion + guiding thread → STOP. Dark → STOP.
Desktop/iPad → STOP.
