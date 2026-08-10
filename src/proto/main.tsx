/* PROTOTYPE SURFACE — three placements for the book picker in the KEEP TIME
   card. Reachable at /proto.html while the dev server runs.

   Nothing in the app imports this, and it imports nothing from the app except
   the real stylesheet and the real fonts and tokens, so what is being compared
   is placement and only placement. Delete this folder and proto.html once a
   direction is chosen. */

import { StrictMode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource-variable/quicksand/wght.css'
import '@fontsource-variable/eb-garamond/wght.css'
import '@fontsource/kalam/400.css'
import '../styles/tokens.css'
import '../styles/motion.css'
import '../index.css'

import Sheet from '../components/Sheet'
import s from '../routes/home/nook/timer.module.css'
import p from './proto.module.css'
import './picker.css'

/* Realistic content: two of these are the owner's actual open books, and the
   long one is here on purpose — a picker that only works on short titles is a
   picker that does not work. */
const BOOKS = [
  { id: 1, title: "Nora Roberts' The Irish Born Trilogy", author: 'Nora Roberts' },
  { id: 2, title: 'The Odyssey', author: 'Homer' },
  { id: 3, title: 'A Wrinkle in the Long Grass', author: 'Test Author' },
]

/** The shared shell, so each variant differs only where it means to. */
function useClock() {
  const [pickedId, setPickedId] = useState(BOOKS[0].id)
  const [on, setOn] = useState(false)
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!on) return
    const id = window.setInterval(() => setSeconds((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [on])
  const book = BOOKS.find((b) => b.id === pickedId) ?? BOOKS[0]
  const digits = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  return { book, pickedId, setPickedId, on, setOn, digits }
}

function Ribbon() {
  return (
    <svg className={s.ribbon} width="16" height="46" viewBox="0 0 16 46" aria-hidden="true">
      <path d="M1 0 H15 V45 L8 37 L1 45 Z" fill="currentColor" />
      <path
        d="M8 5 V33"
        fill="none"
        stroke="var(--color-paper)"
        strokeWidth="1.2"
        strokeDasharray="2.5 3.5"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  )
}

function Foot({ on, toggle }: { on: boolean; toggle: () => void }) {
  return (
    <>
      <button type="button" className={s.go} onClick={toggle} aria-pressed={on}>
        {on ? 'Stop the clock' : 'Start the clock'}
      </button>
      <p className={s.tally} role="status">
        4h 12m so far, over 6 sittings.
      </p>
    </>
  )
}

/* ── 1 · Anchored ───────────────────────────────────────────────────────── */

function Anchored() {
  const { book, pickedId, setPickedId, on, setOn, digits } = useClock()
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  /* A floating layer owes the reader both ways out. Pointerdown rather than
     click so a press that starts outside closes it without also activating
     whatever it landed on. */
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div className={s.clock} data-on={on || undefined}>
      <Ribbon />
      <div className={s.face}>
        <div className={`${s.what} ${p.anchor}`} ref={wrap}>
          <span className={s.eyebrow}>{on ? 'Reading now' : 'Keep time'}</span>
          <button
            type="button"
            className={s.pick}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={`Timing ${book.title}. Choose a different book.`}
          >
            <span className={s.book}>
              {book.title}
              <svg className={s.pickHint} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="2.5,4.25 6,7.75 9.5,4.25" />
              </svg>
            </span>
          </button>
          {open && (
            <ul className={p.pop}>
              {BOOKS.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    className={`${s.choice} ${p.popRow}`}
                    onClick={() => {
                      setPickedId(b.id)
                      setOpen(false)
                    }}
                    aria-current={b.id === pickedId || undefined}
                  >
                    <span className={s.choiceTitle}>{b.title}</span>
                    <span className={s.choiceWho}>{b.author}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className={s.digits} aria-hidden="true">
          {digits}
        </p>
      </div>
      <Foot on={on} toggle={() => setOn((v) => !v)} />
    </div>
  )
}

/* ── 2 · Shelf row ──────────────────────────────────────────────────────── */

function ShelfRow() {
  const { book, pickedId, setPickedId, on, setOn, digits } = useClock()
  return (
    <div className={s.clock} data-on={on || undefined}>
      <Ribbon />
      <div className={s.face}>
        {/* No title line here, deliberately: the lit chip below IS the title,
            and printing it twice a centimetre apart is the card telling the
            reader something it has already told them. The cost of this
            direction is exactly that — the timed book loses the big serif and
            is named at chip size instead. */}
        <p className={s.what}>
          <span className={s.eyebrow}>{on ? 'Reading now' : 'Keep time'}</span>
        </p>
        <p className={s.digits} aria-hidden="true">
          {digits}
        </p>
      </div>
      <div className={p.chips}>
        {BOOKS.map((b) => (
          <button
            key={b.id}
            type="button"
            className={p.chip}
            onClick={() => setPickedId(b.id)}
            aria-pressed={b.id === pickedId}
          >
            {b.title}
          </button>
        ))}
      </div>
      <Foot on={on} toggle={() => setOn((v) => !v)} />
    </div>
  )
}

/* ── 3 · Sheet ──────────────────────────────────────────────────────────── */

/* The one direction that is NOT a dropdown. Pressing the title raises the same
   glass sheet every other list in Flyleaf arrives on — so it brings a focus
   trap, Escape, drag-to-dismiss and a view transition already built, costs the
   card no height and no positioning, and does not care whether the reader has
   two open books or twenty. */
function SheetPick() {
  const { book, pickedId, setPickedId, on, setOn, digits } = useClock()
  const [open, setOpen] = useState(false)
  return (
    <div className={s.clock} data-on={on || undefined}>
      <Ribbon />
      <div className={s.face}>
        <p className={s.what}>
          <span className={s.eyebrow}>{on ? 'Reading now' : 'Keep time'}</span>
          <button
            type="button"
            className={s.pick}
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-label={`Timing ${book.title}. Choose a different book.`}
          >
            <span className={s.book}>
              {book.title}
              <svg className={s.pickHint} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="2.5,4.25 6,7.75 9.5,4.25" />
              </svg>
            </span>
          </button>
        </p>
        <p className={s.digits} aria-hidden="true">
          {digits}
        </p>
      </div>
      <Foot on={on} toggle={() => setOn((v) => !v)} />

      <Sheet open={open} onClose={() => setOpen(false)} label="Choose a book" name="proto-pick">
        <p className={p.sheetHead}>Which book are you reading?</p>
        <ul className={p.sheetList}>
          {BOOKS.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                className={`${s.choice} ${p.popRow}`}
                onClick={() => {
                  setPickedId(b.id)
                  setOpen(false)
                }}
                aria-current={b.id === pickedId || undefined}
              >
                <span className={s.choiceTitle}>{b.title}</span>
                <span className={s.choiceWho}>{b.author}</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  )
}

/* ── the harness ────────────────────────────────────────────────────────── */

const VARIANTS = [
  { name: 'Anchored', render: () => <Anchored /> },
  { name: 'Chips', render: () => <ShelfRow /> },
  { name: 'Sheet', render: () => <SheetPick /> },
]

function Harness() {
  const [current, setCurrent] = useState(() => {
    const v = parseInt(new URLSearchParams(location.search).get('v') ?? '', 10)
    return v >= 1 && v <= VARIANTS.length ? v - 1 : 0
  })
  /* Bumped to re-mount the variant, so entrance motion runs again. */
  const [take, setTake] = useState(0)
  const picker = useRef<HTMLElement>(null)
  const items = useRef<(HTMLButtonElement | null)[]>([])
  const [ready, setReady] = useState(false)
  const [box, setBox] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    const measure = () => {
      const el = items.current[current]
      if (el) setBox({ left: el.offsetLeft, width: el.offsetWidth })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [current])

  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)))
    return () => cancelAnimationFrame(id)
  }, [])

  function go(i: number) {
    if (i < 0 || i >= VARIANTS.length) return
    setCurrent(i)
    setTake((n) => n + 1)
    const url = new URL(location.href)
    url.searchParams.set('v', String(i + 1))
    history.replaceState(null, '', url)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const num = parseInt(e.key, 10)
      if (num >= 1 && num <= VARIANTS.length) go(num - 1)
      else if (e.key === 'ArrowRight') go((current + 1) % VARIANTS.length)
      else if (e.key === 'ArrowLeft') go((current - 1 + VARIANTS.length) % VARIANTS.length)
      else if (e.key === 'r' || e.key === 'R') setTake((n) => n + 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [current])

  return (
    <>
      <div className={p.stage}>
        <div className={p.column}>
          <div className={p.room}>the room, above the card</div>
          <div key={take}>{VARIANTS[current].render()}</div>
          <p className={p.after}>
            Whatever sits under the card. Watch whether it moves when the picker opens.
          </p>
        </div>
      </div>

      {/* Moved to the top, the one modification the picker spec allows: the
          Sheet variant owns the bottom of the screen, and chrome that covers
          the thing being judged is chrome that breaks the comparison. */}
      <nav
        className="proto-picker"
        data-position="top"
        aria-label="Prototype variants"
        ref={picker}
        {...(ready ? { 'data-ready': '' } : {})}
      >
        <span
          className="proto-picker-highlight"
          aria-hidden="true"
          style={{ width: box.width, transform: `translateX(${box.left}px)` }}
        />
        {VARIANTS.map((v, i) => (
          <button
            key={v.name}
            ref={(el) => {
              items.current[i] = el
            }}
            className="proto-picker-item"
            onClick={() => go(i)}
            {...(i === current ? { 'data-active': '', 'aria-current': 'true' as const } : {})}
          >
            {v.name}
          </button>
        ))}
        <span className="proto-picker-divider" aria-hidden="true" />
        <button
          className="proto-picker-item proto-picker-replay"
          aria-label="Replay animation (R)"
          onClick={() => setTake((n) => n + 1)}
        >
          ↻
        </button>
      </nav>
    </>
  )
}

/* Cached across hot reloads — this entry module re-executes on every edit, and
   a second `createRoot` on the same node is a console error each time. */
const host = document.getElementById('root')! as HTMLElement & { _root?: ReturnType<typeof createRoot> }
host._root ??= createRoot(host)
host._root.render(
  <StrictMode>
    <Harness />
  </StrictMode>,
)
