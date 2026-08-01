/* The fair copy — a clean draft, gathered from what you already wrote.

   Every word of substance in the box below came out of this reader's own
   keeps. Flyleaf supplies the joins and nothing else: no model runs, nothing
   leaves the device, and the draft is identical on a plane and on a train. It
   costs nothing to produce and there is no key behind it, which is the only
   version of this feature worth shipping in an app that promises to stay
   free and private.

   It opens editable on purpose. A gathered draft is a starting point, and a
   reader who cannot change a word of it before posting it somewhere is being
   handed a review with their name on it that isn't theirs. */

import { useEffect, useState } from 'react'
import Sheet from '../components/Sheet'
import LeafButton from '../components/LeafButton'
import { CheckIcon, CloseIcon, ShareIcon } from '../components/TabIcons'
import type { Book, Entry, Strand } from '../data/db'
import { countWords, fairCopy } from './lexicon'
import styles from './sheet.module.css'

interface Props {
  open: boolean
  onClose: () => void
  book: Book
  keeps: Entry[]
  strands: Strand[]
}

function FairCopySheet({ open, onClose, book, keeps, strands }: Props) {
  const [draft, setDraft] = useState('')
  const [omitted, setOmitted] = useState(0)
  const [copied, setCopied] = useState(false)

  /* Regathered every time it opens, never held between openings. A stale
     draft that silently ignores the six things kept since last week is worse
     than no draft at all. */
  useEffect(() => {
    if (!open) return
    const made = fairCopy(book, keeps, strands)
    setDraft(made.text)
    setOmitted(made.omitted)
    setCopied(false)
  }, [open, book, keeps, strands])

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft)
      setCopied(true)
    } catch {
      /* Clipboard refused — an insecure origin or a browser that wants a
         closer gesture. The text is on screen and selectable either way. */
    }
  }

  async function share() {
    try {
      if (navigator.share) await navigator.share({ text: draft, title: book.title })
      else await copy()
    } catch {
      /* Cancelled. */
    }
  }

  return (
    <Sheet open={open} onClose={onClose} label="Fair copy" name="fair-copy">
      <header className={styles.head}>
        <h2 className={styles.title}>Fair copy</h2>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">
          <CloseIcon size={20} />
        </button>
      </header>

      <div className={styles.body}>
        <p className={styles.blurb}>
          Your own words, gathered in the order you wrote them. Change anything you
          like before it goes anywhere.
        </p>

        {draft.trim() ? (
          <label className={styles.label}>
            <span className={styles.labelLine}>
              The draft <span className={styles.optional}>yours to edit</span>
            </span>
            <textarea
              className={`${styles.area} ${styles.tall}`}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                setCopied(false)
              }}
            />
          </label>
        ) : (
          <p className={styles.quiet}>
            There is nothing written down to gather yet. Keep a note or a line from
            the book and this fills itself in.
          </p>
        )}

        <p className={styles.tally}>
          <span>{countWords(draft)} words</span>
          {omitted > 0 && (
            <em>
              {omitted === 1
                ? 'One recording or picture couldn’t be written out.'
                : `${omitted} recordings and pictures couldn’t be written out.`}
            </em>
          )}
        </p>
      </div>

      <footer className={styles.foot}>
        <LeafButton className={styles.submit} onClick={share} disabled={!draft.trim()}>
          <ShareIcon size={18} />
          Send it somewhere
        </LeafButton>
        <button
          type="button"
          className={styles.capture}
          onClick={copy}
          disabled={!draft.trim()}
        >
          {copied ? <CheckIcon size={18} /> : null}
          {copied ? 'Copied' : 'Copy the text'}
        </button>
      </footer>
    </Sheet>
  )
}

export default FairCopySheet
