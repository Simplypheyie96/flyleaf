/* What the store apps sell: one unlock, bought once. Two products open the
   same door: Unlock and Supporter (the second is the tip jar's place in the
   store apps, where Paystack may not be used for anything digital). There is no
   subscription and nobody pays before using the app.

   Free in the store apps: the timeline for FREE_BOOKS books, with quotes,
   words, notes and photographs. The unlock adds unlimited books, voice memos,
   characters, places and threads, the printed journal, and sync.

   There is no trial: the free book is the trial. Nothing is ever taken away.
   A reader past the free limit (from a restored backup) keeps every book and every keep they have, can
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

export const PRODUCTS = {
  unlock: 'com.feyidesigns.journal.unlock',
  supporter: 'com.feyidesigns.journal.supporter',
} as const
type Paid = 'unlock' | 'supporter'

/** The kinds of keep the unlock opens. Quote, word, note and photo stay free. */
const LOCKED: EntryType[] = ['voice', 'character', 'place', 'thread']

interface State {
  owned: Paid[]
}

const KEY = 'flyleaf-unlock'

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { owned: (JSON.parse(raw) as State).owned ?? [] }
  } catch {
    /* falls through to an empty state */
  }
  return { owned: [] }
}

let state: State = native ? load() : { owned: [] }
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

/** Everything open: the web, or a purchase. */
export function full(): boolean {
  return !native || state.owned.length > 0
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
  return { owned: s.owned, full: full() }
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
  }
  set({ owned: [...owned] })
}

/** Store prices as the reader's storefront shows them. */
export async function prices(): Promise<Partial<Record<keyof typeof PRODUCTS, string>>> {
  const { NativePurchases, PURCHASE_TYPE } = await plugin()
  const { products } = await NativePurchases.getProducts({
    productIdentifiers: Object.values(PRODUCTS),
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
export async function buy(which: Paid): Promise<boolean> {
  const { NativePurchases, PURCHASE_TYPE } = await plugin()
  const had = state.owned.includes(which)
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
    if (!had && state.owned.includes(which)) return true
    if (/pending/i.test(String((e as Error)?.message))) {
      throw new Error('The store is still waiting on this payment. Flyleaf opens up the moment it goes through.')
    }
    throw new Error('The store could not finish that. Try again in a moment.')
  }
  await refresh()
  return true
}

/** Restore purchases: asks the store to sync, then reads it again. The sync
    can fail on its own (TestFlight's AppStore.sync throws an unknown error),
    but the purchases this phone already holds still read, so a failed sync
    only matters when nothing turns up. Null when the reader backed out. */
export async function restore(): Promise<boolean | null> {
  const { NativePurchases } = await plugin()
  let failed: unknown = null
  await NativePurchases.restorePurchases().catch((e) => {
    failed = e
  })
  await refresh().catch(() => {})
  if (state.owned.length > 0) return true
  if (failed && cancelled(failed)) return null
  if (failed) throw new Error('The store could not be reached to check. Try again in a moment.')
  return false
}

/** Purchases the store finishes later (Ask to Buy, a slow bank) arrive here. */
export async function watchLate() {
  if (!native) return
  const { NativePurchases } = await plugin()
  await NativePurchases.addListener('transactionUpdated', () => void refresh().catch(() => {}))
}
