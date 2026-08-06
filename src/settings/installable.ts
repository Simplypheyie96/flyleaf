/* The browser's own install offer, held in one place.

   `beforeinstallprompt` fires once, early, and whoever misses it cannot ask
   for it again. Two things in Flyleaf want it — the gentle invitation that
   appears after a reader has a book on the shelf, and the Install button at
   the top of the guide — and a component that mounts later than the event
   would simply never see it.

   So the event is caught at module scope, the moment the app boots, and kept.
   Components subscribe to the fact of it rather than racing for it. */

type InstallEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let offer: InstallEvent | null = null
const watchers = new Set<() => void>()

function changed() {
  watchers.forEach((tell) => tell())
}

window.addEventListener('beforeinstallprompt', (event) => {
  // Held back so the browser's own bar does not appear on top of the app's
  // invitation; the same event is fired later, from our button.
  event.preventDefault()
  offer = event as InstallEvent
  changed()
})

window.addEventListener('appinstalled', () => {
  offer = null
  changed()
})

export function canInstall() {
  return offer !== null
}

export function watchInstallable(tell: () => void) {
  watchers.add(tell)
  return () => {
    watchers.delete(tell)
  }
}

/** Hand the held event back to the browser. Resolves to whether the reader
    went through with it — a dismissal keeps the offer, so they can try again
    from the guide without reloading. */
export async function install() {
  if (!offer) return false
  await offer.prompt()
  const { outcome } = await offer.userChoice
  if (outcome === 'accepted') {
    offer = null
    changed()
  }
  return outcome === 'accepted'
}

const GUIDE_EVENT = 'flyleaf-install-guide'

/** Open the how-to-install sheet from anywhere — the Settings row, the
    invitation, a browser that turned out to have no install route. */
export function openInstallGuide() {
  window.dispatchEvent(new CustomEvent(GUIDE_EVENT))
}

export function onInstallGuide(open: () => void) {
  window.addEventListener(GUIDE_EVENT, open)
  return () => window.removeEventListener(GUIDE_EVENT, open)
}
