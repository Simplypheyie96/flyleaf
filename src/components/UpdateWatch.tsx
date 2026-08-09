import { useRegisterSW } from 'virtual:pwa-register/react'

/** How often an open copy of Flyleaf asks the server whether a newer build
    exists. An hour is far more often than we ship and still costs one
    conditional request that is almost always a 304. */
const UPDATE_EVERY_MS = 60 * 60 * 1000

/** THE THING THAT GETS A NEW BUILD ONTO THE READER'S DEVICE. It draws nothing.

    This was UpdateToast, and the toast is gone with the move to autoUpdate —
    see the long note on registerType in vite.config.ts for why that changed,
    and settings/Recheck.tsx for where the question the toast used to answer
    now lives. What is left is the half that was always doing the work.

    Registration alone is not delivery. A new worker can only be found after
    the browser re-fetches sw.js, and the browser does that on navigation — but
    an installed PWA resumed from the home screen does not navigate. iOS
    suspends the app and hands it back on the same document it froze, so the
    check never runs on its own and a phone can sit on a months-old build
    having never once been told otherwise. Shipping a fix and watching a device
    stay broken is not a caching curiosity; it is the fix not being delivered.

    So we ask rather than wait to be told: once at startup, every time the app
    comes back to the front — the moment an installed PWA has instead of a page
    load, and the one that matters most — and on a slow interval for a copy
    left open all day. `update()` is a conditional request against sw.js; when
    nothing has shipped it is a 304 and nothing happens at all.

    IT MUST BE MOUNTED EVERYWHERE, and that is not a detail. The hook below
    registers the worker as a side effect of this component existing, so any
    screen that does not render it is a screen on which Flyleaf cannot be
    updated. It used to sit inside the notice dock, which was hidden on a book
    journey and on the journal — so a reader who spends her time reading was
    reloading a page that had no update machinery running on it. Mount this
    above the router, not beside the notices. */
function UpdateWatch() {
  useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return

      // Only when the tab is actually in front. A background check costs a
      // request no one is waiting on, and on iOS a suspended app cannot
      // service one anyway.
      const check = () => {
        if (document.visibilityState === 'visible') void registration.update()
      }

      check()
      window.setInterval(check, UPDATE_EVERY_MS)
      document.addEventListener('visibilitychange', check)
      // Neither listener is torn down on purpose: this component is mounted
      // once for the lifetime of the app, and registration happens once
      // inside it, so there is no second copy to leak.
    },
  })

  return null
}

export default UpdateWatch
