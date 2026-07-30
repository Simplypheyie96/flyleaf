# 09 — Authentication, Data & Cross-Device Sync

> Feed early (right after 01) — several screens depend on this model.
> Chosen model: LOCAL-FIRST, with TWO ways to move devices — free EXPORT/IMPORT
> for everyone, and OPTIONAL GOOGLE LOGIN for automatic sync. Both keep the
> builder's cost at ~$0.

## Cost note (build with this in mind — the founder has no budget)
- Google Sign-In (OAuth) is FREE. There is no per-user or per-login charge.
- Export/import costs $0 — data never touches our servers.
- Cloudflare free tiers (D1, KV, R2) cover a small user base at $0; R2 has no
  egress fees. Default to free-tier-friendly choices everywhere. Do NOT introduce
  any paid service without flagging it explicitly first.

## Core idea
Flyleaf works instantly with no account; data is stored locally in the browser.
Users move to a new device in one of two ways: (A) EXPORT their journey to a file
and IMPORT it on the new device (free, manual, no account), or (B) sign in with
GOOGLE to sync automatically across devices. We store data ONLY for users who
choose Google sync.

## The model (STRICT)
1. **Entry screen: "Claim your handle."** Before entering the app, the user picks
   a username/handle. Google login is offered RIGHT THERE as optional. Two paths:
   - Handle only → straight into the app, local-first.
   - Handle + Google → same, plus automatic cross-device sync.
   Never force login.
2. **Local-first by default.** Data saves to IndexedDB, fully offline (PWA).
   Local-only users cost nothing and store nothing on our servers.
3. **Export / Import (free, always available to EVERYONE):**
   - "Export my journey" → a single downloadable file containing the whole
     library: books, notes, quotes, highlights, and bundled media (voice memos,
     images). Use a portable format (e.g. a JSON manifest + media in a zip).
   - "Import" on any device → restores the full journey from that file.
   - Make it obvious and reassuring; this is the zero-account safety net.
   - Be honest in-UI that export is a SNAPSHOT (changes after export aren't
     included until re-exported).
4. **Google sync (optional upgrade):**
   - Sign in with Google → local data uploads and links to the account.
   - Sign in on any other device (incl. desktop — same responsive PWA) → the
     full journey syncs down, always current. This is the effortless option.
   - Local + remote reconcile (last-write-wins per entry is fine for v1; entries
     are append-mostly so conflicts are rare).
5. **Private by default.** Synced data is the user's own, encrypted in transit,
   never shared. Sharing is separate and explicit (see 08).

## The honest nudge (important)
Local-only data can be lost if the user clears their browser or loses the device.
Encourage protection gently, WITHOUT forcing login:
- After the user has invested a little (a few entries), a soft, dismissible
  prompt: "Your memories live on this device. Back them up — export a copy, or
  sign in with Google to sync everywhere." Offer BOTH options in the prompt.
- Show a clear data-safety status in profile/settings (local only / synced /
  last export date).

## Technology
- Local store: IndexedDB (small wrapper); offline-first.
- Auth: **Google OAuth** as the primary optional login (free). Passkey/WebAuthn
  is an OPTIONAL nice-to-have, not required for v1. No email/password system.
- Export/import: client-side file generation + restore; no server needed.
- Backend (only for Google-synced users): Cloudflare Workers + D1/KV for records,
  R2 for media. Stay within free tiers. Propose the data model + sync strategy
  before wiring it. Minimize stored data + cost.
- Media: for synced users, voice memos + images go to R2; for local-only users
  they stay as local blobs and are included in exports.

## Layout / UX touchpoints
- Entry screen (ties to onboarding 07): claim handle + optional Google login.
- Settings/profile: sign in with Google, sync status, export/import buttons,
  last-export date, sign out.
- Migration: new device = either import a file OR sign in with Google → data
  appears, with progress feedback.

## Negative prompt
No forced login to use the app. No password system. No storing data for users who
haven't signed in. No silent cloud upload without consent. No blocking nag
screens. No paid third-party services without explicit prior flagging.

## Success
A user starts in seconds with just a handle; anyone can move devices for free via
export/import; anyone who wants effortless sync signs in with Google; and the
builder pays ~$0 — free login, free export, free-tier storage.

## Approval gate
STOP after the data-model + sync-strategy proposal (and confirm every piece is on
a free tier), before wiring the backend.
