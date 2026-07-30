# 01 — Project Setup & Foundations

> Feed this to Claude FIRST, after placing `CLAUDE.md` at repo root.
> Goal: scaffold the PWA and the design system. NO app screens yet.
> STOP at the approval gate before building any screen.

## Core idea
Stand up a responsive PWA skeleton on Vercel with the two atmospheric themes
(warm-day light, candle-lit night), the type system, design tokens, and the
floating-glass + aged-paper material primitives. Everything later builds on this.

## Technology
- PWA: installable, offline-capable shell, service worker, web manifest.
- Framework: your choice, but keep it lightweight and low-maintenance
  (recommend Vite + React + TypeScript). Justify the pick.
- Hosting: **Vercel**, with automatic preview deploys per branch.
- Storage: keep it free-tier and low-maintenance. Local-first (IndexedDB) covers
  most users with no server storage. For optional Google-sync users, pick a
  free-tier store (Vercel storage or an external free tier like Supabase). Propose
  the data approach before coding it; flag before adding any paid service.
- Styling: token-driven (CSS variables) so light/dark are one variable swap.

## Implementation
1. Propose stack + storage + hosting plan. WAIT for my approval on this before
   scaffolding.
2. Scaffold the PWA: manifest, service worker, install prompt, offline shell.
   - **Update strategy (build carefully):** the service worker must fetch new
     versions in the background, then show a gentle, dismissible "A new version
     of Flyleaf is ready — tap to refresh" prompt. On tap, activate the new
     worker and reload. NEVER leave a naive cache that traps users on an old
     version. CRITICAL: updates must NEVER touch or clear the user's locally
     stored data (IndexedDB) — memories are preserved across every update.
3. Design tokens as CSS variables:
   - Light theme: cream base ~#F6F1E7, ink text ~#2A2724, warm shadows.
   - Dark theme: deep warm charcoal/brown base, candle-glow accents.
   - One shared warm accent (muted amber/ochre) + muted entry-type hues
     (quotes/notes/voice/images/highlights).
   - Spacing scale, radius scale, elevation/shadow scale (warm-tinted).
4. Typography: wire a literary serif (titles) + humanist grotesk (body/labels)
   + a handwriting accent face. Set leading/tracking defaults.
5. Two reusable MATERIAL primitives:
   - `GlassSurface` — translucent blur + legibility scrim + soft shadow, adapts
     per theme. For chrome only.
   - `PaperSurface` — aged paper grain, soft page-edge shadow, optional slight
     rotation + torn/taped edge variants. For content only.
6. Theme switching: follow system by default, expose a manual override.
7. Responsive shell: mobile bottom-bar zone vs. desktop/iPad side-rail zone
   (empty placeholders for now).
8. **Button component with the leaf motif from the start.** The primary button
   (and the "+" action) carry a subtle leaf styling — a leaf-shaped detail,
   curve, or vein flourish — so the brand identity is baked in from build one,
   not retrofitted later. Provide button states (default/hover/press/disabled)
   in both themes, leaf detail intact, tap targets 44px+.
9. **PWA splash + install.**
   - Launch splash screen: app icon (leaf mark) on a warm, atmospheric
     background, per theme. Since a PWA has no app-store listing, this is the
     first impression on open.
   - Install-to-home-screen prompt: a gentle, dismissible invitation to install
     Flyleaf as an app (not a nag). The "what you get" value pitch lives in
     onboarding (07), not here.

## Interaction
None yet beyond theme toggle. Keep it static.

## Success
- Installs as a PWA; works offline at the shell level.
- Updates: deploying a new version reaches users automatically; they see a
  gentle "new version ready" refresh prompt; their local data survives updates.
- Toggling light/dark swaps the whole palette via tokens (no hard-coded colors).
- `GlassSurface` and `PaperSurface` render correctly in both themes, AA+ contrast.
- The primary/"+" buttons show the leaf motif in both themes and all states.
- Launch splash + install prompt work in both themes.
- Fonts load with sensible fallbacks; no layout shift.

## Approval gate
STOP. Show me: the stack/storage/hosting proposal, the token sheet, and a bare
demo page rendering one GlassSurface over one PaperSurface in both themes.
Wait for my yes before moving to 02.
