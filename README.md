# Flyleaf

**A private journal for your reading life.** Live at [flyleaf.cc](https://flyleaf.cc).

A flyleaf is the blank page at the front of a book where readers write their
name and inscriptions. That is the spirit of the app: the personal,
hand-written layer on top of every book you read — quotes, notes, voice
memos, photographs, characters, places, and plot-thread suspicions, all hung
off one woven timeline per book.

Not a social platform. Not a reading tracker. Private by default.

## What it does

- **Keeps** — quotes (with page and chapter), notes, voice memos with live
  recording and playback, photographs on photo-corner mounts, characters,
  places, and plot threads whose stance hardens from hunch to certainty.
- **The plot thread** — each book's journey is a vertical spine down its
  timeline; entries hang off it like a scrapbook.
- **Covers** — real covers are fetched from Open Library, Google Books and
  iTunes first. When every source misses, the app draws an original seeded
  needlework cover (same book → same cover, forever, on every device),
  typeset in the app's own fonts.
- **The nook** — a reading corner with a lamp to tap on, ambience (rain,
  fire, café — real recordings), and a reading clock that logs sittings.
- **Search** — one search over every book and everything kept in them.
- **The rabbit** — a resident. It peeks, hides, and minds its own business.

## Privacy & data

Local-first. Everything lives in the browser's IndexedDB; a reader picks a
handle and needs no account. We store nothing for local-only users.

Two free migration paths:
1. **Export / import** — the whole journey (books, keeps, recordings,
   pictures) as one JSON file a reader can open in a text editor.
2. **Optional Google sign-in** — automatic cross-device sync. Sign-in is a
   door, never a wall; the app is complete without it.

Deletions travel as headstones so sync can merge without resurrecting what a
reader removed. Updates never clear locally-stored data.

## Stack

- Vite + React 19 + TypeScript, CSS Modules
- Dexie (IndexedDB), `vite-plugin-pwa` (installable, offline, auto-update
  with a gentle "new version ready" prompt)
- Hosted on Vercel; the optional tip jar runs through Paystack with the
  secret key server-side only

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
```

Preview builds (any non-production `VERCEL_ENV`) expose extra lab routes;
production does not.

## Repository notes

- `src/` — the app. `src/books/` covers and sources, `src/journey/` the
  plot thread, `src/routes/home/nook/` the nook and clock, `src/data/` the
  Dexie schema, export/import, sync, and headstones.
- `video/` — the launch-film workspace (Remotion). Kept local, not pushed.
- `refs/` — visual references, used for qualities only; nothing from them
  ships in the app.

Legal starter drafts (privacy, terms, licensing/attribution) are linked in
the app's Settings and need professional review before being relied on.
