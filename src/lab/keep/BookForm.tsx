/* One form for a book, used by Add (after a search, or typed in by hand) and
   by Edit. Today these are two copies of the same markup that have drifted:
   Edit has no format and no start date. Here they are one thing. */

import { useEffect, useMemo, useState } from 'react'
import BookCover from '../../components/BookCover'
import { CoverStrip } from '../../components/CoverChoice'
import FormatRow from '../../components/FormatRow'
import { DRAWN, cleanCovers, coversOf } from '../../books/covers'
import { useBookSearch } from '../../books/useBookSearch'
import own from '../../components/EditBookSheet.module.css'
import { todayISO } from '../../components/date/dates'
import type { BookFormat } from '../../data/db'
import s from './keep.module.css'

export interface BookDraft {
  title: string
  author: string
  pages: string
  year: string
  covers: string[]
  coverPick?: number
  formats: BookFormat[]
  startedOn: string
  finishedOn: string
}

export const blankBook = (): BookDraft => ({
  title: '',
  author: '',
  pages: '',
  year: '',
  covers: [],
  formats: ['physical'],
  startedOn: todayISO(),
  finishedOn: '',
})

export function bookGap(b: BookDraft) {
  if (!b.title.trim() && !b.author.trim()) return 'A title and an author, and it can go on the shelf'
  if (!b.title.trim()) return 'Add the title'
  if (!b.author.trim()) return 'Add who wrote it'
  return undefined
}

export default function BookForm({
  value,
  onChange,
  finished = false,
  first,
}: {
  value: BookDraft
  onChange: (b: BookDraft) => void
  /** Edit shows the finished day; Add does not, a book being added is being read. */
  finished?: boolean
  first?: React.RefObject<HTMLInputElement | null>
}) {
  /* Change cover is always there, not only when there are jackets to swap
     between: a book with none is the one that most needs finding. Same search
     as the edit sheet in production: the words are the reader's to fix, and a
     title + author that finds nothing is asked again on the title alone. */
  const [changing, setChanging] = useState(false)
  const [words, setWords] = useState('')
  const [hunt, setHunt] = useState('')
  const found = useBookSearch(hunt)
  const covers = useMemo(() => {
    const all = cleanCovers(value.covers)
    if (found.status === 'done')
      for (const r of found.results)
        for (const url of cleanCovers(r.covers)) if (all.length < 8 && !all.includes(url)) all.push(url)
    return all
  }, [value.covers, found])
  useEffect(() => {
    if (found.status !== 'done' || found.results.length > 0) return
    const bare = value.title.trim()
    if (bare.length < 2 || hunt.trim() === bare) return
    setWords(bare)
    setHunt(bare)
  }, [found, hunt, value.title])
  const look = () => setHunt((was) => (was === words.trim() ? `${words.trim()} ` : words.trim()))
  function toggleCovers() {
    if (!changing) {
      const q = `${value.title} ${value.author}`.trim()
      setWords(q)
      if (!value.covers.length) setHunt(q)
    }
    setChanging(!changing)
  }
  const set = (key: 'title' | 'author' | 'pages' | 'year' | 'startedOn' | 'finishedOn') =>
    (event: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [key]: event.target.value })
  const digits = (key: 'pages' | 'year') => (event: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [key]: event.target.value.replace(/\D/g, '').slice(0, key === 'year' ? 4 : 5) })
  const title = value.title.trim() || 'Untitled'
  const author = value.author.trim() || 'Unknown'

  return (
    <div className={s.bookForm}>
      <div className={s.coverRow}>
        <div className={s.coverWrap}>
          <BookCover
            title={title}
            author={author}
            covers={coversOf({ covers: value.covers, coverPick: value.coverPick })}
            width={96}
            size="small"
          />
          <button type="button" className={s.changeCover} aria-expanded={changing} onClick={toggleCovers}>
            {changing ? 'Done' : 'Change cover'}
          </button>
        </div>
        <div className={s.bookFields}>
          <label className={s.field}>
            <span>Title</span>
            <input ref={first} value={value.title} onChange={set('title')} autoComplete="off" enterKeyHint="next" />
          </label>
          <label className={s.field}>
            <span>Author</span>
            <input value={value.author} onChange={set('author')} autoComplete="off" enterKeyHint="next" />
          </label>
        </div>
      </div>
      {changing && (
        <fieldset className={s.covers}>
          <legend className={s.coversLabel}>Cover</legend>
          <CoverStrip
            title={title}
            author={author}
            covers={covers}
            pick={value.coverPick ?? (value.covers.length ? 0 : DRAWN)}
            onPick={(coverPick) => onChange({ ...value, covers, coverPick })}
          />
          {covers.length === 0 && (
            <p className={own.note}>
              {found.status === 'searching'
                ? 'Looking for covers…'
                : found.status === 'unreachable'
                  ? 'The catalogues could not be reached. Try again when you are online.'
                  : 'No cover was found for this one, so Flyleaf drew its own.'}
            </p>
          )}
          <div className={own.hunt}>
            <label className={own.hide} htmlFor="lab-cover-hunt">
              Words to search for
            </label>
            <input
              id="lab-cover-hunt"
              className={own.field}
              type="search"
              value={words}
              placeholder="Title, or title and author"
              onChange={(event) => setWords(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  look()
                }
              }}
            />
            <button
              type="button"
              className={own.go}
              onClick={look}
              disabled={found.status === 'searching' || words.trim().length < 2}
            >
              {found.status === 'searching' ? 'Looking…' : 'Look for covers'}
            </button>
          </div>
        </fieldset>
      )}
      <div className={s.pair}>
        <label className={s.field}>
          <span>Pages</span>
          <input inputMode="numeric" value={value.pages} onChange={digits('pages')} placeholder="—" />
        </label>
        <label className={s.field}>
          <span>Year</span>
          <input inputMode="numeric" value={value.year} onChange={digits('year')} placeholder="—" />
        </label>
      </div>
      <div className={s.field}>
        <span>How you’re reading it</span>
        <FormatRow value={value.formats} onChange={(formats) => onChange({ ...value, formats })} />
      </div>
      <div className={s.pair}>
        <label className={s.field}>
          <span>Started</span>
          <input type="date" max={todayISO()} value={value.startedOn} onChange={set('startedOn')} />
        </label>
        {finished && (
          <label className={s.field}>
            <span>Finished</span>
            <input
              type="date"
              min={value.startedOn || undefined}
              max={todayISO()}
              value={value.finishedOn}
              onChange={set('finishedOn')}
            />
          </label>
        )}
      </div>
    </div>
  )
}
