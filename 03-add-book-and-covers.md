# 03 — Add a Book & the Cover System

> Feed after 02. Two things: the add-a-book search flow, and the cover pipeline
> that guarantees every book has a beautiful cover.

## Core idea
Users search any book; real data + cover are pulled automatically. When no real
cover exists anywhere, generate an original cover that looks hand-made (not AI),
matching Flyleaf's warm nostalgic aesthetic. No book is ever coverless.

## Technology — book data
- Query large sources in order and merge best result: Open Library, Google Books,
  and the most accurate available API. Pull cover, title, author, page count,
  and other details. Propose the exact source order + a caching strategy
  (cache results on Cloudflare to cut calls and cost).
- After adding, optionally prompt for reading format (Physical / Digital / Audio)
  and date started. If a reading service is connected, infer these.

## Technology — cover pipeline (STRICT ORDER)
1. **Real cover first.** Try every source. If any returns a genuine cover, use it.
   There must NEVER be a coverless book when a real cover exists somewhere.
2. **Generate only on total miss.** Produce an original cover that does NOT look
   "AI":
   - Aesthetic set to pick from (seeded by book): embroidered/stitched florals,
     block-print botanicals, folk-art pattern, pressed-flower, vintage cloth
     binding, letterpress texture. Warm aged-paper palette from our tokens.
   - SEEDED per book: same title+author → same cover forever (deterministic seed
     from the book id). Regenerating must reproduce the identical cover.
   - 2-PASS TEXT: the model makes ART ONLY (no text, or text-safe area reserved).
     WE typeset title + author in the app's serif on top, crisp and correct.
     Never let the image model render the title text (avoids AI-garbled type).
   - If an image-generation service is used, keep it cheap and cached: generate
     once, store the result (Cloudflare R2), never re-bill for the same book.
     Propose the service + cost control before wiring it.
3. Fallback of the fallback: if generation is unavailable, a beautiful
   typographic cover (title/author on a textured paper field in the book's seeded
   accent) — still never blank.

## Layout
- Search: a calm search field, results as book cards (cover + title + author).
- Add confirmation: the book animates "onto the shelf"; optional format/date
  prompt in a glass sheet.

## Animation (step 3)
- Result appears, tap to add → book flies/settles onto the shelf with a soft
  physical motion.

## Constraints
- FONT: app serif for all cover typesetting.
- MATERIAL: generated covers read as printed/stitched cloth, not glossy digital.
- Deterministic seeding is required.

## Negative prompt
No AI-looking glossy renders. No model-rendered title text. No coverless books.
No reference book titles/covers reused. No uncached repeat generation.

## Success
Every added book shows a cover within a moment. Real covers win. Generated covers
look hand-made and on-brand, are identical on regeneration, and cost nothing to
re-show. Title/author text is always crisp and correct.

## Approval gate
STOP after: (a) the data-source + caching proposal, (b) the generation service +
cost-control proposal, before wiring either. Then build, then STOP for review.
