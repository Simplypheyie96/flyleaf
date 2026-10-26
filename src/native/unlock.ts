/* What the store apps sell: one unlock, bought once. Two products open the
   same door: Unlock and Supporter (the second is the tip jar's place in the
   store apps, where Paystack may not be used for anything digital). There is no
   subscription and nobody pays before using the app.

   Free in the store apps: the timeline for FREE_BOOKS books, with quotes,
   words, notes and photographs. The unlock adds unlimited books, voice memos,
   characters, places and threads, the printed journal, and sync.

   Nothing is ever taken away. A reader past the free limit (from a restored
   backup, or after the trial) keeps every book and every keep they have, can
   open, edit and add free kinds of keep to all of them, and is only asked to
   unlock when they shelve one more book or start a locked kind.

   THE WEB IS NOT TOUCHED. Off the native shell `full()` is always true and none
   of this file's plugin code runs.

   Purchases are checked on the device: StoreKit 2 only hands over transactions
   it has verified against Apple's signature, and Play Billing only reports
   purchases Play holds. When the Flyleaf account (api.flyleaf.cc) learns to
   verify receipts (docs/store/launch.md, "Server check later"), the result
   below can come from there instead, with this as the offline fallback. */

import { useSyncExternalStore } from 'react'
import type { EntryType } from '../data/db'
import { android, ios, native } from './platform'

export const FREE_BOOKS = 1
export const TRIAL_DAYS = 14
const DAY = 86_400_000

export const PRODUCTS = {
  unlock: 'com.feyidesigns.journal.unlock',
  supporter: 'com.feyidesigns.journal.supporter',
  /** iOS only: a $0 non-consumable named "14-day full trial" (App Review
      guideline 3.1.1 allows free trials for non-subscription apps this way).
      Android has no such product: the app counts from its first launch. */
  trial: 'com.feyidesigns.journal.trial',
} as const
type Paid = 'unlock' | 'supporter'

/** The kinds of keep the unlock opens. Quote, word, note and photo stay free. */
const LOCKED: EntryType[] = ['voice', 'character', 'place', 'thread']

interface State {
  owned: Paid[]
  /** When the trial began: the trial purchase on iOS, first launch on Android. */
  trialFrom: number | null
}

const KEY = 'flyleaf-unlock'
const FIRST = 'flyleaf-first-launch'

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as State
  } catch {
    /* falls through to an empty state */
  }
  return { owned: [], trialFrom: null }
}

let state: State = native ? load() : { owned: [], trialFrom: null }
const listeners = new Set<() => void>()

function set(next: State) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* kept in memory for this launch; refresh() rebuilds it from the store */
  }
  listeners.forEach((fn) => fn())
}

/* Android: the trial starts the first time the app opens. */
if (android) {
  try {
    let first = Number(localStorage.getItem(FIRST))
    if (!first) {
      first = Date.now()
      localStorage.setItem(FIRST, String(first))
    }
    if (state.trialFrom !== first) state = { ...state, trialFrom: first }
  } catch {
    /* no storage: no trial, the free tier still works */
  }
}

export function trialEnds(s: State = state): number | null {
  return s.trialFrom === null ? null : s.trialFrom + TRIAL_DAYS * DAY
}

/** Everything open: the web, a purchase, or a running trial. */
export function full(): boolean {
  if (!native) return true
  if (state.owned.length > 0) return true
  const ends = trialEnds()
  return ends !== null && Date.now() < ends
}

export function kindLocked(type: EntryType): boolean {
  return !full() && LOCKED.includes(type)
}

/** May one more book go on the shelf? Counts what is there, never removes. */
export async function canAddBook(): Promise<boolean> {
  if (full()) return true
  const { default: db } = await import('../data/db')
  return (await db.books.count()) < FREE_BOOKS
}

export type Reason = 'books' | 'kind' | 'export' | 'sync' | 'settings'

/** Opens the unlock sheet (mounted once in App). */
export function askUnlock(reason: Reason) {
  window.dispatchEvent(new CustomEvent<Reason>('flyleaf-unlock', { detail: reason }))
}

export function useUnlock() {
  const s = useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => state,
  )
  return { owned: s.owned, trialEnds: trialEnds(s), full: full() }
}

/* ── The store ────────────────────────────────────────────────────────── */

const plugin = () => import('@capgo/native-purchases')

/** Reads what the store says this account owns, and keeps it for offline
    launches. Run at start-up and after every purchase or restore. A store
    that cannot be reached leaves the last known state alone. */
export async function refresh(): Promise<void> {
  if (!native) return
  const { NativePurchases, PURCHASE_TYPE } = await plugin()
  const { purchases } = await NativePurchases.getPurchases(
    android ? { productType: PURCHASE_TYPE.INAPP } : {},
  )
  const owned = new Set<Paid>()
  let trialFrom = android ? state.trialFrom : null
  for (const p of purchases) {
    // Refunded on iOS: still in the history, with a revocation date.
    if (ios && p.revocationDate) continue
    // Android: 1 is PURCHASED; a pending purchase opens nothing yet.
    if (android && p.purchaseState !== '1') continue
    if (android && p.isAcknowledged === false && p.purchaseToken) {
      // Play refunds a purchase left unacknowledged for three days.
      await NativePurchases.acknowledgePurchase({ purchaseToken: p.purchaseToken }).catch(() => {})
    }
    if (p.productIdentifier === PRODUCTS.unlock) owned.add('unlock')
    if (p.productIdentifier === PRODUCTS.supporter) owned.add('supporter')
    if (ios && p.productIdentifier === PRODUCTS.trial) {
      const from = Date.parse(p.purchaseDate)
      if (!Number.isNaN(from)) trialFrom = trialFrom === null ? from : Math.min(trialFrom, from)
    }
  }
  set({ owned: [...owned], trialFrom })
}

/** Store prices as the reader's storefront shows them. */
export async function prices(): Promise<Partial<Record<keyof typeof PRODUCTS, string>>> {
  const { NativePurchases, PURCHASE_TYPE } = await plugin()
  const { products } = await NativePurchases.getProducts({
    productIdentifiers: Object.values(PRODUCTS).filter((id) => android ? id !== PRODUCTS.trial : true),
    productType: PURCHASE_TYPE.INAPP,
  })
  const out: Partial<Record<keyof typeof PRODUCTS, string>> = {}
  for (const [name, id] of Object.entries(PRODUCTS)) {
    const found = products.find((p) => p.identifier === id)
    if (found) out[name as keyof typeof PRODUCTS] = found.priceString
  }
  return out
}

const cancelled = (e: unknown) => /cancel/i.test(`${(e as { code?: string })?.code} ${(e as Error)?.message}`)

/** Buys one product. Resolves false when the reader backs out; throws with a
    sentence fit to show when the store refuses. */
export async function buy(which: keyof typeof PRODUCTS): Promise<boolean> {
  const { NativePurchases, PURCHASE_TYPE } = await plugin()
  try {
    await NativePurchases.purchaseProduct({
      productIdentifier: PRODUCTS[which],
      productType: PURCHASE_TYPE.INAPP,
      quantity: 1,
    })
  } catch (e) {
    if (cancelled(e)) return false
    // Already owned (bought on another device, or a reinstall): that is a restore.
    await refresh().catch(() => {})
    if (full()) return true
    if (/pending/i.test(String((e as Error)?.message))) {
      throw new Error('The store is still waiting on this payment. Flyleaf opens up the moment it goes through.')
    }
    throw new Error('The store could not finish that. Try again in a moment.')
  }
  await refresh()
  return true
}

/** Restore purchases: asks the store to sync, then reads it again. */
export async function restore(): Promise<boolean> {
  const { NativePurchases } = await plugin()
  await NativePurchases.restorePurchases()
  await refresh()
  return state.owned.length > 0
}

/** Purchases the store finishes later (Ask to Buy, a slow bank) arrive here. */
export async function watchLate() {
  if (!native) return
  const { NativePurchases } = await plugin()
  await NativePurchases.addListener('transactionUpdated', () => void refresh().catch(() => {}))
}
