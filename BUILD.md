# BUILD — How Claude Should Run the Whole Flyleaf Build

> Feed Claude this folder and say: "Follow BUILD.md." This orchestrates the full
> build: create the repo, work step by step with branches/PRs, deploy on Vercel,
> and stop for my review at each gate. It ties together CLAUDE.md + the numbered
> files (01–12) + design-skills-cheatsheet.md.

## Ground rules (apply the whole way through)
- Follow `CLAUDE.md` (the standing brief) at all times.
- Before each screen, consult `design-skills-cheatsheet.md`, NAME the skills +
  scope you'll use, and WAIT for my yes (per the global design instructions).
- Spec-first: static layout → my approval → motion → dark mode → iPad/desktop.
  One variable at a time. Never skip ahead.
- STOP at every file's gate for my review. Do not merge or deploy to production
  without my explicit sign-off.
- Keep everything free-tier; flag before adding any paid service.

## Step 0 — Repo + Vercel setup
1. Create a NEW empty git repo named `flyleaf` (do not reuse any old project).
2. Copy `00-CLAUDE.md` to the repo root as `CLAUDE.md`. Keep the numbered files +
   `design-skills-cheatsheet.md` + `refs/` in the repo.
3. Initialize the project (Vite + React + TypeScript PWA is a good default;
   propose the exact stack in file 01 and wait for my ok).
4. Connect the repo to Vercel for hosting with automatic PREVIEW deploys per
   branch. Confirm the preview URL works before building features.
5. Create a `refs/` folder; I will drop reference images there (orbs reference is
   for the voice orb ONLY — see CLAUDE.md reference scope).

## Branch + PR workflow (use throughout)
- Do each numbered file's work on its own branch, e.g. `build/01-setup`,
  `build/02-library-home`, etc.
- Open a Pull Request per step. In the PR description, list what was built, which
  skills were applied (and their scope), and the Vercel preview link.
- I review the preview + PR, request changes if needed, and approve.
- Merge to main ONLY after my approval. Vercel deploys main to production.
- Use `superpowers:requesting-code-review` / `verification-before-completion`
  before marking a step done.

## Build sequence (each = its own branch + PR + gate)
1. `01-setup.md` — PWA scaffold on Vercel, themes, tokens, glass + paper
   primitives, leaf buttons, splash, service-worker update strategy.
2. `09-auth-and-sync.md` — local-first data, free export/import, optional Google
   sync (free-tier storage).
3. `02-library-home.md` — Stack / Shelf / Grid + floating glass chrome.
4. `03-add-book-and-covers.md` — book search + guaranteed cover pipeline.
5. `04-book-detail-journey.md` — scrapbook page, plot-thread, voice orb (use the
   orbs reference here, scoped).
6. `05-add-entry-flow.md` — glass add-entry sheet, all five entry types.
7. `06-global-search.md` — search across everything saved.
8. `07-onboarding-guide.md` — guided first run.
9. `08-branding-and-graphics.md` — logo, leaf motif, app icon, share cards.
10. `11-install-experience.md` — install-to-home-screen + per-device guide.
11. `12-legal-privacy-terms.md` — privacy / terms / licensing (starter drafts).
12. `10-support-the-builder.md` — optional Paystack tip jar (secret key server-side).

## Per-step checklist (Claude runs this each time)
- [ ] Named the skills + scope, got my yes.
- [ ] Built the static screen first; I approved the look.
- [ ] Added motion, then dark mode, then desktop/iPad.
- [ ] Ran the QA skills (design-guidelines + accessibility); fixed flags.
- [ ] Opened a PR with preview link + skills used; waited for my approval.
- [ ] Merged only after sign-off.

## Definition of done (per screen)
Premium in light AND dark, works at 360px through desktop, real hover/press/focus
+ loading/empty/error states, AA+ contrast, and it looks
like an expensive, considered app. Not "plausible" — actually polished.

## Final launch (only after all steps approved)
- Full review across all screens, both themes, mobile + desktop.
- Confirm PWA installs + updates correctly and local data survives updates.
- Confirm legal pages are in place (filled with my details).
- Deploy main to Vercel production.

---
*Drafted with Dia*
