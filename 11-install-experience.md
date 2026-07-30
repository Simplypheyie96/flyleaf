# 11 — Install Experience & Per-Device Install Guide

> Feed after the core app + onboarding work. Makes installing Flyleaf easy on
> every device — especially iPhone/iPad, where there is NO automatic prompt.

## Core idea
Help users install Flyleaf to their home screen / dock, with platform-aware
guidance. Installed PWAs still receive updates (see 01's update strategy), so
this is purely about getting the app onto their device smoothly.

## The platform reality (build for this)
- **Android / Chrome, desktop Chrome/Edge:** the browser fires a native install
  prompt (`beforeinstallprompt`). Capture it and show a friendly "Install
  Flyleaf" button that triggers it.
- **iPhone & iPad (Safari):** NO automatic prompt is allowed. Users MUST manually
  tap **Share → Add to Home Screen**. If we don't show them how, they will never
  install. This is the most important case to handle.
- **Other browsers:** fall back to clear manual instructions.

## What to build
1. **Smart "Install Flyleaf" helper:** detect platform + browser and show the
   right path. On Android/desktop, a one-tap install button. On iOS/iPadOS, an
   illustrated step guide (Share icon → "Add to Home Screen" → Add).
2. **Illustrated per-device steps** (use the app's warm/leaf styling):
   - iPhone Safari: tap Share (□↑) → scroll → Add to Home Screen → Add.
   - iPad Safari: same, noting the Share button location on iPad.
   - Android Chrome: tap the install button, or menu (⋮) → Install app / Add to
     Home screen.
   - Desktop Chrome/Edge: install icon in the address bar, or menu → Install.
3. **Gentle, dismissible timing:** offer install AFTER the user has seen a little
   value (e.g. added a book), not on first paint. Never nag; remember dismissal.
4. **"Already installed" awareness:** if running in standalone/installed mode,
   hide install prompts.
5. **A findable "How to install" page** in Settings/Help so users can get the
   guide anytime.

## Updates note (reassure the user)
Installed Flyleaf updates automatically like the web version; the "new version
ready — tap to refresh" prompt (from 01) works for installed users too and is the
fastest way to get the newest version. Local data is never lost on update.

## Negative prompt
No forced install. No repeated nagging. No showing iOS steps to Android users or
vice versa. No install prompt when already installed. No dead-end "install failed"
states — always fall back to manual steps.

## Success
Users on any device — including iPad/iPhone — can install Flyleaf with clear,
correct, on-brand guidance, and understand that installing still gets updates.

## Gates
Static helper + all device guides → STOP. Motion/polish → STOP.
Dark + desktop/iPad layouts → STOP.
