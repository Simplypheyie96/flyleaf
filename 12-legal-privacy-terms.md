# 12 — Legal: Privacy Policy, Terms & Licensing

> Feed near the end (before launch). Adds the legal pages that protect the
> builder and inform users. IMPORTANT: these are STARTER drafts, not legal
> advice — have a professional review before serious/scaled/EU use.

## Core idea
Flyleaf needs three things in place before launch: a Privacy Policy, Terms of
Service (with disclaimers), and correct Licensing/attribution. Build simple,
readable pages (linked from Settings + onboarding), on-brand and plain-English.

## 1) Privacy Policy — what to cover
Flyleaf is local-first and privacy-friendly; the policy should say so clearly:
- **What stays on the device:** by default, all content (books, notes, quotes,
  voice memos, images, highlights) is stored locally in the browser and NOT sent
  to us.
- **What we store (only if the user opts into Google sync):** their content is
  synced to our Cloudflare backend so they can use multiple devices; it is
  private to them, encrypted in transit, never sold or shared.
- **Third parties + what they handle:**
  - Google Sign-In (if used) — identity only; link Google's privacy terms.
  - Paystack (if the user tips) — handles all payment/card data; we never see or
    store card details; link Paystack's terms.
  - Book data sources (Open Library / Google Books) — we fetch public book info.
- **Export/import:** users can export their data anytime; exported files are
  their responsibility.
- **Children / age, contact email for privacy questions, and how to delete data**
  (clear local data + delete synced account).
- Note GDPR/UK basics if any EU/UK users are expected (right to access/delete).

## 2) Terms of Service / Disclaimer — what to cover
- **As-is, no warranty:** the app is provided as-is; no guarantee of
  availability or fitness.
- **Data responsibility (CRITICAL for local-first):** users are responsible for
  backing up their own data (export or sync). We are not liable for data lost due
  to cleared browser storage, lost devices, or not backing up. State this plainly
  and kindly.
- **Acceptable use:** personal, private journaling; users own their content.
- **Tips are non-refundable gratitude** (via Paystack), not a purchase of
  features; the app is free.
- **Changes to the service / terms**, and **contact info**.

## 3) Licensing / attribution — what to cover
- **Your app:** state copyright ("© [Year] [Your name] — Flyleaf"). Decide if the
  code is private/proprietary or open-source; if any dependencies require license
  notices, include them.
- **Book data + covers:** respect and ATTRIBUTE the sources:
  - Open Library / Internet Archive — follow their API + data license terms; add
    attribution where required.
  - Google Books API — follow Google Books API branding + terms of service.
  - Any other cover source — check its license before use.
- **Fonts:** confirm the chosen serif/grotesk/handwriting fonts are licensed for
  web/app use (prefer open-license fonts to avoid fees).
- **Generated covers:** these are original app-generated art (see 03); note they
  are Flyleaf-generated and typeset by the app.

## Where these live in the app
- Linked in Settings ("Privacy", "Terms", "Licenses / Credits").
- Privacy + a one-line reassurance surfaced gently during onboarding/handle
  claim ("Your memories stay on your device unless you turn on sync").
- A short, human summary at the top of each page, full text below.

## Negative prompt
No copying another app's policy verbatim. No claiming legal completeness — mark
as starter templates needing review. No hiding the data-loss disclaimer. No
using book data/fonts without checking their license.

## Builder to-do (for YOU, not Claude)
- Fill in: your name/entity, contact email, jurisdiction (Nigeria), effective date.
- Review the drafts with a professional before scaling or accepting EU/UK users.
- Confirm font licenses and Open Library / Google Books attribution requirements.
- Decide your code license (proprietary vs. open-source).

## Success
Flyleaf launches with clear, honest, on-brand Privacy, Terms, and Licensing pages
that inform users and reasonably protect the builder — flagged as starter drafts
to be professionally reviewed.
