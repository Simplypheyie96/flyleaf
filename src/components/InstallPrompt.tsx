import { useEffect, useState } from 'react'
import GlassSurface from './GlassSurface'
import LeafButton from './LeafButton'
import styles from './Toast.module.css'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'flyleaf-install-dismissed'

/** A gentle, dismissible invitation to keep Flyleaf on the home screen.
    Browsers without beforeinstallprompt (iOS Safari) get the guide in 11. */
function InstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    if (standalone || localStorage.getItem(DISMISS_KEY)) return

    function onPrompt(e: Event) {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (!installEvent) return null

  async function install() {
    if (!installEvent) return
    await installEvent.prompt()
    await installEvent.userChoice
    setInstallEvent(null)
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setInstallEvent(null)
  }

  return (
    <div className={styles.toast} role="status">
      <GlassSurface>
        <div className={styles.body}>
          <p className={styles.message}>
            Keep Flyleaf close — add it to your home screen?
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.quiet} onClick={dismiss}>
              Not now
            </button>
            <LeafButton className={styles.compact} onClick={install}>
              Install
            </LeafButton>
          </div>
        </div>
      </GlassSurface>
    </div>
  )
}

export default InstallPrompt
