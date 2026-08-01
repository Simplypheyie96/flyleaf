import { useRegisterSW } from 'virtual:pwa-register/react'
import GlassSurface from './GlassSurface'
import LeafButton from './LeafButton'
import styles from './Toast.module.css'

/** How often an open copy of Flyleaf asks the server whether a newer build
    exists. An hour is far more often than we ship and still costs one
    conditional request that is almost always a 304. */
const UPDATE_EVERY_MS = 60 * 60 * 1000

/** The gentle "new version ready" notice. Never forces a reload; the
    service worker only swaps in when the reader taps Refresh.

    The polling below is what makes that notice possible at all. In prompt
    mode the toast is raised by exactly one event — the service worker
    reaching `waiting` — and a worker only gets there after the browser
    re-fetches sw.js. The browser does that on navigation. An installed PWA
    resumed from the home screen does not navigate: iOS suspends the app and
    hands it back on the same document it froze, so the check never runs and
    the copy on the phone can sit on a build from months ago having never once
    been told a newer one exists. Shipping a fix and watching a device stay
    broken is not a caching curiosity, it is the fix not being delivered.

    So we ask ourselves, rather than waiting to be told: once at startup,
    every time the app comes back to the foreground — the moment that matters,
    because it is the one an installed PWA has instead of a page load — and on
    a slow interval for a copy left open all day. `update()` is a conditional
    request against sw.js; when nothing has shipped it is a 304 and no worker
    is installed, so the reader sees nothing. */
function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
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

  if (!needRefresh) return null
  return (
    <div className={styles.toast} role="status">
      <GlassSurface>
        <div className={styles.body}>
          <p className={styles.message}>
            A new version of Flyleaf is ready — tap to refresh.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.quiet}
              onClick={() => setNeedRefresh(false)}
            >
              Later
            </button>
            <LeafButton
              className={styles.compact}
              onClick={() => updateServiceWorker(true)}
            >
              Refresh
            </LeafButton>
          </div>
        </div>
      </GlassSurface>
    </div>
  )
}

export default UpdateToast
