/* WHO IS ALLOWED TO INTERRUPT, AND HOW OFTEN.
Three things in Flyleaf would like a word with the reader at some point: keep
   me on your home screen, sign in so this survives a lost phone, put a code on
   this so nobody else reads it. Each one is reasonable on its own. All three
   are an app that nags.

   Nothing here decides WHAT to say — each notice owns its own copy and its own
   trigger. This decides only whether anything at all may speak right now, and
   it says no far more often than yes.

   FOUR RULES, AND THEY COMPOUND:

   1. ONE ON SCREEN. The notices share one dock and would otherwise stack, so
      they ask for the floor one at a time as they mount and the first yes ends
      the round.

   2. ONE PER LAUNCH. Once anything has spoken this session, nothing else does.
      A reader who declines the install invite and is immediately asked to sign
      in has not been asked twice, they have been pestered once.

   3. FIVE DAYS BETWEEN. Whatever was shown, and however it ended, the app is
      quiet for five days afterwards. This is the rule that stops the sequence
      turning into a queue that empties itself over one long evening.

   4. THREE STRIKES. A notice declined three times is never shown again. The
      reader has answered; asking a fourth time is not a reminder, it is an
      argument. Everything offered here also has a permanent home in Settings,
      so nothing is lost by never asking — which is exactly why the app can
      afford to give up early. */

const KEY = 'flyleaf-nudges'

/** The three, and nothing here ranks them — the floor is claimed by whichever
    asks first, which is mount order in the dock, which is the order they are
    written in App's Dock: install, sync, lock. That is the intended ladder
    (smallest ask first; the lock last, because it is the only one that adds a
    step to opening the app) and it costs no code.

    An earlier version ranked them here and made each notice wait for the ones
    above it to be settled. It deadlocked: a reader whose browser never offers
    an install, or who installed Flyleaf before any of this existed, has an
    install invite that can never appear and therefore never resolves — and
    every later notice waited on it forever. Order that emerges from mounting
    cannot deadlock, because a notice that is not on screen is not in the
    queue. */
export const ORDER = ['install', 'sync', 'lock'] as const
export type Nudge = (typeof ORDER)[number]

const QUIET = 5 * 86_400_000
const STRIKES = 3

interface Seen {
  /** When this one last spoke. */
  at?: number
  /** How many times the reader has said not now. */
  no?: number
  /** Answered for good — took the offer, or turned the thing on elsewhere. */
  done?: boolean
}

type Book = Partial<Record<Nudge, Seen>>

/* Rule 2 lives in memory rather than storage on purpose: "this launch" is a
   fact about the running tab, and writing it down would make a reader who
   opens Flyleaf twice in one morning look like a reader who has already been
   spoken to today. */
let spoke: Nudge | null = null

function read(): Book {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Book
  } catch {
    return {}
  }
}

function write(book: Book) {
  try {
    localStorage.setItem(KEY, JSON.stringify(book))
  } catch {
    /* A full or blocked store costs the reader a nudge, not their journey. */
  }
}

function edit(name: Nudge, change: (was: Seen) => Seen) {
  const book = read()
  book[name] = change(book[name] ?? {})
  write(book)
}

/** The last time ANY notice spoke, for the five-day quiet. */
function lastSpoke(book: Book): number {
  return Math.max(0, ...ORDER.map((name) => book[name]?.at ?? 0))
}

/** Ask for the floor. Answers yes at most once per launch, across all three.

    CALLED FROM AN EFFECT, NEVER DURING RENDER, and that is what makes rule 1
    hold. Effects run in mount order, so the three notices ask one after
    another rather than all deciding they are visible in the same render pass;
    the first yes closes the door on the other two. A notice renders nothing
    until its claim comes back true.

    `earned` is the notice's own trigger — enough books shelved, enough
    memories written. Only the notice knows that. */
export function claim(name: Nudge, earned: boolean): boolean {
  /* Already holding the floor. Strict mode runs every effect twice, and a
     notice that lost its own slot to itself would flicker off on mount. */
  if (spoke === name) return true
  if (!earned || spoke !== null) return false

  const book = read()
  const seen = book[name] ?? {}
  if (seen.done) return false
  if ((seen.no ?? 0) >= STRIKES) return false
  if (Date.now() - lastSpoke(book) < QUIET) return false

  spoke = name
  edit(name, (was) => ({ ...was, at: Date.now() }))
  return true
}

/** Not now. Three of these and it never asks again. */
export function markDismissed(name: Nudge) {
  edit(name, (was) => ({ ...was, at: Date.now(), no: (was.no ?? 0) + 1 }))
}

/** Answered for good. Called when the reader takes the offer, and also when
    they turn the thing on from Settings without ever being asked — an app that
    invites you to sign in after you have signed in is not paying attention. */
export function markDone(name: Nudge) {
  edit(name, (was) => ({ ...was, done: true }))
}
