/* What to call this device, when the reader has to be told where something
   happened.

   Two journeys meeting is the one moment sync asks a question, and a question
   about "the journey in your Drive" is unanswerable — the reader knows their
   phone and their laptop, not their Drive. So the name of the device that last
   wrote goes up with the file, and the question can say "last changed on
   iPhone, two hours ago" instead.

   IT IS A GUESS, AND IT IS ALLOWED TO BE. There is no reliable way to ask a
   browser what machine it is on, and the reader is not being asked to act on
   this — they are being reminded which of their own devices they were sitting
   at. A wrong-but-plausible "iPad" is a smaller failure than "another device",
   which is what this replaces, and "Another device" is still the fallback when
   nothing matches.

   Nothing here identifies a person. It is a category of hardware, written into
   the reader's own Drive, readable by nobody but them and us. */

const KEY = 'flyleaf-device'

function guess(): string {
  const ua = navigator.userAgent
  /* iPadOS reports itself as a Mac and is only told apart by having a
     touchscreen, which is why this test comes before the Mac one. */
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad'
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android phone' : 'Android tablet'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows PC'
  if (/Linux|X11/.test(ua)) return 'Linux computer'
  return 'Another device'
}

/** This device's name, decided once and then remembered — so a browser update
    that changes the user-agent string does not rename a device the reader has
    already been shown. */
export function deviceName(): string {
  try {
    const held = localStorage.getItem(KEY)
    if (held) return held
    const name = guess()
    localStorage.setItem(KEY, name)
    return name
  } catch {
    /* Private mode. The name is still right, it just gets worked out again
       each time, which costs one regular expression. */
    return guess()
  }
}
