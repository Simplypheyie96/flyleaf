/* /lab/keep — three ways to keep something, plus Add book and Edit book.
   Same fixture book, same drafts and same fixes underneath all three; only
   the shape of the sheet differs. `r` replays. Not imported by the app. */

import { useEffect, useState } from 'react'
import BookCover from '../../components/BookCover'
import PaperSurface from '../../components/PaperSurface'
import type { EntryType } from '../../data/db'
import { KIND } from '../../journey/kinds'
import Picker from '../directions/Picker'
import AddBook from './AddBook'
import EditBook from './EditBook'
import KeepA from './KeepA'
import KeepB from './KeepB'
import KeepC from './KeepC'
import { whereLine, type Draft } from './parts'
import s from './keep.module.css'

export interface KeepProps {
  open: boolean
  onClose: () => void
  onKept: (kind: EntryType, draft: Draft) => void
  book: string
}

const BOOK = { title: 'Things Fall Apart', author: 'Chinua Achebe' }

const TABS = ['A · Write', 'B · Page', 'C · Card', 'Add', 'Edit']
const ABOUT = [
  'Opens on the page with the caret in it. Kinds are a row of chips above; where in the book folds into one line below.',
  'Asks what you are keeping first, as eight tiles. Then one tall page for that kind with where in the book always showing.',
  'You write straight onto the card it will become. Kinds are tabs on its top edge; page, chapter and day are stamps on the bottom.',
  'Search keeps results up while it looks again. Books you already have say so. Back keeps everything you typed.',
  'The same form as Add, now with how you are reading it, the day you started and the day you finished.',
]
const OPEN = ['Keep something', 'Keep something', 'Keep something', 'Add a book', 'Edit this book']

export default function KeepLab() {
  const [at, setAt] = useState(() => Math.min(4, Math.max(0, Number(new URLSearchParams(location.search).get('v') ?? 0))))
  const [open, setOpen] = useState(false)
  const [nonce, setNonce] = useState(0)
  const [kept, setKept] = useState<{ kind: EntryType; draft: Draft; at: number }[]>([])
  const [toast, setToast] = useState('')

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const t = event.target as HTMLElement | null
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'r' || event.key === 'R') setNonce((n) => n + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 2400)
    return () => window.clearTimeout(t)
  }, [toast])

  const close = () => setOpen(false)
  const onKept = (kind: EntryType, draft: Draft) => {
    setKept((list) => [{ kind, draft, at: Date.now() }, ...list])
    setOpen(false)
    setToast(`Kept ${KIND[kind].one === 'vocabulary' ? 'a word' : `a ${KIND[kind].one}`}`)
  }
  const keepProps = { open, onClose: close, onKept, book: BOOK.title }

  return (
    <main className={s.lab}>
      <Picker
        names={TABS}
        at={at}
        onPick={(i) => {
          setOpen(false)
          setAt(i)
        }}
        onReplay={() => setNonce((n) => n + 1)}
      />
      <div key={`${at}-${nonce}`} className={s.stage}>
        <header className={s.bookHead}>
          <BookCover title={BOOK.title} author={BOOK.author} width={72} size="small" />
          <div>
            <h1>{BOOK.title}</h1>
            <p>{BOOK.author}</p>
          </div>
        </header>
        <p className={s.about}>{ABOUT[at]}</p>
        <button type="button" className={s.keep} style={{ marginInline: 0, alignSelf: 'flex-start' }} onClick={() => setOpen(true)}>
          {OPEN[at]}
        </button>
        {at < 3 && kept.length > 0 && (
          <ul className={s.kept}>
            {kept.map(({ kind, draft, at: when }) => (
              <PaperSurface key={when} as="li" tone={KIND[kind].tone} className={s.keptCard}>
                <span className={s.keptMeta}>
                  {KIND[kind].label.replace(/s$/, '')} · {whereLine(draft.where)}
                </span>
                {draft.name && <span className={s.keptName}>{draft.name}</span>}
                {draft.media && <span className={s.keptMeta}>{draft.media.label}</span>}
                {draft.text && (
                  <p className={s.keptText} data-kind={kind}>
                    {draft.text}
                  </p>
                )}
              </PaperSurface>
            ))}
          </ul>
        )}
        {at === 0 && <KeepA {...keepProps} />}
        {at === 1 && <KeepB {...keepProps} />}
        {at === 2 && <KeepC {...keepProps} />}
        {at === 3 && <AddBook open={open} onClose={close} />}
        {at === 4 && (
          <EditBook
            open={open}
            onClose={close}
            onSaved={(title) => {
              setOpen(false)
              setToast(`Would save ${title}. The lab doesn’t write.`)
            }}
          />
        )}
      </div>
      {toast && (
        <p className={s.toast} role="status">
          {toast}
        </p>
      )}
    </main>
  )
}
