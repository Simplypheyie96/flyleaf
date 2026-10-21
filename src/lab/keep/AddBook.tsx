/* Add a book. Search, then the book form, then done — one sheet that never
   changes height. Results stay up while the next search runs. A book you
   already have says so, and opens instead of being added over. Back keeps
   everything you typed or chose. Nothing is written: this is the lab. */

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import BookCover from '../../components/BookCover'
import { searchBooks, type BookResult } from '../../books/sources'
import { seedFrom } from '../../books/seed'
import { coversOf } from '../../books/covers'
import db from '../../data/db'
import BookForm, { blankBook, bookGap, type BookDraft } from './BookForm'
import { BackIcon, CloseIcon, LabSheet, SearchIcon } from './parts'
import s from './keep.module.css'

type Stage = 'search' | 'form' | 'done'

export default function AddBook({ open, onClose }: { open: boolean; onClose: () => void }) {
  const search = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<Stage>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BookResult[]>([])
  const [answered, setAnswered] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [owned, setOwned] = useState<Set<number>>(new Set())
  const [askedOwned, setAskedOwned] = useState<number | null>(null)
  /* Two drafts, so going back and forth between a result and typing it in
     never throws either away. */
  const [picked, setPicked] = useState<BookDraft | null>(null)
  const [manual, setManual] = useState<BookDraft>(blankBook)
  const [byHand, setByHand] = useState(false)
  const [nudge, setNudge] = useState(false)
  const [tries, setTries] = useState(0)
  const timer = useRef<number>(0)
  const ctrl = useRef<AbortController | null>(null)
  const [term, setTerm] = useState('')

  const draft = byHand ? manual : picked ?? manual
  const setDraft = byHand ? setManual : (b: BookDraft) => setPicked(b)
  const gap = bookGap(draft)
  const draftId = draft.title.trim() && draft.author.trim() ? seedFrom(draft.title, draft.author) : null
  const [draftOwned, setDraftOwned] = useState(false)

  useEffect(() => {
    if (!open) {
      setStage('search')
      setNudge(false)
      setAskedOwned(null)
    }
  }, [open])

  /* Debounced, but Enter skips the wait. */
  useEffect(() => {
    window.clearTimeout(timer.current)
    if (query.trim().length < 2) {
      setTerm('')
      return
    }
    timer.current = window.setTimeout(() => setTerm(query.trim()), 350)
    return () => window.clearTimeout(timer.current)
  }, [query])

  useEffect(() => {
    if (!term) {
      ctrl.current?.abort()
      setBusy(false)
      setResults([])
      setAnswered(null)
      return
    }
    ctrl.current?.abort()
    const c = new AbortController()
    ctrl.current = c
    setBusy(true)
    searchBooks(term, c.signal)
      .then(async (out) => {
        if (c.signal.aborted) return
        const rows = await db.books.bulkGet(out.results.map((r) => r.id))
        setOwned(new Set(rows.filter(Boolean).map((b) => b!.id)))
        setResults(out.results)
        setAnswered(out.answered)
      })
      .catch(() => !c.signal.aborted && setAnswered(0))
      .finally(() => !c.signal.aborted && setBusy(false))
  }, [term, tries])

  useEffect(() => {
    if (draftId === null) return setDraftOwned(false)
    db.books.get(draftId).then((b) => setDraftOwned(Boolean(b)))
  }, [draftId])

  function choose(r: BookResult) {
    if (owned.has(r.id)) return setAskedOwned((at) => (at === r.id ? null : r.id))
    const same = picked && seedFrom(picked.title, picked.author) === r.id
    if (!same)
      setPicked({
        ...blankBook(),
        title: r.title,
        author: r.author,
        pages: r.pages ? String(r.pages) : '',
        year: r.year ? String(r.year) : '',
        covers: r.covers,
        coverPick: 0,
      })
    setByHand(false)
    setNudge(false)
    setStage('form')
  }

  function typeIn() {
    if (!manual.title && query.trim()) setManual((m) => ({ ...m, title: query.trim() }))
    setByHand(true)
    setNudge(false)
    setStage('form')
  }

  const unreachable = term && !busy && answered === 0
  const nothing = term && !busy && answered !== null && answered > 0 && results.length === 0

  return (
    <LabSheet open={open} onClose={onClose} label="Add a book" focus={search}>
      {stage === 'search' && (
        <>
          <header className={s.head}>
            <h2 className={s.title}>Add a book</h2>
            <button type="button" className={s.iconBtn} aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </button>
          </header>
          <form
            className={s.searchBar}
            role="search"
            onSubmit={(event) => {
              event.preventDefault()
              window.clearTimeout(timer.current)
              if (query.trim().length >= 2) {
                if (term === query.trim()) setTries((n) => n + 1)
                else setTerm(query.trim())
              }
              search.current?.blur()
            }}
          >
            <SearchIcon />
            <input
              ref={search}
              type="search"
              aria-label="Title, author or ISBN"
              placeholder="Title, author or ISBN"
              value={query}
              enterKeyHint="search"
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
            />
            <span className={s.progress} data-on={busy || undefined} aria-hidden="true" />
          </form>
          <div className={s.body} aria-busy={busy}>
            {!term && <p className={s.quiet}>Type a title, an author, or the number on the back.</p>}
            {unreachable && (
              <div className={s.state}>
                <p>We couldn’t reach the catalogues. Your connection may be off.</p>
                <button type="button" className={s.chip} onClick={() => setTries((n) => n + 1)}>
                  Try again
                </button>
              </div>
            )}
            {nothing && (
              <div className={s.state}>
                <p>Nothing under “{term}”. Try fewer words, or the author’s surname.</p>
              </div>
            )}
            {results.length > 0 && (
              <ul className={s.results} data-stale={busy || undefined}>
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={s.result}
                      aria-expanded={owned.has(r.id) ? askedOwned === r.id : undefined}
                      onClick={() => choose(r)}
                    >
                      <BookCover title={r.title} author={r.author} covers={r.covers} width={40} size="thumb" />
                      <span className={s.resultText}>
                        <span className={s.resultTitle}>{r.title}</span>
                        <span className={s.resultMeta}>
                          {r.author}
                          {r.year ? ` · ${r.year}` : ''}
                        </span>
                      </span>
                      {owned.has(r.id) && <span className={s.badge}>On your shelf</span>}
                    </button>
                    {askedOwned === r.id && (
                      <p className={s.ownedLine}>
                        Already on your shelf, with everything you’ve kept.{' '}
                        <Link to={`/book/${r.id}`} className={s.link}>
                          Open it
                        </Link>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <footer className={s.foot}>
            <button type="button" className={s.ghost} onClick={typeIn}>
              Not here? Type it in
            </button>
          </footer>
        </>
      )}

      {stage === 'form' && (
        <>
          <header className={s.head}>
            <button type="button" className={s.iconBtn} aria-label="Back to search" onClick={() => setStage('search')}>
              <BackIcon />
            </button>
            <h2 className={s.title}>{byHand ? 'Type it in' : 'Is this the one?'}</h2>
            <button type="button" className={s.iconBtn} aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </button>
          </header>
          <div className={s.body}>
            <BookForm value={draft} onChange={setDraft} />
            {draftOwned && draftId !== null && (
              <p className={s.ownedLine}>
                This one’s already on your shelf.{' '}
                <Link to={`/book/${draftId}`} className={s.link}>
                  Open it
                </Link>
              </p>
            )}
          </div>
          {gap && nudge && (
            <p className={s.hint} role="status">
              {gap}
            </p>
          )}
          <footer className={s.foot}>
            <button
              type="button"
              className={s.keep}
              aria-disabled={Boolean(gap) || draftOwned}
              onClick={() => {
                if (gap) return setNudge(true)
                if (draftOwned) return
                setStage('done')
              }}
            >
              Put it on the shelf
            </button>
          </footer>
        </>
      )}

      {stage === 'done' && (
        <>
          <header className={s.head}>
            <h2 className={s.title}>On the shelf</h2>
            <button type="button" className={s.iconBtn} aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </button>
          </header>
          <div className={`${s.body} ${s.doneBody}`}>
            <BookCover title={draft.title} author={draft.author} covers={coversOf(draft)} width={120} />
            <p>
              <em>{draft.title}</em> would be on your shelf now.
            </p>
            <p className={s.quiet}>The lab doesn’t write anything.</p>
          </div>
          <footer className={s.foot}>
            <button
              type="button"
              className={s.ghost}
              onClick={() => {
                setQuery('')
                setPicked(null)
                setManual(blankBook())
                setStage('search')
                requestAnimationFrame(() => search.current?.focus())
              }}
            >
              Add another
            </button>
            <button type="button" className={s.keep} onClick={onClose}>
              Done
            </button>
          </footer>
        </>
      )}
    </LabSheet>
  )
}
