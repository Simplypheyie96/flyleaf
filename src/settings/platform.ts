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

interface Guide {
  label: string
  steps: string[]
}

/* Three lines a reader can follow with the phone in their hand, and nothing
   else. The control is named the way the OS names it and placed on screen in
   the same breath — "tap Share" is useless to anyone who has never noticed the
   Share button — but the sentence stops there. Every word of reassurance and
   explanation that used to live here is now one footnote under the whole
   group, said once instead of seven times. */
export const GUIDES: Record<Device, Guide> = {
  iphone: {
    label: 'iPhone',
    steps: [
      'In Safari, tap Share at the bottom of the screen.',
      'Scroll down the list and tap Add to Home Screen.',
      'Tap Add.',
    ],
  },
  ipad: {
    label: 'iPad',
    steps: [
      'In Safari, tap Share in the toolbar along the top.',
      'Choose Add to Home Screen.',
      'Tap Add.',
    ],
  },
  android: {
    label: 'Android',
    steps: [
      'Tap Install above, if it appeared.',
      'Otherwise open Chrome’s menu — three dots, top right.',
      'Choose Install app, then confirm.',
    ],
  },
  chromium: {
    label: 'Chrome / Edge',
    steps: [
      'Click Install above, if it appeared.',
      'Otherwise click the install icon at the end of the address bar.',
      'No icon? Browser menu → Install Flyleaf.',
    ],
  },
  'safari-mac': {
    label: 'Safari on Mac',
    steps: [
      'Click Share in the Safari toolbar.',
      'Choose Add to Dock.',
      'Click Add.',
    ],
  },
  firefox: {
    label: 'Firefox',
    steps: [
      'Firefox on a computer cannot do this.',
      'Open Flyleaf in Chrome, Edge or Safari instead.',
      'On Android, Firefox can: menu → Install.',
    ],
  },
  other: {
    label: 'Something else',
    steps: [
      'Open your browser’s menu.',
      'Look for Install, Add to Home screen or Add to Dock.',
      'If it is not there, use Chrome, Edge or Safari.',
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
