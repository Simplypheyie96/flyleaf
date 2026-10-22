/* Google's own "Continue with Google", drawn by Google into this box.

   It has to be theirs. The ID-token sign-in that keeps a reader signed in for
   good (see data/cloud.ts) only answers a press on Google's rendered button;
   a button of ours would have to go back to the hour-long Drive tokens that
   signed everybody out. */

import { useEffect, useRef } from 'react'
import { googleButton } from '../data/cloud'

interface Props {
  onDone: (email: string) => void
  onError: (message: string) => void
  /** Only this account may sign in here (the lock screen). */
  expect?: string
}

export default function GoogleButton({ onDone, onError, expect }: Props) {
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

  return (
    <div
      ref={box}
      style={{ width: '100%', maxWidth: 400, minHeight: 44, display: 'flex', justifyContent: 'center', alignItems: 'center', marginInline: 'auto' }}
    />
  )
}
