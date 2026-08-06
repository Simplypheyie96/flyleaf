import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Row } from './Group'
import db from '../data/db'
import { download, exportJourney, importJourney, lastExport, markExported } from '../data/backup'
import { getHandle, setHandle } from '../data/reader'
import styles from './settings.module.css'

/* What the reader is called, and where their journey actually is.

   The same subject seen twice — the name is the only thing Flyleaf knows about
   a reader, and the backup rows are the honest account of what local-first
   means: nothing of theirs has left this device, and nothing will unless they
   carry it themselves.

   Said in rows, not paragraphs. "Last saved: never" on one line does the work
   the three-sentence warning used to do, and does it where the eye already is
   — beside the two rows that fix it. */

/* The mark at the end of an action row. Every other row in this card answers
   its label on the right — a count, a date — and two rows ending in nothing
   would leave the right-hand column half drawn. Out for the same reason the
   chevron is out on a link row: it says which way the file is going. */
function Tray({ out }: { out?: boolean }) {
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
      {out ? <path d="M12 3v11" /> : <path d="M12 14V3" />}
      {out ? <path d="M8 10.5 12 14.5l4-4" /> : <path d="M8 6.5 12 3l4 3.5" />}
      <path d="M4 16v3.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V16" />
    </svg>
  )
}

function when(at: number) {
  const days = Math.floor((Date.now() - at) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function NameCard() {
  const [name, setName] = useState(getHandle)

  /* The field sits on the row's own line, right-aligned, the way a value does.
     A full-width box under a label is a form; this is one word about the
     reader, and it belongs beside the word that asks for it. */
  return (
    <Row
      title="Your name"
      control={
        <input
          type="text"
          className={styles.fieldInline}
          value={name}
          aria-label="Your name"
          placeholder="Reader"
          maxLength={32}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setHandle(name)}
        />
      }
    />
  )
}

type Note = { tone: 'good' | 'bad'; text: string } | null

function BackupCard() {
  const counts = useLiveQuery(
    async () => ({ books: await db.books.count(), keeps: await db.entries.count() }),
    [],
  )
  const [exported, setExported] = useState(lastExport)
  const [busy, setBusy] = useState<'out' | 'in' | null>(null)
  const [note, setNote] = useState<Note>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  /* `markExported` fires this so the date updates without a reload — the same
     event the handle uses, since both are one-line facts about the reader kept
     outside the database. */
  useEffect(() => {
    const sync = () => setExported(lastExport())
    window.addEventListener('flyleaf-reader', sync)
    return () => window.removeEventListener('flyleaf-reader', sync)
  }, [])

  async function save() {
    setBusy('out')
    setNote(null)
    try {
      const { blob, name, size } = await exportJourney(getHandle())
      download(blob, name)
      markExported()
      setNote({
        tone: 'good',
        text: `${size.books} ${size.books === 1 ? 'book' : 'books'} and ${size.keeps} ${
          size.keeps === 1 ? 'memory' : 'memories'
        } saved to your downloads.`,
      })
    } catch {
      setNote({ tone: 'bad', text: 'That did not save. Try again in a moment.' })
    } finally {
      setBusy(null)
    }
  }

  async function restore(file: File) {
    setBusy('in')
    setNote(null)
    try {
      const back = await importJourney(file)
      if (back.handle && !getHandle()) setHandle(back.handle)
      const added = back.keeps
        ? `${back.keeps} ${back.keeps === 1 ? 'memory' : 'memories'} came back`
        : 'Everything in that file was already here'
      const same = back.skipped ? ` (${back.skipped} already on this device).` : '.'
      setNote({ tone: 'good', text: `${added}${same}` })
    } catch (error) {
      setNote({ tone: 'bad', text: error instanceof Error ? error.message : 'That file would not open.' })
    } finally {
      setBusy(null)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const kept = counts ? counts.books + counts.keeps > 0 : false

  return (
    <>
      <Row
        /* Not "Your journey" again — that is the caption over this card, and a
           row repeating its own group's name says nothing twice. This says the
           thing the caption cannot: where it all actually is. */
        title="Kept on this device"
        control={
          counts ? (
            <span className={styles.value}>
              {counts.books} {counts.books === 1 ? 'book' : 'books'} · {counts.keeps}{' '}
              {counts.keeps === 1 ? 'memory' : 'memories'}
            </span>
          ) : undefined
        }
      />

      {/* The uncomfortable fact as a value rather than a warning paragraph.
          "Never", in the reader's own ink rather than the soft grey the other
          values use, is the whole of what the three sentences here used to
          say — and it earns the emphasis only while there is something to
          lose and no copy of it. */}
      <Row
        title="Last saved"
        control={
          <span className={styles.value} data-cold={!exported && kept ? '' : undefined}>
            {exported ? when(exported) : 'Never'}
          </span>
        }
      />

      <button type="button" className={styles.action} disabled={busy !== null || !kept} onClick={save}>
        {busy === 'out' ? 'Saving…' : 'Save a copy'}
        <span className={styles.mark}>
          <Tray out />
        </span>
      </button>

      <button
        type="button"
        className={styles.action}
        disabled={busy !== null}
        onClick={() => fileInput.current?.click()}
      >
        {busy === 'in' ? 'Reading…' : 'Restore from a file'}
        <span className={styles.mark}>
          <Tray />
        </span>
      </button>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className={styles.hiddenInput}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void restore(file)
        }}
      />

      {note && (
        <Row>
          <p className={styles.note} data-tone={note.tone} role="status">
            {note.text}
          </p>
        </Row>
      )}
    </>
  )
}

/* Exported apart rather than as one block: the theme row sits between them on
   the page, because a reader's own name belongs at the top and the theme is
   the switch they come back for. They are still the same subject — what
   Flyleaf knows about a reader, and what that costs them — which is why the
   two live in one file. */
export { NameCard, BackupCard }
