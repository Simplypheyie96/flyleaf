import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Row } from './Group'
import db from '../data/db'
import { eraseEverything } from '../data/erase'
import { download, exportJourney, lastExport, markExported } from '../data/backup'
import { getHandle } from '../data/reader'
import styles from './settings.module.css'

/* The way out.

   Everything Flyleaf holds is on the reader's own device, and that is only a
   promise worth making if they can also end it. Before this, ending it meant
   opening browser developer tools — so in practice the app kept your journal
   whether you wanted it to or not.

   THE SHAPE OF THIS ROW IS THE SAFETY. There is no undo behind it and no copy
   on a server, so nothing here relies on a reader reading a warning carefully:

   1. Folded shut. It is the last row on the page and it opens only on purpose.
   2. It says the size of what goes — real counts, not "your data".
   3. It says how old the only copy is, and offers to make a fresh one first.
      A reader who exports here almost certainly should not be erasing at all,
      and giving them that door mid-flight is the point.
   4. The final button will not arm until the word is typed. A confirm dialog
      is dismissed by muscle memory; a word has to be read to be typed.

   Deliberately not a modal. A sheet over the page would hide the counts at the
   moment they matter most — this stays on the page, under the backup rows it
   is the opposite of, where the reader can see what they are about to lose. */

const WORD = 'erase'

function Bin() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 7h16" />
      <path d="M10 4h4" />
      <path d="M6 7v12.5A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5V7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

function ageOf(at: number) {
  const days = Math.floor((Date.now() - at) / 86_400_000)
  if (days <= 0) return 'saved a copy today'
  if (days === 1) return 'saved a copy yesterday'
  if (days < 30) return `last saved a copy ${days} days ago`
  return `last saved a copy on ${new Date(at).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`
}

function Erase() {
  const counts = useLiveQuery(
    async () => ({ books: await db.books.count(), keeps: await db.entries.count() }),
    [],
  )
  const [open, setOpen] = useState(false)
  const [word, setWord] = useState('')
  const [busy, setBusy] = useState<'out' | 'gone' | null>(null)
  const [failed, setFailed] = useState(false)
  const [exported, setExported] = useState(lastExport)
  const field = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const sync = () => setExported(lastExport())
    window.addEventListener('flyleaf-reader', sync)
    return () => window.removeEventListener('flyleaf-reader', sync)
  }, [])

  const books = counts?.books ?? 0
  const keeps = counts?.keeps ?? 0
  const kept = books + keeps > 0

  /* Nothing to erase, nothing to offer. An empty device gets no delete row and
     no chance to type a word at a journal that does not exist. */
  if (counts && !kept) return null

  function fold() {
    const next = !open
    setOpen(next)
    /* Always shut back to a blank field. A typed-out word left sitting in a
       closed row is a loaded button waiting for the next accidental tap. */
    if (!next) {
      setWord('')
      setFailed(false)
    }
  }

  async function saveFirst() {
    setBusy('out')
    setFailed(false)
    try {
      const { blob, name } = await exportJourney(getHandle())
      download(blob, name)
      markExported()
    } catch {
      setFailed(true)
    } finally {
      setBusy(null)
    }
  }

  async function erase() {
    setBusy('gone')
    setFailed(false)
    try {
      await eraseEverything()
      /* A full reload rather than clearing React state by hand. Half of what
         just went is read once at start-up — the theme, the name, whether this
         reader has met Flyleaf — and a live query cannot un-read those. This
         way the reader lands on the genuine first run, which is exactly what
         their device now is. */
      window.location.replace('/')
    } catch {
      setBusy(null)
      setFailed(true)
    }
  }

  const armed = word.trim().toLowerCase() === WORD && busy === null

  return (
    <Row title="Erase everything" open={open} onFold={fold}>
      <div className={styles.eraseBox}>
        <p className={styles.note}>
          {books} {books === 1 ? 'book' : 'books'} and {keeps} {keeps === 1 ? 'memory' : 'memories'}{' '}
          go from this device, along with your name and everything else Flyleaf
          remembers. It is not kept anywhere else, so there is nothing to undo it
          with.
        </p>

        <p className={styles.note} data-tone={exported ? undefined : 'bad'}>
          {exported
            ? `You ${ageOf(exported)}. Anything kept since then is only here.`
            : 'You have never saved a copy. Everything above goes for good.'}
        </p>

        <button type="button" className={styles.action} disabled={busy !== null} onClick={saveFirst}>
          {busy === 'out' ? 'Saving…' : 'Save a copy first'}
        </button>

        {/* The field and the button are one control in two parts, so they are
            labelled as one thing and the button says what the word is for. */}
        <label className={styles.eraseAsk} htmlFor="erase-word">
          Type <b>{WORD}</b> to confirm
        </label>
        <input
          id="erase-word"
          ref={field}
          type="text"
          className={styles.field}
          value={word}
          placeholder={WORD}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          disabled={busy !== null}
          onChange={(e) => setWord(e.target.value)}
        />

        <button
          type="button"
          className={`${styles.action} ${styles.danger}`}
          disabled={!armed}
          onClick={erase}
        >
          {busy === 'gone' ? 'Erasing…' : 'Erase everything on this device'}
          <span className={styles.mark}>
            <Bin />
          </span>
        </button>

        {failed && (
          <p className={styles.note} data-tone="bad" role="status">
            That did not go through, and nothing was removed. Try again in a moment.
          </p>
        )}
      </div>
    </Row>
  )
}

export default Erase
