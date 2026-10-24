/* The store apps (Capacitor, branch `store`): the same journal in a native
   shell, with the App Store / Google Play purchase in place of the tip jar and
   the phone's own camera, microphone, share sheet and printer.

   Everything in src/native/ answers to the three constants below and nothing
   else. On the web there is no `window.Capacitor`, so all of them are false and
   every native path is skipped before a plugin is so much as imported: the
   plugins are loaded with import() inside the functions that need them, and
   Vite splits them into chunks the website never asks for. */

const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } })
  .Capacitor

export const native = !!cap?.isNativePlatform?.()
export const ios = native && cap?.getPlatform?.() === 'ios'
export const android = native && cap?.getPlatform?.() === 'android'
