# Flyleaf — Project Instructions (CLAUDE.md)

> Save this file at the repo root as `CLAUDE.md`. It is the standing brief for
> the whole project. The numbered build files (01–08) are fed to you one at a
> time; this file always applies.

## What Flyleaf is
Flyleaf is a private, mobile-first PWA companion for book lovers to preserve
their journey through every book they read — their own notes, quotes, voice
memos, images, highlights, and reflections. A flyleaf is the blank page at the
front of a book where readers historically wrote their name and inscriptions;
that is the spirit of the app: the personal, hand-written layer on top of a book.

NOT a social platform. NOT a reading tracker. NOT a Goodreads replacement.
Private by default; users opt in to share.

## How to work with me (READ FIRST)
Before generating ANY UI or writing ANY code for a screen, first produce a
filled **design-first spec** and wait for my approval. Do not skip to building.

Spec order: GOAL → FORMAT → LAYOUT (wireframe in words) → TYPE SYSTEM →
COLOR + MATERIAL → IMAGERY/UI STYLE → COPY (render exactly) → CONSTRAINTS
(change 1–2 things only per iteration) → NEGATIVE PROMPT.

Then pick ONE direction, show me the spec, get my yes, THEN build. After the
first build, iterate ONE variable at a time. If a brief is vague, ask: single
message of the screen? hierarchy? style lane? must-keep constraints?

## Build order discipline (applies to every screen)
1. Static layout, light mode, mobile, no motion — approve the look first.
2. Add secondary states / variants.
3. Add motion, each interaction one at a time, every one with a
   `prefers-reduced-motion` fallback.
4. Derive dark mode as one variable change from light.
5. Extend to iPad/desktop.
Motion is never skipped — it is specified up front and applied in step 3.

## Visual direction — glass chrome over a scrapbook world
Layer two things; do not blend them as equals:
- **Chrome (Apple glass, floating):** iOS-style floating glassmorphic tab bar,
  floating menus, blurred slide-up sheets. Modern, effortless, hovers above
  content. Contrast AA+ always — scrim behind any text on glass.
- **Content (scrapbook, tactile):** entries are NOT rectangles in a grid. Place
  them like a real scrapbook — slightly rotated cards, taped/torn edges, aged
  paper grain, photo-corner mounts, a hand-made keepsake feel.
- **Plot thread:** a woven thread runs as a vertical spine down a book's
  timeline; entries hang off it. Scrolling feels like weaving the journey.
  (Vertical spine, not a free 2D weave — buildable and still feels woven.)
- **Voice memos = the one futuristic object:** an ORB, like talking to an AI.
  Pulses while recording, glows on playback, listen back anytime. Deliberate
  contrast — everything else is hand-made/nostalgic; the orb is a bit of future.

## Color & atmosphere (no red theme)
Atmospheric, warm, lamp-lit — reading in the evening. Aged paper, candle-glow
warmth, soft shadows, low-contrast easy-on-the-eyes surfaces. One quiet warm
accent (muted amber/ochre) used sparingly — never the app's identity color.
Prefer cozy/dim over bright pure-white.

## Light & dark — both, auto-switch (follows system + manual override)
- **Light (warm day):** aged cream base (~#F6F1E7), ink-charcoal text (~#2A2724),
  soft warm shadows. Never bright pure-white.
- **Dark (candle-lit night):** deep warm charcoal/brown base (not cold black),
  candle-glow accents, gentle glow on orb + glass chrome, low-contrast text.
Same accent family + muted entry colors, retuned per background. Glass adapts
translucency per mode. Test AA+ in BOTH. Design light first, derive dark.

## Typography
- Literary serif for titles + reading UI.
- Clean humanist grotesk for labels + body.
- Roomy body leading; comfortable reading measure.
- Personal handwriting accent for the greeting/name so it feels like a journal.
Reinforce books/reading/storytelling throughout.

## Entry-type identity (color + icon, not tags)
Each type has its own muted-warm identity, consistent everywhere:
Quotes (quote-mark) · Notes (pencil) · Voice memos (orb / mic+waveform) ·
Images (photo-corner) · Highlights (highlighter). Keep hues muted and warm.

## Library shelf — three views for v1
- **Stack** — books piled physically, rotation + depth shadows. Emotional default.
- **Shelf / spine** — books standing, spines out, like a bookcase.
- **Grid** — tidy cover thumbnails; the utility "find one fast" view.
Switcher lives in the floating glass chrome; switching animates books
rearranging (no hard cut). Order stays consistent across views. Default = Stack.
List view deferred to later.

## Book covers — every book always has a cover (STRICT)
Pipeline, in order:
1. Fetch the real cover from large libraries first: Open Library, Google Books,
   and the most accurate available sources. Most books get their true cover here.
   There must NEVER be a coverless book when a real cover exists anywhere.
2. Only when every source misses, GENERATE an original cover. It must NOT look
   "AI." Target aesthetics: embroidered/stitched florals, block-print, folk-art,
   pressed-flower, vintage cloth-binding — hand-made, matching the app's warm
   aged-paper atmosphere. See 03-add-book-and-covers.md for the full recipe.
3. Generated covers are SEEDED per book (same book → same cover every time).
   Title + author are typeset by US in crisp app fonts ON TOP of the generated
   art — never rely on the image model to render text (avoids AI-garbled type).
Guarantee: a user never sees a book without a beautiful cover.

## Navigation philosophy
Avoid a generic tab-bar-only layout. Pages feel distinct; interactions teach the
app; carry the user along. The journey is immersive and guided.

## Signature features to keep visible
Voice memos with playback (orb + waveform) · Global search across everything
saved · Auto book data from search (users never upload covers) · Highlights
capture chapter/page/paragraph · Optional thinking orbs · Welcoming onboarding.

## PWA updates
Deploying a new version reaches all users automatically via the service worker,
INCLUDING users who installed it to their home screen. Show a gentle "new version
ready — tap to refresh" prompt; the refresh gets installed users onto the update
immediately. Updates must NEVER clear locally-stored user data.

## Install experience (see 11)
Help users install to home screen with PLATFORM-AWARE guidance. Android/desktop
get a native install button; iPhone/iPad Safari have NO auto prompt and need
illustrated "Share → Add to Home Screen" steps. A "How to install" guide lives in
Settings for all device types.

## Legal (see 12) — starter drafts, not legal advice
Ship a Privacy Policy, Terms/Disclaimer, and Licensing/attribution before launch,
linked in Settings. Emphasize: local-first (data stays on device unless synced),
users are responsible for backing up (export/sync), as-is no-warranty, and proper
attribution for Open Library / Google Books + font licenses. Mark as starter
templates needing professional review.

## Support the maker (optional, never a paywall)
An optional Paystack "buy me a coffee" tip jar in Settings (Nigeria-friendly).
The whole app stays FREE — this is gratitude, not a gate. Paystack SECRET key is
server-only (Cloudflare Worker), never in frontend/repo; payments verified
server-side. Full spec + builder setup guide in 10-support-the-builder.md.

## Cross-device (mobile-first, real iPad + desktop)
Mobile-first (390px) must be perfect. iPad/desktop are first-class, not stretched
phones: side rail replaces bottom bar, glass chrome side-docks, multi-column
scrapbook layouts, wider plot-thread branching. One responsive PWA.

## Reference usage guardrail (STRICT)
References in `refs/` are for QUALITIES ONLY: texture, layout rhythm, chrome
polish, stitched/tactile treatment, motion feel. NEVER copy or surface any
reference's names, branding, logos, book titles, author names, color identity,
or copy into the app. Derive the feeling; invent our own everything. Push HARDER
toward analog-keepsake nostalgia (aged paper, off-register print, tape, torn
edges, ticket-stub textures) than the references show.

## Guardrails (negative prompt, always on)
No social-feed patterns (likes, followers, avatar grids). No cold pure-white
backgrounds. No glass at the cost of accessibility (AA+ always). No childish
styling — cute-but-adult. No traditional/old navigation as the whole structure.
No reference names/branding/book titles surfacing in the app. No gibberish
typography, no watermarks, no busy rainbow gradients.

## Technical constraints
PWA, mobile-first, iPad + desktop supported.
- **Hosting: Vercel** (per builder's choice). Deploy the PWA there; use branch
  preview deploys for review before merging to production.
- **Storage/data:** keep it free-tier and low-maintenance. Local-first (IndexedDB)
  means most users need no server storage at all. For the optional Google-sync
  users, pick a free-tier store — Vercel's storage options or an external free
  tier (e.g. Supabase free tier). Avoid ongoing storage costs; flag before adding
  any paid service. (Note: earlier notes mentioned Cloudflare; builder chose Vercel
  for hosting, so default to the Vercel ecosystem unless I say otherwise.)

## Using installed design skills (per screen)
Before building each screen, consult `design-skills-cheatsheet.md` in the repo,
NAME the 1–3 skills you'll use with their scope, and wait for my yes. Stack them:
one process skill → ONE look/system approach → scoped technique skills → a QA
skill. Likely picks for Flyleaf: `glassmorphism`/`glass-dark-ui` (chrome ONLY),
`thinking-orbs` (voice orb), `gsap`/`gsap-scrolltrigger` (per-interaction motion,
scoped), `accessible-animation` (reduced-motion), `web-design-guidelines` +
`fixing-accessibility` (QA before "done"). Scrapbook texture is mostly custom,
guided by refs/. Never stack two whole look packs.

## Reference scope (STRICT)
References inform SPECIFIC parts, never the whole mood:
- orbs.jakubantalik.com → the VOICE-MEMO ORB only (glow/pulse/premium feel).
- metal/beam (jakubantalik.com) → OPTIONAL, only a subtle premium touch on the
  glass CHROME if useful. Not the content.
- ASCII Magic, OriginKit → NOT used; their digital/retro mood fights Flyleaf.
Everything else stays warm, analog, nostalgic. Do not let any reference's cold or
futuristic mood leak beyond its scoped element. Run `audit-reference-originality`
before shipping; never reuse a reference's name, branding, or assets.

## Accounts, data & sync — LOCAL-FIRST, free device migration (see 09)
Works instantly with NO account: pick a handle, data saves locally in-browser
(IndexedDB), fully offline. We store NOTHING for local-only users. TWO ways to
move devices, both free for the builder: (A) EXPORT/IMPORT a journey file —
available to everyone, no account, $0; (B) optional GOOGLE login for automatic
cross-device sync via Cloudflare free tiers. Google login is FREE (no per-user
cost). Private by default; sharing is separate and explicit. Gently nudge toward
backup (export or sign in) — dismissible, never forced. Do NOT add any paid
service without flagging it first. Full model in 09-auth-and-sync.md.

---
*Drafted with Dia*
