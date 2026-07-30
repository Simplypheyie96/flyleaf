import { useState } from 'react'
import type { CSSProperties } from 'react'
import BookCover from '../components/BookCover'
import GlassSurface from '../components/GlassSurface'
import { SearchIcon } from '../components/TabIcons'
import { libraryBooks } from '../data/sample'
import pageStyles from './page.module.css'
import styles from './Library.module.css'

type ShelfView = 'Stack' | 'Shelf' | 'Grid'
const VIEWS: ShelfView[] = ['Stack', 'Shelf', 'Grid']
const VIEW_KEY = 'flyleaf-shelf-view'
const STACK_ROTATIONS = [-2.5, 2, -1.5, 2.5]
const SPINE_ROTATIONS = [0, -1, 0.5, -0.5]

function getStoredView(): ShelfView {
  const stored = localStorage.getItem(VIEW_KEY)
  return stored === 'Shelf' || stored === 'Grid' ? stored : 'Stack'
}

/* The full bookshelf: Stack (emotional default) · Shelf · Grid.
   Search here is the entry point to the archive search surface (06). */
function Library() {
  const [view, setView] = useState<ShelfView>(getStoredView)

  function choose(next: ShelfView) {
    localStorage.setItem(VIEW_KEY, next)
    setView(next)
  }

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
              placeholder="Search your books and memories…"
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

        {view === 'Stack' && (
          <div className={styles.stack}>
            {libraryBooks.map((book, i) => (
              <div
                key={book.title}
                className={styles.stackItem}
                style={{ zIndex: libraryBooks.length - i }}
              >
                <BookCover
                  title={book.title}
                  author={book.author}
                  hue={book.hue}
                  width={170}
                  rotate={STACK_ROTATIONS[i % STACK_ROTATIONS.length]}
                />
              </div>
            ))}
          </div>
        )}

        {view === 'Shelf' && (
          <div className={styles.shelf}>
            {libraryBooks.map((book, i) => (
              <div
                key={book.title}
                className={styles.spine}
                style={
                  {
                    '--spine-hue': `var(--color-${book.hue})`,
                    '--spine-rotate': `${SPINE_ROTATIONS[i % SPINE_ROTATIONS.length]}deg`,
                  } as CSSProperties
                }
              >
                <span className={styles.spineTitle}>{book.title}</span>
                <span className={styles.spineAuthor}>{book.author}</span>
              </div>
            ))}
          </div>
        )}

        {view === 'Grid' && (
          <div className={styles.grid}>
            {libraryBooks.map((book) => (
              <BookCover
                key={book.title}
                title={book.title}
                author={book.author}
                hue={book.hue}
                small
              />
            ))}
          </div>
        )}

        <p className={styles.count}>{libraryBooks.length} books</p>
      </div>
    </main>
  )
}

export default Library
