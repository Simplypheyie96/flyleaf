/* Who is reading, and what that costs us: nothing.

   A handle is not an account. It is the name the app calls the reader by on
   Home and the name written on an exported journey, and it lives in
   localStorage beside the theme because it is a preference, not a record. No
   server is told it exists, which is the whole of 09's local-first promise
   restated in one file: a reader who never signs in leaves no trace anywhere
   but their own device.

   It is kept out of Dexie deliberately. The database is the journey — books
   and keeps — and a wipe of the journey should not take the reader's name
   with it, nor should exporting the journey to a friend's device carry it. */

const HANDLE_KEY = 'flyleaf-handle'
const MET_KEY = 'flyleaf-met'

/** The name to greet, or an empty string before the reader has claimed one. */
export function getHandle(): string {
  try {
    return localStorage.getItem(HANDLE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setHandle(handle: string) {
  const trimmed = handle.trim().slice(0, 32)
  try {
    if (trimmed) localStorage.setItem(HANDLE_KEY, trimmed)
    else localStorage.removeItem(HANDLE_KEY)
  } catch {
    /* Private mode, or storage full. The app still runs; it just cannot
       remember the name, which is a smaller loss than a crash on boot. */
  }
  window.dispatchEvent(new Event('flyleaf-reader'))
}

/** True once the welcome has been through — separate from having a handle,
    because skipping the welcome is allowed and must not re-open it forever. */
export function hasMet(): boolean {
  try {
    return localStorage.getItem(MET_KEY) === '1'
  } catch {
    return true
  }
}

export function markMet() {
  try {
    localStorage.setItem(MET_KEY, '1')
  } catch {
    /* See above. */
  }
  window.dispatchEvent(new Event('flyleaf-reader'))
}
