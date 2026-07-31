import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import BookCover from '../components/BookCover'
import GlassSurface from '../components/GlassSurface'
import { SearchIcon } from '../components/TabIcons'
import { libraryBooks } from '../data/sample'
import {
  SWITCH_ENGINES,
  ENGINE_KEY,
  getStoredEngine,
  runSwitch,
} from '../motion/viewSwitch'
import type { FadePhase, SwitchEngine } from '../motion/viewSwitch'
import pageStyles from './page.module.css'
import styles from './Library.module.css'

type ShelfView = 'Stack' | 'Shelf' | 'Grid'
const VIEWS: ShelfView[] = ['Stack', 'Shelf', 'Grid']
const VIEW_KEY = 'flyleaf-shelf-view'
const SPINE_ROTATIONS = [0, -1, 0.5, -0.5]

/* TEMPORARY. The three switch approaches are all wired so they can be compared
   on a real device; once one is picked, drop this flag, the trial row below,
   and the two unused engines in motion/viewSwitch.ts. */
const SWITCH_TRIAL = true
const ENGINE_LABELS: Record<SwitchEngine, string> = {
  morph: 'Morph',
  crossfade: 'Cross-fade',
  flip: 'FLIP',
}

/* The spine gives the title about 108px of run: 200px tall, less 24px of
   padding, less the ~65px the author's line claims at its longest. At the
   widest the serif measures (~6.3px a character) that is 17 characters.

   The cut has to happen here, in the string, because CSS cannot do it. Once a
   title is longer than its spine, Chromium wraps it into a second column that
   runs sideways off the shelf — and it does that with `white-space: nowrap`
   computed and even forced with `!important`, in `writing-mode: vertical-rl`
   inside a flex row. `overflow: hidden` doesn't help either; it just clips a
   box that then gets painted twice. Keeping the text inside the spine is the
   only thing that holds, so nothing downstream is ever asked to squeeze.

   Real books cut long titles the same way. The full one is a tap away in
   stack and grid, and is on the element as a title attribute meanwhile.
   Re-measure if --text-sm, the 200px spine, or the serif ever change. */
const SPINE_MAX = 17

/* Prefer the last whole word. Cutting mid-word doesn't read as shortened, it
   reads as a different book: "The Lantern Season" clipped to the budget gives
   "The Lantern Seas…", which is a plausible title that doesn't exist.

   Only when the word boundary still carries most of the run, though. The cut
   in "The Cartographer's Daughter" lands on the apostrophe, and the previous
   boundary is after "The" — so that one keeps the hard cut and loses a
   possessive rather than the whole subject. */
function spineLabel(title: string) {
  if (title.length <= SPINE_MAX) return title

  const hard = title.slice(0, SPINE_MAX - 1)
  const lastSpace = hard.lastIndexOf(' ')
  const midWord = title[SPINE_MAX - 1] !== ' '
  const keepsMost = lastSpace >= hard.length * 0.6

  const cut = midWord && keepsMost ? hard.slice(0, lastSpace) : hard
  return `${cut.trimEnd()}…`
}

function getStoredView(): ShelfView {
  const stored = localStorage.getItem(VIEW_KEY)
  return stored === 'Shelf' || stored === 'Grid' ? stored : 'Stack'
}

/* The full bookshelf: Stack (emotional default) · Shelf · Grid.
   Search here is the entry point to the archive search surface (06). */
function Library() {
  const [view, setView] = useState<ShelfView>(getStoredView)
  const [engine, setEngine] = useState<SwitchEngine>(getStoredEngine)
  const [phase, setPhase] = useState<FadePhase>('idle')
  const shelfRef = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])

  // The cross-fade engine runs on timeouts; leaving the page mid-switch must
  // not leave a setState pointed at an unmounted tree.
  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach(clearTimeout)
      pending.length = 0
    }
  }, [])

  function schedule(fn: () => void, delay: number) {
    timers.current.push(window.setTimeout(fn, delay))
  }

  function choose(next: ShelfView) {
    if (next === view) return
    localStorage.setItem(VIEW_KEY, next)
    runSwitch(engine, () => setView(next), {
      root: shelfRef.current,
      setPhase,
      schedule,
    })
  }

  function chooseEngine(next: SwitchEngine) {
    localStorage.setItem(ENGINE_KEY, next)
    setEngine(next)
  }

  // The phase is the signal on its own: only the cross-fade path ever sets it,
  // so a non-idle phase means the wrapper is mid-fade. Don't narrow this to
  // `engine === 'crossfade'` — under reduced motion every engine routes through
  // the cross-fade, and that check would silently drop the class.
  const phaseClass = phase !== 'idle' ? styles[phase] : ''

  return (
    <main className={pageStyles.page}>
      <div className={pageStyles.column}>
        <header className={styles.masthead}>
          <h1 className={styles.title}>The Library</h1>
          <p className={styles.subtitle}>every book you keep</p>
        </header>

        <GlassSurface className={styles.search}>
          <div className={styles.searchInner}>
            <SearchIcon size={18} />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Search books and memories"
              aria-label="Search your books and memories"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </GlassSurface>

        <div>
          <div
            className={styles.switcher}
            role="group"
            aria-label="Shelf view"
          >
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                className={styles.viewPill}
                aria-pressed={view === v}
                onClick={() => choose(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {SWITCH_TRIAL && (
          <div className={styles.trial} role="group" aria-label="Motion trial">
            <span className={styles.trialLabel}>Motion trial</span>
            <div className={styles.trialPills}>
              {SWITCH_ENGINES.map((e) => (
                <button
                  key={e}
                  type="button"
                  className={styles.trialPill}
                  aria-pressed={engine === e}
                  onClick={() => chooseEngine(e)}
                >
                  {ENGINE_LABELS[e]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={shelfRef} className={phaseClass}>
          {view === 'Stack' && (
            <div className={styles.stack}>
              {libraryBooks.map((book, i) => (
                <div
                  key={book.title}
                  data-book={book.title}
                  className={`${styles.stackItem} ${styles.book}`}
                  style={
                    {
                      zIndex: libraryBooks.length - i,
                      viewTransitionName: `book-${i}`,
                      '--enter-delay': `calc(${i} * var(--stagger))`,
                    } as CSSProperties
                  }
                >
                  <div className={styles.print}>
                    <BookCover
                      title={book.title}
                      author={book.author}
                      hue={book.hue}
                      small={i > 0}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'Shelf' && (
            <div className={styles.shelf}>
              {libraryBooks.map((book, i) => (
                <div
                  key={book.title}
                  data-book={book.title}
                  className={`${styles.spine} ${styles.book}`}
                  style={
                    {
                      '--spine-hue': `var(--color-${book.hue})`,
                      '--spine-rotate': `${SPINE_ROTATIONS[i % SPINE_ROTATIONS.length]}deg`,
                      viewTransitionName: `book-${i}`,
                      '--enter-delay': `calc(${i} * var(--stagger))`,
                    } as CSSProperties
                  }
                >
                  <span className={styles.spineTitle} title={book.title}>
                    {spineLabel(book.title)}
                  </span>
                  <span className={styles.spineAuthor}>{book.author}</span>
                </div>
              ))}
            </div>
          )}

          {view === 'Grid' && (
            <div className={styles.grid}>
              {libraryBooks.map((book, i) => (
                <div
                  key={book.title}
                  data-book={book.title}
                  className={styles.book}
                  style={
                    {
                      viewTransitionName: `book-${i}`,
                      '--enter-delay': `calc(${i} * var(--stagger))`,
                    } as CSSProperties
                  }
                >
                  <BookCover
                    title={book.title}
                    author={book.author}
                    hue={book.hue}
                    small
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <p className={styles.count}>{libraryBooks.length} books</p>
      </div>
    </main>
  )
}

export default Library
