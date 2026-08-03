# Book Journey — the six references, transcribed

Six screenshots were given for step 04 (the book detail / journey page). Images fall
out of a context window; this file does not. **Read this before touching the journey
route.** Every quality below was observed directly from the screenshots.

## The guardrail, restated

These are references for **qualities only** — structure, rhythm, weight, material,
the shape of a control. Never copy a reference's names, branding, logos, book titles,
author names, colour identity or copy into the app. Where a reference shows a real
book, that book is a placeholder for *any* book. The palette stays Flyleaf's own
(`src/styles/tokens.css`); none of the colours named below are to be pasted in.

---

## R1 — Bone page, dashed thread, initiation badge

The closest single reference to what we are building.

- **Page**: warm off-white, not white. Cool white would break it.
- **Chrome**: a circular back button top-leading and a circular `···` button
  top-trailing. Each is its own soft circle with a hairline edge — no bar behind
  them, they float on the page. Roughly 40pt, well clear of the edges.
- **Header**: small cover at the leading edge (about 2:3, softly rounded, ~80pt
  wide), details beside it — display serif title at a genuinely large size, then a
  **handwritten script** standfirst line, then a **mono micro-caps meta row** in
  grey with a mid-dot separator (`STARTED …  ·  … COLLECTED`).
- **The thread**: a **vertical dashed line** down the leading edge — short dashes,
  light grey, generous gaps. It starts *above* the first notch and continues past
  the last, so it reads as a line the entries hang on rather than a bracket around
  them.
- **The initiation notch**: a **filled rose circle, larger than every other notch**
  (~24pt), carrying a white outlined **pennant/flag glyph**. This is the mark that
  says "this is where it began", and nothing else on the page uses it.
- **The initiation entry is not a card.** Mono date line (`JAN 12 · DAY 1`), a serif
  heading, then body copy set straight on the page — no fill, no border. It reads as
  an inscription.
- **A later notch is a small solid black dot** — plain, ~14pt. The contrast between
  the big rose badge and the plain dot is what makes the opening feel like an
  opening.
- **The quote card**: white, softly rounded, generous padding, very soft shadow.
  A **mono micro-caps header rail** (`PAGE 84 · QUOTE`) at the leading edge with a
  small **four-point sparkle glyph** at the trailing edge. Body in **italic serif**,
  large — noticeably larger than body copy elsewhere.
- Cards are **inset from the thread**; the thread runs in its own left gutter and
  the card starts well clear of it.

## R2 — Taupe page, huge stacked title, black voice bar

- **Page**: warm taupe/greige. Proof that the journey does not need a white page.
- **Cover**: large, solid, high-contrast block with the author set small inside its
  bottom-leading corner.
- **Title**: very large bold serif, allowed to **stack over two lines** with tight
  leading. It is the loudest thing on the screen.
- **Dates**: one plain sentence — `Started Oct 12, 2024` — in sans, not mono.
- **Two pills side by side**: one **filled dark** (the format), one **outlined**
  (the entry count). Same height, same radius, different weight. That single
  filled/outlined pairing carries the whole "selected vs. informational" idea.
- **The voice memo bar**: a **full-width black rounded rectangle**, modest radius.
  Inside: a **large filled warm-red circle** at the leading edge, a **thin
  horizontal progress line** (filled portion light, remainder dim), **mono elapsed /
  total** beneath it, and a **right-aligned mono caps label** (`VOICE MEMO`).
  It is a device, not a card — the only black object on the page.

## R3 — The current Flyleaf app (blue sky)

Ours. Included so the new page is measured against what exists.

- Floating **circular glass back button** leading; trailing is a **pill container
  holding two icon buttons** (not two separate circles) — this is the iOS
  buttons-in-a-container idiom and we already own it.
- Cover, serif title, author in sans.
- **Format chips**: unselected ones are **icon-only circles**; the selected one
  **expands into a dark filled pill with icon + label**. Good idiom — keep it, but
  it must support **more than one selected at a time**.
- A glass `add reading dates` pill.
- **Two wide glass action buttons**: `Share journey` and `Draft my review`.
- **Filter chips** in a horizontally scrolling row, **tinted per entry type**, each
  with a count (`Quotes · 1`). The tint-per-type and the count both survive.

## R4 — Off-white, three format chips, labelled date columns, hollow-ring thread

- **Chrome**: a circular share button (arrow-out-of-tray) in a light circle at the
  trailing edge, with `···` above it.
- **Header**: dark cover at the leading edge, serif title, **italic serif byline**.
- **Three format chips in a row**: the selected one **filled black with an icon**
  and a mono caps label; the other two **outlined, label only**. Equal height.
- **`STARTED` / `FINISHED` as two labelled columns** — mono grey caps labels, values
  below in bold serif. An **em dash** stands in for a date that has not happened.
  This is the pattern to use for editable dates.
- A **hairline separator** across the full width, dividing the header from
  everything under it. Cheap, and it works.
- **Filter row**: the active pill **filled black**, the rest **light grey filled**
  (not outlined). Sans, sentence case.
- **The thread**: dashed vertical line, with **hollow ring notches** — white fill,
  grey stroke, small. Different from R1's solid dot; both read fine.
- **Meta line above each card**, mono caps: `JAN 16 · AUDIO WHISPERS`.
- **A tinted "milestone" card**: sage fill, mono caps label leading, bold serif
  percentage trailing, and a **progress bar** (dark filled portion on a light track).
- **A voice card**: white, **filled rose circular play button** (large), a **black
  waveform of vertical bars at varying heights**, mono duration trailing.
- **A note card**: **pale yellow fill with a thin yellow border**, body in **serif**.

## R5 — Segmented control, floating tab bar, content scrolling under

The reference for the header/scroll behaviour.

- Cover is a **photograph** with a subtle stacked-page edge behind its trailing side.
- **Author in mono caps above the title**, title in huge bold serif.
- **A true iOS segmented control**: a light grey rounded **track** holding four short
  codes; the selected segment is a **white raised pill with a soft shadow** inside
  the track. This is the control to use for anything genuinely single-select.
- **`STARTED` / `EST. END`** mono caps labels over mono values.
- **A floating rounded tab bar** below the header — grey track, white raised pill for
  the active tab. **Content visibly scrolls underneath it**: a card's text is clipped
  behind the bar's lower edge. The header block above sits on its own solid panel.
  This is exactly the "details on scroll should scroll underneath the information on
  top" behaviour.
- **A progress card**: pale blue with a **visible drawn grid** across it, mono caps
  kicker, bold serif headline, mono figures. The grid field is the quality to borrow
  for a generated map/place card with no image.
- **A note card**: bright pale yellow, **mono caps kicker leading + mono date
  trailing**, body in sans.
- **A voice card**: white, mono caps `VOICE MEMO` leading with a small stop square
  trailing, **black filled circular play button**, black waveform bars, mono duration.

## R6 — Dark bar, circle + pill of three

- A circular **outlined** back button at the leading edge — thin light stroke,
  transparent fill.
- At the trailing edge, a **single pill container holding three icon buttons**,
  evenly spaced, the pill slightly lighter than the page behind it.
- This is the canonical shape for our top chrome: **one circle leading, one pill
  trailing**, whatever the icon count.

---

## What the six agree on

1. **One circle leading, one pill (or circle) trailing.** Never a full-width bar.
2. **A dashed vertical thread in its own gutter**, with notches, and cards inset
   clear of it.
3. **The opening is marked differently from everything after it** — bigger, filled,
   its own glyph.
4. **Mono micro-caps for every fact**: dates, page numbers, kickers, counts, labels.
   Serif for the reader's own words and for titles. Sans for interface prose.
5. **Selected = filled and dark. Unselected = outlined or light-grey filled.**
   Never two filled darks in the same group.
6. **Voice is a dark object with a large round button, a waveform or progress line,
   and a mono timer.** It never looks like a text card.
7. **Labelled date columns** (`STARTED` / `FINISHED`), em dash for absent.
8. **Cards differ by structure, not tint** — a rail, a border, a grid field, a black
   bar, a photograph. Tint alone is not a card type.
