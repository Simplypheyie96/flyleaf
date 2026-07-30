export type ThemePref = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'flyleaf-theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')

export function getPref(): ThemePref {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

function resolve(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'system') return media.matches ? 'dark' : 'light'
  return pref
}

export function applyTheme(pref: ThemePref) {
  document.documentElement.dataset.theme = resolve(pref)
}

export function setPref(pref: ThemePref) {
  if (pref === 'system') localStorage.removeItem(STORAGE_KEY)
  else localStorage.setItem(STORAGE_KEY, pref)
  applyTheme(pref)
}

/* Follow OS changes while the user hasn't overridden. */
media.addEventListener('change', () => {
  if (getPref() === 'system') applyTheme('system')
})
