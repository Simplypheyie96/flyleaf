# 06 — Global Search

> Feed after 05. Search across everything the user has personally saved.

> **IA UPDATE (owner decision, step 01 review):** search is NOT a bottom-bar
> tab. It opens from inside the **Library** (the search field/icon in the
> Library header). Same surface and scopes as below, just entered from there.

## Core idea
One search that spans the whole personal archive — books, quotes, notes, voice
memos, images, highlights — so nothing is ever lost. Also the entry point for
adding new books (book search from 03 lives alongside).

## Layout
- Calm full-width search field in glass chrome.
- Two scopes, clearly separated:
  - **My library** (default): searches everything saved. Results grouped by type
    with each type's muted-warm color + icon.
  - **Find a book**: searches external sources to add a new book (ties to 03).
- Results: paper cards; voice results show a mini-orb + waveform; image results
  show photo-corner thumbnails; quotes/notes/highlights show a text snippet with
  the source book.
- Tapping a result jumps to that entry in its book's journey (04).

## Animation (step 3)
- Results settle in with a soft stagger. Scope switch cross-fades.
  Reduced-motion: instant. 

## Constraints
- Fast + forgiving: partial matches, typo tolerance where cheap.
- Search must work offline over locally-cached content where possible (PWA).

## Negative prompt
No mixing "my stuff" with "add a book" ambiguously — scopes are explicit. No
slow blocking search. No reference names in sample/empty states.

## Success
A user can find any quote, note, memo, image, or book they've saved in seconds,
and can add a new book from the same place.

## Gates
Static (both scopes, grouped results) → STOP. Motion → STOP. Dark → STOP.
Desktop/iPad → STOP.
