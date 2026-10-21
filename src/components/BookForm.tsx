/* ONE FORM FOR A BOOK, used by Add (after a search, or typed in by hand) and
   by Edit. They were two copies of the same markup that had drifted: Edit had
   no format and no started day, Add could not change the cover of a book
   typed in by hand. Now they are one thing, from the keep lab (2026-10-18).

   Change cover is always there, not only when there are jackets to swap
   between: a book with none is the one that most needs finding. The words it
   searches on are the reader's to fix, and a title + author that finds nothing
   is asked again on the title alone — imported rows are where the author is
   most often wrong, and a reader looking at an empty strip cannot know that. */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import BookCover from './BookCover'
import CoverStrip from './CoverChoice'
import FormatRow from './FormatRow'
import CalendarPicker from './date/CalendarPicker'
import { CalendarIcon, CaretIcon } from './TabIcons'
import { DRAWN, cleanCovers, coversOf } from '../books/covers'
import { useBookSearch } from '../books/useBookSearch'
import { seedFrom } from '../books/seed'
import { longDate, todayISO } from './date/dates'
import type { BookFormat } from '../data/db'
import s from './BookSheet.module.css'

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

/* Physical to start with because it is the commonest answer, and today
   because almost every book is added the day it is started. */
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

/** What still stands between this draft and the shelf, said as the next step. */
export function bookGap(b: BookDraft) {
  if (!b.title.trim() && !b.author.trim()) return 'A title and an author, and it can go on the shelf'
  if (!b.title.trim()) return 'Add the title'
  if (!b.author.trim()) return 'Add who wrote it'
  return undefined
}

/** Past about eight the reader is no longer choosing, they are searching. */
const MOST = 8

type Day = 'startedOn' | 'finishedOn'

export default function BookForm({
  value,
  onChange,
  finished = false,
  transition,
}: {
  value: BookDraft
  onChange: (b: BookDraft) => void
  /** Edit shows the finished day; Add does not, a book being added is being read. */
  finished?: boolean
  /** The shelf's view-transition name for this book, so the cover here and the
      book that lands there are one object. Add only. */
  transition?: string
}) {
  const [changing, setChanging] = useState(false)
  const [words, setWords] = useState('')
  const [hunt, setHunt] = useState('')
  const [picking, setPicking] = useState<Day | null>(null)
  const picker = useRef<HTMLDivElement>(null)
  const found = useBookSearch(hunt)

  /* The draft's own jackets first, so a stored pick still points at the
     jacket it was chosen for however many the search adds behind it. */
  const covers = useMemo(() => {
    const all = cleanCovers(value.covers)
    if (found.status === 'done')
      for (const r of found.results)
        for (const url of cleanCovers(r.covers)) if (all.length < MOST && !all.includes(url)) all.push(url)
    return all
  }, [value.covers, found])

  useEffect(() => {
    if (found.status !== 'done' || found.results.length > 0) return
    const bare = value.title.trim()
    if (bare.length < 2 || hunt.trim() === bare) return
    setWords(bare)
    setHunt(bare)
  }, [found, hunt, value.title])

  /* Follow the calendar down when it unfolds, nudging the sheet's body by
     hand: scrollIntoView walks every scroller and once moved the page. */
  useEffect(() => {
    const panel = picker.current
    const box = panel?.closest('[data-scroller]')
    if (!panel || !box) return
    const over = panel.getBoundingClientRect().bottom - box.getBoundingClientRect().bottom
    if (over > 0) box.scrollTo({ top: box.scrollTop + over + 12, behavior: 'smooth' })
  }, [picking])

  /* A trailing space when the words have not changed, because the search
     keys on the string and asking twice is what a reader does after a miss. */
  const look = () => setHunt((was) => (was === words.trim() ? `${words.trim()} ` : words.trim()))

  function toggleCovers() {
    if (!changing) {
      const q = `${value.title} ${value.author}`.trim()
      setWords(q)
      if (!value.covers.length) setHunt(q)
    }
    setChanging(!changing)
  }

  const set = (key: 'title' | 'author') => (event: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [key]: event.target.value })
  const digits = (key: 'pages' | 'year') => (event: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [key]: event.target.value.replace(/\D/g, '').slice(0, key === 'year' ? 4 : 5) })
  const title = value.title.trim() || 'Untitled'
  const author = value.author.trim() || 'Unknown'

  function dayRow(key: Day, label: string, empty: string) {
    const iso = value[key]
    const open = picking === key
    return (
      <div className={s.field}>
        <span id={`${key}-label`}>{label}</span>
        <button
          type="button"
          className={s.dateBox}
          aria-expanded={open}
          aria-labelledby={`${key}-label ${key}-value`}
          onClick={() => setPicking(open ? null : key)}
        >
          <CalendarIcon size={20} />
          <span className={s.dateValue} id={`${key}-value`} data-empty={iso ? undefined : ''}>
            {iso ? longDate(iso) : empty}
          </span>
          <CaretIcon size={18} className={s.dateCaret} />
        </button>
        {open && (
          <div ref={picker} className={s.datePicker}>
            <CalendarPicker
              value={iso || todayISO()}
              /* Picking is the end of the errand, so it closes the calendar. */
              onChange={(day) => {
                onChange({ ...value, [key]: day })
                setPicking(null)
              }}
              max={todayISO()}
              seed={seedFrom(title, author)}
            />
          </div>
        )}
        {key === 'finishedOn' && iso && !open && (
          <button type="button" className={s.link} onClick={() => onChange({ ...value, finishedOn: '' })}>
            Not finished yet
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={s.form}>
      <div className={s.coverRow}>
        <div className={s.coverWrap}>
          <span style={transition ? ({ viewTransitionName: transition } as CSSProperties) : undefined}>
            <BookCover
              title={title}
              author={author}
              covers={coversOf({ covers: value.covers, coverPick: value.coverPick })}
              width={96}
              size="small"
            />
          </span>
          <button type="button" className={s.changeCover} aria-expanded={changing} onClick={toggleCovers}>
            {changing ? 'Done' : 'Change cover'}
          </button>
        </div>
        <div className={s.fields}>
          <label className={s.field}>
            <span>Title</span>
            <input value={value.title} onChange={set('title')} autoComplete="off" enterKeyHint="next" />
          </label>
          <label className={s.field}>
            <span>Author</span>
            <input value={value.author} onChange={set('author')} autoComplete="off" enterKeyHint="next" />
          </label>
        </div>
      </div>

      {changing && (
        <fieldset className={s.covers}>
          <legend>Cover</legend>
          <CoverStrip
            title={title}
            author={author}
            covers={covers}
            pick={value.coverPick ?? (value.covers.length ? 0 : DRAWN)}
            onPick={(coverPick) => onChange({ ...value, covers, coverPick })}
          />
          {covers.length === 0 && (
            <p className={s.note}>
              {found.status === 'searching'
                ? 'Looking for covers…'
                : found.status === 'unreachable'
                  ? 'The catalogues could not be reached. Try again when you are online.'
                  : 'No cover was found for this one, so Flyleaf drew its own.'}
            </p>
          )}
          <div className={s.hunt}>
            <label className={s.hide} htmlFor="cover-hunt">
              Words to search for
            </label>
            <input
              id="cover-hunt"
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
              className={s.go}
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

      <fieldset className={s.field}>
        <legend>How you’re reading it</legend>
        <FormatRow value={value.formats} onChange={(formats) => onChange({ ...value, formats })} />
      </fieldset>

      {dayRow('startedOn', 'Started', 'Not set')}
      {finished && dayRow('finishedOn', 'Finished', 'Not finished yet')}
    </div>
  )
}
