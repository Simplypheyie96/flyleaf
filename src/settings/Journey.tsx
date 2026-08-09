import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Row } from './Group'
import db from '../data/db'
import { download, exportJourney, importJourney, lastExport, markExported } from '../data/backup'
import Face, { FacePicker } from '../components/Face'
import { getFace, getHandle, setFace, setHandle } from '../data/reader'
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

/* The same twelve as the welcome, in the same order, so a reader changing
   their mind is looking at the row they already saw rather than a new set. The
   chosen one rides on the row's own line as its value; the choosing sits under
   it, because twelve discs are not a value and cannot pretend to be one.

   And the twelve fold away. Everything else on this page is one line high, and
   this one thing is four rows of faces — so a settled reader scrolls past a
   picker they will use once to reach the rows they came for. Folding the whole
   "You" group would have taken the name and the theme down with it, which cost
   nothing to leave out; the discs are the only part with any height.

   Shut by default once a face is chosen, open while it is not: a reader who
   has never picked one should meet the choice, not a closed drawer. After
   that, the row opens the way it was last left. */
const FACE_OPEN = 'flyleaf:face-picker-open'

function openAtFirst(face: string) {
  /* Private browsing throws on read as well as write, and a reader who cannot
     be remembered should still get a working row. */
  try {
    const kept = localStorage.getItem(FACE_OPEN)
    if (kept) return kept === '1'
  } catch {
    /* Fall through to the sensible default. */
  }
  return !face
}

function FaceCard() {
  const [face, setPicked] = useState(getFace)
  const [open, setOpen] = useState(() => openAtFirst(getFace()))

  function pick(seed: string) {
    setPicked(seed)
    setFace(seed)
  }

  function fold() {
    const next = !open
    setOpen(next)
    try {
      localStorage.setItem(FACE_OPEN, next ? '1' : '0')
    } catch {
      /* Nothing to do. The fold still works for this visit. */
    }
  }

  return (
    <Row
      title="Your face"
      control={face ? <Face seed={face} size={28} /> : <span className={styles.none}>None</span>}
      open={open}
      onFold={fold}
    >
      <FacePicker value={face} onPick={pick} label="Pick a face" />
    </Row>
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
      /* The reader went and found this file themselves, so it outranks
         anything this device remembers deleting — see `Restoring` in
         data/backup.ts. A sync never gets this. */
      const back = await importJourney(file, { exhume: true })
      if (back.handle && !getHandle()) setHandle(back.handle)

      /* Somebody else's file, so the count alone would overstate what arrived
         — a reader who brought 40 books across should not have to discover on
         their own that the recordings stayed behind. */
      if (back.adopted) {
        const came = `${back.books} ${back.books === 1 ? 'book' : 'books'} and ${back.keeps} ${
          back.keeps === 1 ? 'memory' : 'memories'
        } came across.`
        setNote({
          tone: 'good',
          text:
            back.adopted === 'first'
              ? `${came} People, places and plot threads came with them; voice notes did not.`
              : `${came} Only a Flyleaf file carries recordings and pictures.`,
        })
        return
      }

      /* Books counted out loud as well as memories. A file can be all shelf
         and no thread — books carried over from another app, before a word has
         been kept from any of them — and the old sentence read that as
         "everything in that file was already here" while four books landed on
         the shelf behind it. */
      const arrived = [
        back.books ? `${back.books} ${back.books === 1 ? 'book' : 'books'}` : '',
        back.keeps ? `${back.keeps} ${back.keeps === 1 ? 'memory' : 'memories'}` : '',
      ].filter(Boolean)
      const added = arrived.length
        ? `${arrived.join(' and ')} came back`
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

      {/* Beside "Save a copy", because the two are the same sentence said to
          two different audiences: one file for a machine to read back, one
          document for the reader to hold. A row that goes somewhere rather
          than one that does something — the journal is a page you land on, so
          it takes the chevron the small-print rows take and not the tray. */}
      <Link to="/journal" className={styles.link}>
        Make a printed journal
        <span className={styles.linkHint} aria-hidden="true">
          ›
        </span>
      </Link>

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
export { NameCard, FaceCard, BackupCard }
