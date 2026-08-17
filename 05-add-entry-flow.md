# 05 — Add-Entry Flow

> Feed after 04. The glass sheet where users capture a note, quote, voice memo,
> image, or highlight — the core habit loop of the app.

## Core idea
From any book (or the global +), a floating glass sheet slides up to add an
entry. Capturing a memory should feel effortless, warm, and encouraging — never
a blank-form chore.

## Layout
- Trigger: the floating glass "+" (tab bar or book detail).
- Glass slide-up sheet with an entry-type chooser: Quote · Note · Voice · Image ·
  Highlight (each shows its muted-warm color + icon).
- Per-type capture:
  - Quote: text + optional page/chapter; feels like writing on a card.
  - Note: free text; personal, journal-like.
  - Voice: the ORB record UI — tap to record, pulses with voice, save + listen back.
  - Image: pick/take photo; mounts with photo-corners into the scrapbook.
  - Highlight: text + auto-capture chapter / page / paragraph when available.
- Save animates the entry "taping down" onto the book's thread (ties to 04).

## Animation (step 3)
- Sheet: glass slide-up with blur bloom; dismiss drags down.
- Type switch: gentle cross-fade between capture modes.
- Voice orb: pulse on record, glow on save.
- Save: entry flies to its place on the thread.

## Constraints
- Chrome = glass; the entry preview = paper. Encourage, don't interrogate:
  minimal required fields, everything else optional.
- MODE light first, dark derived.

## Negative prompt
No long mandatory forms. No cold/clinical inputs. No losing a draft on dismiss
(autosave). No inaccessible controls on glass (AA+).

## Success
Adding a memory takes seconds, feels warm and guided, and the new entry visibly
joins the book's woven journey.

## Gates
Static sheet + all five types → STOP. Motion + orb → STOP. Dark → STOP.
Desktop/iPad (sheet becomes a side panel/modal) → STOP.
