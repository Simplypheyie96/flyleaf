import { useRegisterSW } from 'virtual:pwa-register/react'
import GlassSurface from './GlassSurface'
import LeafButton from './LeafButton'
import styles from './Toast.module.css'

/** How often an open copy of Flyleaf asks the server whether a newer build
    exists. An hour is far more often than we ship and still costs one
    conditional request that is almost always a 304. */
const UPDATE_EVERY_MS = 60 * 60 * 1000

/** The thing that actually gets a new build onto the reader's device.

    Registration is in prompt mode (see vite.config.ts), so a newer worker
    installs, waits, and announces itself here rather than swapping in silently.
    But it can only find out there is one to install after the
    browser re-fetches sw.js, and the browser does that on navigation. An
    installed PWA resumed from the home screen does not navigate: iOS suspends
    the app and hands it back on the same document it froze, so the check never
    runs and the copy on the phone can sit on a build from months ago having
    never once been told a newer one exists. Shipping a fix and watching a
    device stay broken is not a caching curiosity, it is the fix not being
    delivered.

    So we ask, rather than wait to be told: once at startup, every time the app
    comes back to the foreground — the moment that matters, because it is the
    one an installed PWA has instead of a page load — and on a slow interval
    for a copy left open all day. `update()` is a conditional request against
    sw.js; when nothing has shipped it is a 304, no worker installs, and the
    reader sees nothing at all.

    The notice below is the whole point of prompt mode: it is the only moment
    at which a reader learns that the thing they are looking at has changed. It
    names the version so "am I on the fix yet?" has an answer that does not
    require faith. */
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
            A new version of Flyleaf is ready. Refresh to use it — nothing you
            have written is affected.
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
