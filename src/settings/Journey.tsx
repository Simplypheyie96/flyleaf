import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import LeafButton from '../components/LeafButton'
import Fold from './Fold'
import db from '../data/db'
import { download, exportJourney, importJourney, lastExport, markExported } from '../data/backup'
import { getHandle, setHandle } from '../data/reader'
import styles from './settings.module.css'

/* Two cards: what the reader is called, and where their journey actually is.

   They sit together because they are the same subject seen twice — the name
   is the only thing Flyleaf knows about a reader, and the journey card is the
   honest account of what that means: nothing of theirs has left this device,
   and nothing will unless they carry it themselves.

   The status line is deliberately not a reassuring tick. Local-first is a
   promise and a risk in the same sentence, and a reader who has never
   exported should be told so plainly the one time they come looking. */

function when(at: number) {
  const days = Math.floor((Date.now() - at) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

function NameCard() {
  const [name, setName] = useState(getHandle)

  /* First on the page, and open on arrival. It is the one thing Flyleaf knows
     about a reader, it is the only field here, and a new reader arriving from
     onboarding to change the name they just picked should find it already
     waiting rather than have to guess which line it is behind. */
  return (
    <Fold title="Your name" meta={name || 'Reader'} start>
      <span className={styles.sectionHint}>
        What Flyleaf calls you, and the name written on a journey you export. It
        stays on this device.
      </span>
      <input
        type="text"
        className={styles.field}
        value={name}
        aria-label="Your name"
        placeholder="Reader"
        maxLength={32}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => setHandle(name)}
      />
    </Fold>
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

  /* `markExported` fires this so the date under the button updates without a
     reload — the same event the handle uses, since both are one-line facts
     about the reader kept outside the database. */
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
    <Fold
      title="Your journey"
      /* The count on the closed row, because it is the answer to the question
         that brings anyone to this section: how much is there to lose. */
      meta={
        counts
          ? `${counts.books} ${counts.books === 1 ? 'book' : 'books'} · ${counts.keeps} ${
              counts.keeps === 1 ? 'memory' : 'memories'
            }`
          : undefined
      }
    >
      <span className={styles.sectionHint}>
        Everything you have kept is held on this device only. Nothing is on our
        servers.
      </span>

      {/* The one uncomfortable sentence, said once and not repeated: clearing
          this browser's storage takes the journey with it. */}
      <p className={styles.warn} data-cold={!exported && kept ? '' : undefined}>
        {exported
          ? `Last copy saved ${when(exported)}. Anything kept since then is only here.`
          : kept
            ? 'You have never saved a copy. If this browser is cleared, these memories go with it.'
            : 'Once you start keeping things, save a copy here so they survive this browser.'}
      </p>

      <div className={styles.row}>
        <LeafButton onClick={save} disabled={busy !== null || !kept}>
          {busy === 'out' ? 'Saving…' : 'Save a copy'}
        </LeafButton>
        <button
          type="button"
          className={styles.quiet}
          disabled={busy !== null}
          onClick={() => fileInput.current?.click()}
        >
          {busy === 'in' ? 'Reading…' : 'Restore from a file'}
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
      </div>

      {note && (
        <p className={styles.note} data-tone={note.tone} role="status">
          {note.text}
        </p>
      )}

      <p className={styles.fine}>
        A saved copy is one file holding every book, every word, every recording
        and picture. Open it on any device — phone, tablet, someone else's
        laptop — and the journey comes back. It is a snapshot, so save a fresh
        one now and then.
      </p>
    </Fold>
  )
}

/* Exported apart rather than as one block: the theme row sits between them on
   the page, because a reader's own name belongs at the top and the theme is
   the switch they come back for. They are still the same subject — what
   Flyleaf knows about a reader, and what that costs them — which is why the
   two live in one file. */
export { NameCard, BackupCard }
