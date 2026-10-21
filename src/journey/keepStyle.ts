/* Which keep sheet opens: the card (write straight onto what it becomes) or
   the classic form. The owner is trying the card on live, so it is the
   default, and the classic one stays a tap away in Settings until one wins. */

export type KeepStyle = 'card' | 'classic'

const KEY = 'flyleaf-keep-sheet'

export function getKeepStyle(): KeepStyle {
  try {
    return localStorage.getItem(KEY) === 'classic' ? 'classic' : 'card'
  } catch {
    return 'card'
  }
}

export function setKeepStyle(style: KeepStyle) {
  try {
    localStorage.setItem(KEY, style)
  } catch {
    /* A private window keeps nothing; the default stands. */
  }
}
