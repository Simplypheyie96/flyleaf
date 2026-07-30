import { useRegisterSW } from 'virtual:pwa-register/react'
import GlassSurface from './GlassSurface'
import LeafButton from './LeafButton'
import styles from './Toast.module.css'

/** The gentle "new version ready" notice. Never forces a reload; the
    service worker only swaps in when the reader taps Refresh. */
function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

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
