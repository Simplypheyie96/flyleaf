/* Which device the reader is holding, and whether Flyleaf is already on it.

   Installing a web app is the one thing in this project that genuinely differs
   per platform, and it differs in a way the reader cannot guess. Android and
   the Chromium desktops fire `beforeinstallprompt` and can install in one tap.
   Safari — on iPhone, iPad and now the Mac — fires nothing at all and never
   will: the only route is a menu item the reader has to be told about by name.
   Desktop Firefox has no route at all.

   So this is sniffing, which is normally the wrong answer. It is the right one
   here because there is no capability to feature-detect: the absence of an
   install event is indistinguishable from an install event that has not fired
   yet, and "wait and see" is exactly the silence that leaves an iPhone reader
   never installing. Every guess is overridable in the guide itself. */

export type Device =
  | 'iphone'
  | 'ipad'
  | 'android'
  | 'chromium'
  | 'safari-mac'
  | 'firefox'
  | 'other'

/** Already on the home screen or in the dock, by either of the two ways a
    browser admits it — the standard display-mode query, and the non-standard
    flag iOS Safari has carried since long before that query existed. */
export function installed() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function detect(): Device {
  const ua = navigator.userAgent

  if (/iPhone|iPod/.test(ua)) return 'iphone'
  if (/iPad/.test(ua)) return 'ipad'
  /* iPadOS 13 and later tell every site they are a Mac, so a desktop-class
     iPad is indistinguishable from a MacBook by name alone. The touch count
     is the one honest difference: a Mac reports 0, an iPad reports 5. */
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return 'ipad'
  if (/Android/.test(ua)) return 'android'
  // Order matters below: every Chromium browser also says "Safari", and Edge
  // also says "Chrome".
  if (/Firefox\/|FxiOS/.test(ua)) return 'firefox'
  if (/Edg\/|Chrome\/|Chromium\//.test(ua)) return 'chromium'
  if (/Safari\//.test(ua)) return 'safari-mac'
  return 'other'
}

export type Glyph = 'share' | 'add' | 'menu' | 'window'

export interface Step {
  glyph: Glyph
  text: string
}

interface Guide {
  label: string
  /** The line above the steps — what this device can actually do. */
  lede: string
  steps: Step[]
}

/* Written as instructions a reader can follow with the phone in their hand:
   the control is named the way the OS names it, and where it is on screen is
   part of the sentence. "Tap Share" is useless if you have never noticed the
   Share button; "the Share button at the bottom of the screen — a square with
   an arrow coming out of it" is not. */
export const GUIDES: Record<Device, Guide> = {
  iphone: {
    label: 'iPhone',
    lede: 'Safari on iPhone never offers to install anything. Three taps, and Flyleaf sits on your home screen like any other app.',
    steps: [
      {
        glyph: 'share',
        text: 'Open Flyleaf in Safari and tap the Share button at the bottom of the screen — a square with an arrow coming out of the top.',
      },
      {
        glyph: 'add',
        text: 'Scroll the list of actions down until you find Add to Home Screen, and tap it.',
      },
      {
        glyph: 'window',
        text: 'Tap Add in the top right. Flyleaf gets its own icon, and opens without Safari around it.',
      },
    ],
  },
  ipad: {
    label: 'iPad',
    lede: 'Same three steps as an iPhone, with the Share button somewhere else — iPad keeps it in the top toolbar.',
    steps: [
      {
        glyph: 'share',
        text: 'Open Flyleaf in Safari and tap the Share button in the toolbar along the top, near the address bar.',
      },
      { glyph: 'add', text: 'Choose Add to Home Screen from the list.' },
      {
        glyph: 'window',
        text: 'Tap Add. Flyleaf appears on the home screen and opens in its own window.',
      },
    ],
  },
  android: {
    label: 'Android',
    lede: 'Chrome on Android can do this in one tap — and if it has not offered, the menu has it.',
    steps: [
      {
        glyph: 'window',
        text: 'If an Install button appeared above, tap it and you are done.',
      },
      {
        glyph: 'menu',
        text: 'Otherwise open Chrome’s menu — the three dots at the top right — and choose Install app. Older versions call it Add to Home screen.',
      },
      { glyph: 'add', text: 'Confirm with Install.' },
    ],
  },
  chromium: {
    label: 'Chrome / Edge',
    lede: 'Flyleaf can live in its own window, in your dock or taskbar, with no browser around it.',
    steps: [
      {
        glyph: 'window',
        text: 'If an Install button appeared above, click it. Otherwise look for the small install icon at the right-hand end of the address bar.',
      },
      {
        glyph: 'menu',
        text: 'No icon? Open the browser menu — ⋮ in Chrome, … in Edge — and choose Install Flyleaf. Chrome files it under Cast, save and share.',
      },
      { glyph: 'add', text: 'Confirm with Install.' },
    ],
  },
  'safari-mac': {
    label: 'Safari on Mac',
    lede: 'Safari on macOS Sonoma and later can put Flyleaf in the Dock. It calls it adding to the Dock rather than installing.',
    steps: [
      {
        glyph: 'share',
        text: 'Open Flyleaf in Safari and click the Share button in the toolbar.',
      },
      { glyph: 'add', text: 'Choose Add to Dock.' },
      {
        glyph: 'window',
        text: 'Click Add. Flyleaf gets a Dock icon and its own window.',
      },
    ],
  },
  firefox: {
    label: 'Firefox',
    lede: 'Firefox on a computer cannot add web apps to your dock — that is a Firefox limitation, not something Flyleaf can work around.',
    steps: [
      {
        glyph: 'window',
        text: 'Open Flyleaf in Chrome, Edge or Safari on the same computer, and the install option will be there.',
      },
      {
        glyph: 'menu',
        text: 'On an Android phone, Firefox can do it: open the menu and choose Install.',
      },
      {
        glyph: 'add',
        text: 'Either way, nothing you have saved is affected. Your journey lives on the device, and a bookmark keeps Flyleaf reachable meanwhile.',
      },
    ],
  },
  other: {
    label: 'Something else',
    lede: 'Most browsers can do this; they all name it differently.',
    steps: [
      {
        glyph: 'menu',
        text: 'Open your browser’s menu and look for Install, Install app, Add to Home screen or Add to Dock.',
      },
      {
        glyph: 'window',
        text: 'If none of those are there, open Flyleaf in Chrome, Edge or Safari instead.',
      },
      {
        glyph: 'add',
        text: 'Flyleaf works perfectly well in a browser tab either way — installing only removes the browser from around it.',
      },
    ],
  },
}

export const DEVICES: Device[] = [
  'iphone',
  'ipad',
  'android',
  'chromium',
  'safari-mac',
  'firefox',
  'other',
]
