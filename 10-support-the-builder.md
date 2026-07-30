# 10 — Support the Builder (Paystack "Buy Me a Coffee")

> Feed after the core app works. Adds an optional, tasteful way for users to
> send the builder a tip via Paystack (best one-click option in Nigeria).
> This is a "support," not a paywall — the whole app stays free.

## Core idea
A warm, optional "Support the maker" section in Settings where a user can send a
small tip (buy a coffee) via Paystack. Never nag, never gate features. Just a
kind, on-brand invitation for people who love Flyleaf to say thanks.

## Why Paystack
Nigerian processor, one-click friendly (cards, bank transfer, USSD), pays out to
a Nigerian bank account. Best fit for the builder's location.

## Layout / UX
- A "Support the maker" card in Settings (leaf-motif, warm, aged-paper feel).
- Warm one-liner (invent, on-brand), e.g. "Flyleaf is free and made by one
  person. If it's kept your memories well, you can buy me a coffee."
- Preset tip amounts (e.g. small / medium / generous) + a custom amount.
- One tap → Paystack checkout → a warm thank-you state on success (a little
  leaf/candle flourish). Dismissible, never blocking.
- Currency: default NGN; consider showing USD equivalent for international users
  if easy (optional).

## Technology (SECURITY-CRITICAL)
- Paystack has a PUBLIC key (safe in the frontend) and a SECRET key (server-only).
- The SECRET key MUST live on the Cloudflare Worker backend and NEVER appear in
  frontend code, the repo, or client bundles. Read it from a secure environment
  variable / Cloudflare secret. This is the one true danger — do not leak it.
- Flow: frontend initializes a payment with the PUBLIC key → Paystack checkout →
  backend Worker VERIFIES the transaction with the SECRET key before showing the
  thank-you (never trust the client that payment succeeded).
- Store as little as possible: a tip does not require an account or storing the
  supporter's data beyond what Paystack needs. Do not retain card details ever
  (Paystack handles all card data — never touch it).
- Keep everything on Cloudflare + Paystack free/standard tiers. Paystack charges
  a per-transaction fee (normal); no extra infra cost.

## Negative prompt
No paywall, no locking features behind payment. No nagging or repeated pop-ups.
No secret key in frontend/repo. No storing card data. No pressure language —
warm and optional only.

## Success
A supporter can tip in a couple of taps; payment is verified server-side; the
secret key is never exposed; the app stays fully free; the builder receives
payouts to their Nigerian bank account.

## Approval gate
STOP after the payment-flow + key-handling proposal (confirm secret key is
server-only) before wiring Paystack.

---

# Builder's setup guide — getting Paystack ready (plain English)

> This is for YOU (the builder), not for Claude to code. Do these steps to make
> the tip jar work. Claude can walk you through each when you reach this file.

1. **Create a Paystack account** at paystack.com. Use your real details; it's
   free to open. Choose a business name (can be "Flyleaf" or your name).
2. **Add your bank account** for payouts (a Nigerian bank account). This is where
   tips land.
3. **Complete verification** (KYC): Paystack will ask for ID / business info to
   activate live payouts. Do this early — verification can take a little time.
4. **Get your API keys** from the Paystack dashboard (Settings → API Keys):
   - **Public key** (`pk_...`) — goes in the app frontend config. Safe to expose.
   - **Secret key** (`sk_...`) — goes ONLY into your Cloudflare Worker as a
     secret/env variable. NEVER paste it into the app code, the repo, or share it.
5. **Test mode first:** Paystack gives TEST keys (`pk_test_`, `sk_test_`). Build
   and test the whole tip flow with test keys + Paystack's test cards before
   going live. No real money moves in test mode.
6. **Go live:** once verified and tested, swap to LIVE keys (`pk_live_`,
   `sk_live_`) in your production config/secrets. Do a tiny real tip to confirm
   payout works.
7. **Fees:** Paystack deducts a small per-transaction fee; the rest is paid out
   to your bank on Paystack's payout schedule. Check current rates on their site.

When you get here, ask Claude to: set up the Worker endpoint, wire the public key
in the frontend, store the secret key as a Cloudflare secret, and build the
Settings support card + thank-you state. Then you plug in your own keys.
