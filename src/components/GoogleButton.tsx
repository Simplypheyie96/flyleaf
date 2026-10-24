/* Google's own "Continue with Google", drawn by Google into this box.

   It has to be theirs. The ID-token sign-in that keeps a reader signed in for
   good (see data/cloud.ts) only answers a press on Google's rendered button;
   a button of ours would have to go back to the hour-long Drive tokens that
   signed everybody out. */

import { useEffect, useRef } from 'react'
import { googleButton, googleNative } from '../data/cloud'
import { native } from '../native/platform'
import { askUnlock, full } from '../native/unlock'
import LeafButton from './LeafButton'

interface Props {
  onDone: (email: string) => void
  onError: (message: string) => void
  /** Only this account may sign in here (the lock screen). */
  expect?: string
}

/* Store apps: the phone's own Google sign-in, from a button of ours. Turning
   sync on is part of the unlock; proving who you are at the lock screen
   (`expect`) is not. */
function NativeGoogleButton({ onDone, onError, expect }: Props) {
  return (
    <LeafButton
      style={{ width: '100%', maxWidth: 400, marginInline: 'auto' }}
      onClick={() => {
        if (!expect && !full()) return askUnlock('sync')
        googleNative(expect).then(onDone, (error: Error) => {
          if (!/cancel/i.test(error.message)) onError(error.message)
        })
      }}
    >
      <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M3.06364 7.50914C4.70909 4.24092 8.09084 2 12 2C14.6954 2 16.959 2.99095 18.6909 4.60455L15.8227 7.47274C14.7864 6.48185 13.4681 5.97727 12 5.97727C9.39542 5.97727 7.19084 7.73637 6.40455 10.1C6.2045 10.7 6.09086 11.3409 6.09086 12C6.09086 12.6591 6.2045 13.3 6.40455 13.9C7.19084 16.2636 9.39542 18.0227 12 18.0227C13.3454 18.0227 14.4909 17.6682 15.3864 17.0682C16.4454 16.3591 17.15 15.3 17.3818 14.05H12V10.1818H21.4181C21.5364 10.8363 21.6 11.5182 21.6 12.2273C21.6 15.2727 20.5091 17.8363 18.6181 19.5773C16.9636 21.1046 14.7 22 12 22C8.09084 22 4.70909 19.7591 3.06364 16.4909C2.38638 15.1409 2 13.6136 2 12C2 10.3864 2.38638 8.85911 3.06364 7.50914Z" />
      </svg>
      Continue with Google
    </LeafButton>
  )
}

export default function GoogleButton(props: Props) {
  return native ? <NativeGoogleButton {...props} /> : <WebGoogleButton {...props} />
}

function WebGoogleButton({ onDone, onError, expect }: Props) {
  const box = useRef<HTMLDivElement>(null)
  /* Latest callbacks without redrawing Google's iframe on every render. */
  const done = useRef(onDone)
  const fail = useRef(onError)
  done.current = onDone
  fail.current = onError

  useEffect(() => {
    if (!box.current) return
    googleButton(
      box.current,
      (email) => done.current(email),
      (message) => fail.current(message),
      expect,
    ).catch((error: Error) => fail.current(error.message))
  }, [expect])

  /* `colorScheme: light` matches Google's iframe document. In dark mode the page
     is `color-scheme: dark`, and a mismatch makes the browser paint an opaque
     white backdrop behind the iframe: the white box around the button. */
  return (
    <div
      ref={box}
      style={{ width: '100%', maxWidth: 400, minHeight: 44, display: 'flex', justifyContent: 'center', alignItems: 'center', marginInline: 'auto', colorScheme: 'light' }}
    />
  )
}
