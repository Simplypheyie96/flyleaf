/* /lab/directions — ROUND FOUR.

   The exploration is over; what is left is one page being finished.

   Settled across three rounds, and not up for discussion here: Bloom's
   colour system, Spread's ❧ ornament, the SPINE arrangement for the book
   being read, and the production journey — both its thread (the knots beat
   all four alternatives) and its head (the Record, which beat the two laid
   out against it). `journeyHead.tsx` stays on disk unimported: the one idea
   still owed to production is the Weave's tie, and its rule lives in that
   file's stylesheet.

   So there is nothing to pick between and no picker. What this route is now
   is Home at full size with the two things a harness is actually for: `?n=`
   to cut the stream, and `r` to replay the entrances.

   Nothing in this folder is imported by production code. When Home is
   accepted it gets rewritten into `routes/Home.tsx` in that file's own
   conventions, and this folder is deleted. */

import { useEffect, useState } from 'react'
import BloomHome from './bloomHome'
import { useStream } from './stub'
import s from './DirectionLab.module.css'

export default function DirectionLab() {
  /* Bumped to force a remount without changing anything on screen — the
     replay key. Entrances are half of what is being judged and they only
     happen once. */
  const [nonce, setNonce] = useState(0)
  const full = useStream()

  /* `?n=` truncates the stream, harness-only: the three states a layout has
     to survive are long text, empty, and many. Long and many are in the
     sample data already; empty is not reachable without this, and a Home on
     day one — no keeps yet — is the first thing a new reader sees. */
  const cut = Number.parseInt(new URLSearchParams(window.location.search).get('n') ?? '', 10)
  const stream = Number.isFinite(cut) ? full.slice(0, Math.max(cut, 0)) : full

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'r' || event.key === 'R') setNonce((n) => n + 1)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <main className={s.lab}>
      <div key={nonce} className={s.stage}>
        <BloomHome stream={stream} />
      </div>
    </main>
  )
}
