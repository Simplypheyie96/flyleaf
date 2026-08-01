/* The colophon — one reading, set as a keepsake.

   The other share output is the fair copy: paragraphs, a draft, something you
   edit and post. This is its opposite. It is the whole book condensed to a
   card small enough to look at in one glance — the dates, the way it was read,
   what was kept, who the reader followed, what they wondered about. A printer's
   colophon at the end of a book, which is exactly the thing it is imitating.

   Every line comes from `colophon()`, which is assembled from dates, counts,
   formats and the reader's own words. Flyleaf does not know what happens in the
   story and this card must never sound as though it does.

   No model, no network, no key — the same promise as everywhere else. The card
   is drawn here in the app rather than rendered to an image, and the share
   button sends its plain-text setting, which is the form that survives being
   pasted into a message. */

import { useState } from 'react'
import Sheet from '../components/Sheet'
import LeafButton from '../components/LeafButton'
import PaperSurface from '../components/PaperSurface'
import { CheckIcon, CloseIcon, ShareIcon } from '../components/TabIcons'
import type { Book, Entry } from '../data/db'
import { colophon } from './lexicon'
import styles from './sheet.module.css'
import card from './colophon.module.css'

interface Props {
  open: boolean
  onClose: () => void
  book: Book
  keeps: Entry[]
}

/** The card as text. Terms and details on their own lines rather than run
    together, because a message app will wrap a long line wherever it likes and
    the whole point of the card is that it is set. */
function asText(book: Book, lines: { term: string; detail: string }[]) {
  const set = lines.map(({ term, detail }) => `${term.toUpperCase()}\n${detail}`)
  return [`${book.title}\n${book.author}`, ...set].join('\n\n')
}

function ColophonSheet({ open, onClose, book, keeps }: Props) {
  const [copied, setCopied] = useState(false)
  const lines = colophon(book, keeps)
  const text = asText(book, lines)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      /* Clipboard refused — an insecure origin, or a browser that wants a
         closer gesture. The card is on screen and selectable either way. */
    }
  }

  async function share() {
    try {
      if (navigator.share) await navigator.share({ text, title: book.title })
      else await copy()
    } catch {
      /* Cancelled. */
    }
  }

  return (
    <Sheet open={open} onClose={onClose} label="A summary card" name="colophon">
      <header className={styles.head}>
        <h2 className={styles.title}>A summary card</h2>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">
          <CloseIcon size={20} />
        </button>
      </header>

      <div className={styles.body}>
        <p className={styles.blurb}>
          The whole of this reading, set small. The facts and your own words — nothing
          about the story itself.
        </p>

        {lines.length ? (
          <PaperSurface className={card.card}>
            <p className={card.title}>{book.title}</p>
            <p className={card.author}>{book.author}</p>
            <span className={card.rule} aria-hidden="true" />
            <dl className={card.set}>
              {lines.map(({ term, detail }) => (
                <div className={card.line} key={term}>
                  <dt className={card.term}>{term}</dt>
                  <dd className={card.detail}>{detail}</dd>
                </div>
              ))}
            </dl>
          </PaperSurface>
        ) : (
          <p className={styles.quiet}>
            There is nothing to set yet. Give this book a day it was opened, or keep
            something from it, and the colophon fills itself in.
          </p>
        )}
      </div>

      <footer className={styles.foot}>
        <LeafButton className={styles.submit} onClick={share} disabled={!lines.length}>
          <ShareIcon size={18} />
          Send it somewhere
        </LeafButton>
        <button type="button" className={styles.capture} onClick={copy} disabled={!lines.length}>
          {copied ? <CheckIcon size={18} /> : null}
          {copied ? 'Copied' : 'Copy the text'}
        </button>
      </footer>
    </Sheet>
  )
}

export default ColophonSheet
