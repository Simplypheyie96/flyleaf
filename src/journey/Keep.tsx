/* One keep — a card, and only a card.

   It used to draw its own thread, its own knot and a lane of coloured ribbons
   out into the margin, which is what the sides of the journey were: three
   decorations with no structural job, running past every card in every layout
   whether or not that layout meant anything by them. Ornament that does not
   organise anything is noise, so it is gone. Where the strands genuinely are
   the structure — the Weave — that layout draws them itself, around the cards
   rather than beside them.

   What is left is the thing the reader came for, set once and used by all
   three layouts. Two sizes on it: the mono micro-label for the facts about the
   keep, and the reading size for the keep itself. The face changes with the
   kind, and only with the kind — the book's own words are serif, the reader's
   own handwriting is the hand, and everything that is interface is sans. */

import { useEffect, useState } from 'react'
import PaperSurface from '../components/PaperSurface'
import VoiceOrb from '../components/VoiceOrb'
import {
  HighlightIcon,
  ImageIcon,
  MoreIcon,
  NoteIcon,
  QuoteIcon,
  StrandIcon,
  VoiceIcon,
} from '../components/TabIcons'
import type { PaperTone } from '../components/PaperSurface'
import type { Entry, EntryType, Strand } from '../data/db'
import { KEEP, keptLabel } from './lexicon'
import { strandColor } from './order'
import styles from './Keep.module.css'

export const KIND: Record<
  EntryType,
  { label: string; tone: PaperTone; Icon: typeof QuoteIcon }
> = {
  quote: { label: 'Quote', tone: 'quote', Icon: QuoteIcon },
  note: { label: 'Note', tone: 'note', Icon: NoteIcon },
  voice: { label: 'Voice note', tone: 'voice', Icon: VoiceIcon },
  image: { label: 'Picture', tone: 'image', Icon: ImageIcon },
  highlight: { label: 'Highlight', tone: 'highlight', Icon: HighlightIcon },
  strand: { label: 'Strand', tone: 'strand', Icon: StrandIcon },
}

/** A blob, as something an `img` or an `audio` can be pointed at. The handle is
    released on the way out; a journey scrolled end to end would otherwise leak
    one per picture it passed. */
function useObjectUrl(blob: Blob | undefined) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) return
    const made = URL.createObjectURL(blob)
    setUrl(made)
    return () => {
      URL.revokeObjectURL(made)
      setUrl(undefined)
    }
  }, [blob])
  return url
}

function KeptImage({ keep }: { keep: Entry }) {
  const url = useObjectUrl(keep.media)
  return (
    <figure className={styles.mount}>
      {url ? (
        /* The caption is the alt text when there is one. A reader writing
           "the page I kept turning back to" has described their own picture
           better than any generated string would. */
        <img className={styles.print} src={url} alt={keep.text ?? 'A picture kept from this book'} />
      ) : (
        <p className={styles.gone}>This picture isn’t on this device.</p>
      )}
      {keep.text && <figcaption className={styles.caption}>{keep.text}</figcaption>}
    </figure>
  )
}

function Body({ keep }: { keep: Entry }) {
  switch (keep.type) {
    case 'voice':
      return (
        <>
          <VoiceOrb
            media={keep.media}
            duration={keep.duration}
            seed={keep.id}
            label={`the voice note kept ${keptLabel(keep.keptOn)}`}
          />
          {keep.text && <p className={styles.caption}>{keep.text}</p>}
        </>
      )
    case 'image':
      return <KeptImage keep={keep} />
    case 'highlight':
      /* The stripe goes on the inline span, not the paragraph: a marker
         follows the words to the end of each line and stops, and a background
         on the block would run the full width of the card and read as a
         coloured panel. */
      return (
        <p className={styles.marked}>
          <span>{keep.text}</span>
        </p>
      )
    case 'note':
      /* The one place the hand survives. A note is the reader talking to
         themselves, and it is worth one typeface to say so — but only here,
         and never on anything the app itself says. */
      return <p className={styles.hand}>{keep.text}</p>
    case 'strand':
      return keep.text ? <p className={styles.reflection}>{keep.text}</p> : null
    default:
      return <p className={styles.said}>{keep.text}</p>
  }
}

interface KeepProps {
  keep: Entry
  strands: Strand[]
  onMenu: (keep: Entry) => void
  onMotif: (motif: string) => void
  /** Drop the kind label — the Deck already says what kind everything in it
      is, and repeating it on every card is a column of the same word. */
  unlabelled?: boolean
}

function Keep({ keep, strands, onMenu, onMotif, unlabelled }: KeepProps) {
  const kind = KIND[keep.type]
  const strand =
    keep.strandId !== undefined ? strands.find((s) => s.id === keep.strandId) : undefined

  const where = [keep.chapter, keep.page !== undefined ? `p. ${keep.page}` : null]
    .filter(Boolean)
    .join(' · ')

  /* What the strand keep says it is doing, said plainly. A reader meeting the
     word for the first time should be able to read it off this line. */
  const opening = keep.strandMark === 'open'
  const closing = keep.strandMark === 'close'

  return (
    <PaperSurface as="article" tone={kind.tone} className={styles.keep} data-type={keep.type}>
      <header className={styles.head}>
        {!unlabelled && (
          <span className={styles.kind}>
            <kind.Icon size={14} />
            {opening ? 'Strand opened' : closing ? 'Strand tied off' : kind.label}
          </span>
        )}
        <span className={styles.when}>{keptLabel(keep.keptOn)}</span>
        <button
          type="button"
          className={styles.more}
          onClick={() => onMenu(keep)}
          aria-label={`What to do with this ${KEEP[keep.type].one}`}
        >
          <MoreIcon size={18} />
        </button>
      </header>

      {strand && (
        <p
          className={styles.strandName}
          style={{ '--strand': strandColor(strand.hue) } as React.CSSProperties}
        >
          <span className={styles.swatch} aria-hidden="true" />
          {strand.name}
        </p>
      )}

      <Body keep={keep} />

      {(where || keep.motifs?.length) && (
        <footer className={styles.foot}>
          {where && <span className={styles.where}>{where}</span>}
          {keep.motifs?.map((motif) => (
            <button
              key={motif}
              type="button"
              className={styles.motif}
              onClick={() => onMotif(motif)}
            >
              {motif}
            </button>
          ))}
        </footer>
      )}
    </PaperSurface>
  )
}

export default Keep
