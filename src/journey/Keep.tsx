/* One keep, tied on the thread.

   The same markup in all three variations. What changes between the Bound
   Journal, the Scrapbook and the Card Index is entirely CSS hanging off a
   `data-variant` on the section above — which is the only way three layouts
   can stay honestly the same content. A variation that needed its own JSX
   would drift from the other two within a week, and the reader would be
   choosing between three half-finished screens instead of three views of one
   finished one. */

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
import { strandColor, type Row } from './order'
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

/* The thread — one stitched segment, drawn beside the keep it ties on.

   Segments rather than one line down the section, for two reasons: each
   stretches its own wander differently, so no two lengths of thread are
   identical the way a repeating border would be; and a short element is a
   subject a scroll-driven timeline can actually measure, which is what lets
   the stitch draw itself as the reader arrives at it.

   `preserveAspectRatio="none"` lets the 100-unit box stretch to any real
   height, which would normally drag the stroke and the dashes out of shape
   with it — `vector-effect: non-scaling-stroke` keeps a stitch the same
   length on a long card and a short one. */
function Thread({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 8 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M4 0 C 3.2 12, 4.8 24, 4 36 C 3.3 48, 4.7 60, 4 72 C 3.4 84, 4.6 92, 4 100" />
    </svg>
  )
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
      <div className={styles.print}>
        {url ? (
          /* The caption is the alt text when there is one. A reader writing
             "the page I kept turning back to" has described their own picture
             better than any generated string would. */
          <img src={url} alt={keep.text ?? 'A picture kept from this book'} />
        ) : (
          <p className={styles.absent}>This picture isn’t on this device.</p>
        )}
        {/* Photo corners. Four, because three is a mount that has come loose. */}
        <span className={styles.corner} data-at="tl" aria-hidden="true" />
        <span className={styles.corner} data-at="tr" aria-hidden="true" />
        <span className={styles.corner} data-at="bl" aria-hidden="true" />
        <span className={styles.corner} data-at="br" aria-hidden="true" />
      </div>
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
      return <p className={`${styles.text} ${styles.ruled}`}>{keep.text}</p>
    case 'strand':
      return keep.text ? <p className={styles.reflection}>{keep.text}</p> : null
    default:
      return <p className={styles.text}>{keep.text}</p>
  }
}

interface KeepProps {
  row: Row
  strands: Strand[]
  last: boolean
  onMenu: (keep: Entry) => void
  onMotif: (motif: string) => void
}

function Keep({ row, strands, last, onMenu, onMotif }: KeepProps) {
  const { keep, braid } = row
  const kind = KIND[keep.type]
  const strand = keep.strandId !== undefined ? strands.find((s) => s.id === keep.strandId) : undefined

  /* Alternating, and small. The tilt is what makes a card look laid down
     rather than placed; past a degree or so it stops reading as handmade and
     starts reading as broken. Driven off the row's own timestamp so a card
     never changes its lean because something was kept before it. */
  const lean = keep.createdAt % 2 === 0 ? 0.5 : -0.5

  const where = [keep.chapter, keep.page !== undefined ? `p. ${keep.page}` : null]
    .filter(Boolean)
    .join(' · ')

  /* What the strand keep says it is doing, said plainly. A reader meeting the
     word for the first time should be able to read it off this line. */
  const opening = keep.strandMark === 'open'
  const closing = keep.strandMark === 'close'

  return (
    <article
      className={styles.keep}
      data-type={keep.type}
      data-last={last || undefined}
      data-lanes={braid.length || undefined}
    >
      <Thread className={styles.thread} />
      {/* The knot this keep is tied on by. Over the thread, ringed in the
          page's own colour, so the stitch appears to pass behind it. */}
      <span className={styles.knot} aria-hidden="true" />

      {/* The braid: one coloured ribbon per strand that was live when this was
          kept, each on its own lane out from the spine, knotting where the
          keep is actually tied to it. */}
      {braid.map((pass) => (
        <span
          key={pass.strandId}
          className={styles.ribbon}
          style={{ '--lane': pass.lane, '--strand': strandColor(pass.hue) } as React.CSSProperties}
          data-first={pass.first || undefined}
          data-last={pass.last || undefined}
          data-knot={pass.knot || undefined}
          aria-hidden="true"
        />
      ))}

      {/* Not every card is taped. An identical strip at the identical spot on
          every sheet is the machine tell — the thing that turns a scrapbook
          back into a feed with decoration on it. */}
      <PaperSurface
        tone={kind.tone}
        rotate={lean}
        taped={keep.createdAt % 3 === 0}
        className={styles.card}
      >
        <header className={styles.head}>
          <span className={styles.chip} aria-hidden="true">
            <kind.Icon size={15} />
          </span>
          <span className={styles.kind}>
            {opening ? 'Strand opened' : closing ? 'Strand tied off' : kind.label}
          </span>
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
            <StrandIcon size={13} />
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
    </article>
  )
}

export default Keep
