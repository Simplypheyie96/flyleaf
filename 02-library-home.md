# 02 — Screens: Home + Library

> Feed after 01 is approved. Follow the build-order discipline from CLAUDE.md:
> static light mobile first, then views, then motion, then dark, then desktop.
> STOP at each gate.

> **IA UPDATE (owner decision, step 01 review):** this step now covers TWO
> destinations, Apple Books-style:
> - **Home** — the warm landing: handwriting greeting, "currently reading"
>   hero, recent memories (latest entries), quick "begin a journey" action.
> - **Library** — the full bookshelf described below (Stack / Shelf / Grid),
>   with a search field in its header scoped to the user's books + entries
>   (the search surface itself is built in 06 — leave the field as an entry
>   point).
> The greeting/hero material below moves to Home; the shelf views belong to
> Library. Build Home first, then Library.

## Core idea
The home screen: a reader's personal collection, shown as their chosen shelf
view (Stack / Shelf / Grid), with a warm greeting, a "currently reading" hero,
and floating glass chrome. Opening it should feel like opening your own
cherished bookshelf.

## Technology
- Reuse `GlassSurface` (chrome) and `PaperSurface` (books) from 01.
- Book covers come from the cover pipeline (built in 03); for now use placeholder
  cover data so layout can be validated.

## Layout (wireframe in words)
- Greeting header: "Welcome back, [Name]" (handwriting accent) + a quiet prompt
  ("3 books in progress").
- Currently reading: prominent near top — cover + title + progress + hint of
  recent entries ("2 quotes, 1 voice memo").
  NOT a carousel (Mabel, step 02 motion pass): one book is shown at a time.
  With more than one in progress, you flip between them, and an indicator
  below the card says there are more. Deferred until real books exist.
- Collection: main scroll area, rendered in the chosen view.
- Floating glass chrome (does not scroll with content):
  - Tab bar (bottom on mobile): Library · Search · Add · Profile.
  - View switcher (Stack/Shelf/Grid): floating glass control.
  - Prominent "+ Add a book" primary action.
- Hierarchy: greeting → currently reading → collection → floating actions on top.

## Copy (render EXACTLY)
- Greeting: Welcome back, [Name].
- Currently-reading label: Currently reading
  (was "Still reading" — changed by Mabel during the step 02 motion pass)
- Progress example: 214 of 502 · 3 highlights this week
- Collection label: Your collection
- View labels: Stack · Shelf · Grid
- Primary action: + Add a book
- Empty state: Your shelf is waiting. Add the first book you want to remember.

## Shelf views
- **Stack** (default): covers piled, slight rotation, depth shadows, top book
  most visible. Tactile.
- **Shelf/spine:** books standing, spines out, like a bookcase; tap pulls forward.
- **Grid:** tidy cover thumbnails; utility view.

## Animation (apply in step 3, not before)
- View switch: books rearrange between Stack/Shelf/Grid with a physical,
  eased transition — never a hard cut.
- Book tap: gentle lift + soft shadow bloom before navigating into detail.
- Currently-reading carousel: soft momentum scroll.

## Constraints (change 1–2 things only)
- FONT: literary serif titles / grotesk labels.
- MATERIAL: aged-paper books + Apple-glass chrome.
- MODE: build LIGHT first, derive dark after.
- Default view: STACK.

## Negative prompt
No pure-white background. No flat rectangular book cards — books feel physical.
No social-feed patterns. No reference names/covers. No glass that hurts
legibility. No childish styling.

## Responsive (after mobile approved)
Mobile: single column, bottom floating glass tab bar, thumb-reachable actions.
iPad/desktop: side rail replaces bottom bar, glass side-docks, multi-column
collection, larger currently-reading hero. Never a stretched phone UI.

## Build order + gates
1. Light, mobile, STACK, static → STOP, approve look.
2. Add Shelf + Grid + animated switching → STOP.
3. Add remaining motion (book lift, carousel) → STOP.
4. Derive dark mode → STOP.
5. iPad/desktop layout → STOP.

## Success
Feels like a personal bookshelf; one glance shows my books + what I'm reading;
adding a book is obvious; the view choice persists and feels like mine.
