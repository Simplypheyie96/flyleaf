/* Signing in to Google, and nothing more than that.

   WHY THIS IS THE SHAPE IT IS. Flyleaf has no server and never wants one. So
   sync does not mean "our database holds your journey" — it means the reader's
   journey is written into the reader's OWN Google Drive, into a hidden folder
   only this app can see (`appDataFolder`). We never hold a copy, we never see
   it, and the storage it uses is theirs, not ours. That is the only version of
   sync this app could honestly offer, and it is also the only one that stays
   free no matter how many people read with it.

   NO CLIENT SECRET, ANYWHERE. This is Google Identity Services' token flow,
   which is designed for exactly this: a browser app with no backend. The
   client ID below is public by design — it is compiled into the JavaScript
   every reader downloads, and that is fine, because a client ID is not a
   credential. The client SECRET is never used, never stored, and must never
   appear in this repo.

   THE SCOPE IS ONE LINE, AND IT MATTERS. `drive.appdata` grants access to a
   folder this app creates and nothing else: not their documents, not their
   photos, not one other file in their Drive. Google classifies it as a
   non-sensitive scope for that reason, which is also why the consent screen a
   reader sees is a plain one and not a warning.

   TOKENS LIVE IN MEMORY ONLY. An access token is good for about an hour and is
   never written to disk. What IS remembered is a single flag saying "this
   reader chose to sync", which lets us ask Google for a fresh token silently
   next time rather than putting a popup in front of somebody who already said
   yes. Signing out clears the flag and revokes the token. */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
/* Two scopes, and the second one is there because the app was being vague.
   `drive.appdata` is still the only thing that touches a file. `userinfo.email`
   grants one fact and no more: the address of the account that just signed in,
   so Settings can say WHICH Google this device is syncing to instead of a bare
   "On". A reader with two accounts could not otherwise tell whether the phone
   and the laptop were even talking to the same Drive. */
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email'
const GIS_SRC = 'https://accounts.google.com/gsi/client'
const WHO = 'https://www.googleapis.com/oauth2/v3/userinfo'

/** Remembers only that the reader opted in — never a token. */
const OPTED_IN_KEY = 'flyleaf-sync-on'
/** The address on the line in Settings. A label, not a credential. */
const ACCOUNT_KEY = 'flyleaf-google-account'

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
}

interface TokenClient {
  requestAccessToken(options?: { prompt?: string }): void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string
            scope: string
            callback: (response: TokenResponse) => void
            error_callback?: (error: { type?: string }) => void
          }): TokenClient
          revoke(token: string, done?: () => void): void
        }
      }
    }
  }
}

/** False when no client ID was built in. The whole feature hides itself rather
    than offering a button that opens onto an error — the same rule the tip jar
    follows. */
export const SYNC_AVAILABLE = CLIENT_ID.length > 0

let token: string | null = null
let expiresAt = 0
let client: TokenClient | null = null
let loading: Promise<void> | null = null
/* One request may be in flight at a time: Google's callback is a single slot
   on the client, so a second overlapping call would resolve the first. */
let pending: { resolve: (t: string) => void; reject: (e: Error) => void } | null = null
/* The watchdog for that slot. GIS calls back on success, and on the failures it
   recognises — a closed popup, a blocked popup. It calls back on NEITHER when
   the popup dies on a page of Google's own (their 500 error page, reached and
   reproduced during testing): the window is still open, so nothing was closed,
   and no token is coming, so nothing succeeded. Without this, `pending` never
   settles, the button reads "Connecting…" for the rest of the session, and even
   a second press is refused by the guard below. Only a reload escapes.

   Generous on purpose. This is not a network timeout — it is the last resort
   after somebody has read a consent screen, possibly picked between accounts,
   possibly typed a password. Cutting that short would cancel a sign-in that was
   going perfectly well, which is a worse bug than the one it fixes. A silent
   refresh puts no window on screen and gets a short leash instead. */
let watchdog: ReturnType<typeof setTimeout> | null = null
const PATIENCE = { interactive: 180_000, silent: 30_000 }

/** Empty the single slot, cancelling its watchdog. Every path out of a token
    request goes through here, so the slot can never be left holding a promise
    nobody is going to settle. */
function settle(): typeof pending {
  const waiting = pending
  pending = null
  if (watchdog !== null) {
    clearTimeout(watchdog)
    watchdog = null
  }
  return waiting
}

export function optedIn(): boolean {
  try {
    return localStorage.getItem(OPTED_IN_KEY) === '1'
  } catch {
    return false
  }
}

/** The signed-in address, or an empty string when it is not known yet. */
export function account(): string {
  try {
    return localStorage.getItem(ACCOUNT_KEY) ?? ''
  } catch {
    return ''
  }
}

/** True while this device holds a live token — so a caller can tell the
    difference between "about to sync quietly" and "about to need Google's
    window", BEFORE it starts doing anything asynchronous. Safari only lets a
    popup open inside the gesture that asked for it, so that distinction has to
    be answerable synchronously or the popup is blocked. */
export function tokenHeld(): boolean {
  return token !== null && Date.now() < expiresAt
}

/* THE SILENT PATH CAN BE SHUT, AND THEN IT MUST STOP KNOCKING.

   `prompt: 'none'` is a real window — a popup Google opens and closes again in
   the same breath. When it works, nobody sees more than a flicker. When the
   browser will not allow it (Safari blocks a popup that no tap asked for, and
   blocks third-party cookies besides), it fails, and the app was asking again
   on the very next write. That is the owner's report exactly: a Google window
   flashing every single time she changed a date.

   So a silent refusal closes the silent path for a good while. Sync stops
   trying by itself, Settings says so in words, and the next real tap through
   Google's window opens it again. One flicker, then quiet — instead of one per
   keystroke's worth of work. */
const REST = 6 * 60 * 60 * 1000
let quietUntil = 0

/** True when a background sync would have to bother the reader to proceed. */
export function needsSignIn(): boolean {
  return optedIn() && !tokenHeld() && Date.now() < quietUntil
}

function keep(address: string) {
  try {
    if (address) localStorage.setItem(ACCOUNT_KEY, address)
    else localStorage.removeItem(ACCOUNT_KEY)
  } catch {
    /* See remember(): the sync still works, it is only unlabelled. */
  }
  window.dispatchEvent(new Event('flyleaf-sync'))
}

/** Ask Google who this is, once, and never block anything on the answer. */
async function learnAccount(access: string) {
  try {
    const response = await fetch(WHO, { headers: { Authorization: `Bearer ${access}` } })
    if (!response.ok) return
    const who = (await response.json()) as { email?: string }
    if (who.email && who.email !== account()) keep(who.email)
  } catch {
    /* An unnamed account is a smaller failure than a sync that refused to run
       because it could not read a label. */
  }
}

function remember(on: boolean) {
  try {
    if (on) localStorage.setItem(OPTED_IN_KEY, '1')
    else localStorage.removeItem(OPTED_IN_KEY)
  } catch {
    /* Private mode. Sync still works for this visit; it just will not resume
       by itself on the next one. */
  }
  window.dispatchEvent(new Event('flyleaf-sync'))
}

function loadScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (loading) return loading

  loading = new Promise<void>((resolve, reject) => {
    const tag = document.createElement('script')
    tag.src = GIS_SRC
    tag.async = true
    tag.defer = true
    tag.onload = () => resolve()
    tag.onerror = () => {
      loading = null
      reject(new Error('Could not reach Google. Check your connection and try again.'))
    }
    document.head.append(tag)
  })
  return loading
}

async function ensureClient(): Promise<TokenClient> {
  if (client) return client
  await loadScript()

  const oauth2 = window.google?.accounts?.oauth2
  if (!oauth2) throw new Error('Could not reach Google. Check your connection and try again.')

  client = oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: (response) => {
      const waiting = settle()
      if (!waiting) return
      if (response.error || !response.access_token) {
        waiting.reject(new Error('Google did not grant access.'))
        return
      }
      token = response.access_token
      // A minute short of the real expiry, so a request never starts on a
      // token that dies mid-flight.
      expiresAt = Date.now() + ((response.expires_in ?? 3600) - 60) * 1000
      // A token arrived, so whatever was blocking the quiet path is over.
      quietUntil = 0
      void learnAccount(response.access_token)
      waiting.resolve(response.access_token)
    },
    error_callback: (error) => {
      const waiting = settle()
      if (!waiting) return
      /* A shut popup is a decision, not a fault — it gets a plain sentence
         rather than the tone of something having gone wrong. */
      waiting.reject(
        new Error(
          error?.type === 'popup_closed'
            ? 'Sign-in was closed before it finished.'
            : 'Google could not open its sign-in window.',
        ),
      )
    },
  })
  return client
}

/** Ask Google for a token. `interactive` shows the account chooser; without it
    the request is silent and fails quietly when the reader is not signed in to
    Google in this browser — which is exactly what a background refresh wants. */
async function requestToken(interactive: boolean): Promise<string> {
  if (token && Date.now() < expiresAt) return token

  const tokenClient = await ensureClient()
  if (pending) throw new Error('Already talking to Google. Give it a moment.')

  return new Promise<string>((resolve, reject) => {
    pending = { resolve, reject }
    watchdog = setTimeout(
      () => {
        settle()?.reject(new Error('Google never answered. Try connecting again.'))
      },
      interactive ? PATIENCE.interactive : PATIENCE.silent,
    )
    /* THE PROMPT IS THE WHOLE DIFFERENCE BETWEEN THE TWO PATHS, and getting it
       wrong is what made this app ask a signed-in reader to sign in over and
       over. `''` means "show whatever Google thinks is needed", and Google
       thinks a window is needed every time, because a browser app holds no
       refresh token. So the supposedly silent refresh — the one that runs on
       launch, after every write, and behind "Sync now" — put a Google window on
       screen on each attempt, including over the lock. `'none'` is the actual
       silent flow: no window ever, a token if the reader's Google session can
       still grant one, and a plain failure if it cannot.

       Interactive keeps `''` and NOT `'consent'`. Forcing consent is for apps
       collecting a refresh token; here it only made a reader who had already
       said yes say it again, and replayed against an existing grant, which is
       where Google's 500s were appearing. Empty gives a first-time reader the
       full consent screen, because they must have it, and sends everyone after
       that straight through. */
    tokenClient.requestAccessToken({ prompt: interactive ? '' : 'none' })
  })
}

/** Fetch Google's script ahead of the press that needs it.

    Not an optimisation — a correctness fix. Safari lets a popup open only from
    inside the gesture that asked for it, and loading a script over the network
    mid-gesture spends that permission before the popup is ever requested. Any
    screen with a sign-in button should call this when it appears, so the press
    itself has nothing left to wait for. */
export function warmUp() {
  if (SYNC_AVAILABLE) void ensureClient().catch(() => {})
}

/** The reader pressed the button. Shows Google's own chooser. */
export async function signIn(): Promise<void> {
  await requestToken(true)
  remember(true)
}

/** A token for a reader who already opted in, without any window appearing.
    Throws when there is none to be had, and the caller treats that as "not
    connected right now" rather than as an error worth shouting about. */
export async function silentToken(): Promise<string> {
  if (!optedIn()) throw new Error('Not signed in.')
  if (tokenHeld()) return token as string
  if (Date.now() < quietUntil) throw new Error('Sign in to Google again to keep syncing.')
  try {
    return await requestToken(false)
  } catch (error) {
    /* Shut the silent path — see REST above. The sentence handed back is the
       one a reader can act on, not Google's account of what its popup did. */
    quietUntil = Date.now() + REST
    window.dispatchEvent(new Event('flyleaf-sync'))
    throw error instanceof Error && error.message === 'Not signed in.'
      ? error
      : new Error('Sign in to Google again to keep syncing.')
  }
}

/** Hand the token back to Google and forget the whole arrangement. The copy in
    Drive is deliberately left alone: signing out of a device must not delete
    the reader's journey from their own Drive. Removing it is their call, made
    in Drive, or by erasing the app. */
export async function signOut(): Promise<void> {
  const held = token
  token = null
  expiresAt = 0
  quietUntil = 0
  keep('')
  remember(false)
  if (!held) return
  try {
    await loadScript()
    window.google?.accounts.oauth2.revoke(held)
  } catch {
    /* The token expires on its own within the hour either way. */
  }
}
