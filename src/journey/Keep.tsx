/* One keep — a card, and only a card. The thread and the knot beside it belong
   to the journey; this file draws the thing hanging off it.

   The rule the whole screen turns on: **a card is told apart by its structure,
   not by its tint.** A quote is a ruled rail with a hung quotation mark and a
   line of italic serif. A note is a leaf torn off a spiral pad, rules, holes,
   folded corner and all. A voice memo is the one object on the page reversed
   out of the background. A picture is a print in a mount. A character is a
   medallion and a dossier. A place is a plate with the map across the top. A
   plot thread is a pinned case card with a typewritten heading. Turn the
   colour off and you can still name all seven, which is the test each of them
   had to pass.

   Everything that can be done to a keep is done *on* the keep: the date it was
   kept, and the share/edit/delete controls, live in the card's own foot. There
   is no menu — a menu was one more tap between the reader and three verbs. */

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import PaperSurface from '../components/PaperSurface'
import VoiceOrb from '../components/VoiceOrb'
import { EditIcon, ShareIcon, TrashIcon } from '../components/TabIcons'
import type { Book, Entry } from '../data/db'
import { Avatar } from './avatars'
import { KIND, STANCE } from './kinds'
import { keptLabel } from './lexicon'
import { shareKeep, shareable } from './share'
import styles from './Keep.module.css'

/** A blob, as something an `img` can be pointed at. The handle is released on
    the way out; a journey scrolled end to end would otherwise leak one per
    picture it passed. */
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

/* ── Shared furniture ─────────────────────────────────────────────────────
   Two pieces, and only two: the rail across the head of a card and the foot
   under it. Everything else about a card is its own. */

interface RailProps {
  /** Mono micro-caps, leading. The fact the card is about — its kind, and its
      page where it has one. */
  lead: string
  /** A small drawn mark at the trailing edge. */
  mark?: React.ReactNode
}

function Rail({ lead, mark }: RailProps) {
  return (
    <div className={styles.rail}>
      <span className={styles.lead}>{lead}</span>
      {mark}
    </div>
  )
}

interface FootProps {
  keep: Entry
  book: Book
  onMotif: (m: string) => void
  onEdit: () => void
  onDelete: () => void
}

/** The card's own foot: when it was kept and where in the book, the motifs,
    and the three verbs. The verbs are here rather than behind a menu because
    a menu was a fourth tap standing in front of three; and they are quiet
    icons rather than labelled buttons because they appear on every card and
    seven rows of "Share · Edit · Delete" would be the loudest thing on the
    page. */
function Foot({ keep, book, onMotif, onEdit, onDelete }: FootProps) {
  const one = KIND[keep.type].one
  const where = [
    keptLabel(keep.keptOn),
    keep.chapter,
    keep.page !== undefined ? `p. ${keep.page}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <footer className={styles.foot}>
      <span className={styles.where}>{where}</span>
      {keep.motifs?.map((motif) => (
        <button key={motif} type="button" className={styles.motif} onClick={() => onMotif(motif)}>
          {motif}
        </button>
      ))}
      <span className={styles.acts}>
        {shareable(keep) && (
          <button
            type="button"
            className={styles.act}
            onClick={() => void shareKeep(keep, book)}
            aria-label={`Share this ${one}`}
          >
            <ShareIcon size={16} />
          </button>
        )}
        <button
          type="button"
          className={styles.act}
          onClick={onEdit}
          aria-label={`Change this ${one}`}
        >
          <EditIcon size={16} />
        </button>
        <button
          type="button"
          className={styles.act}
          onClick={onDelete}
          aria-label={`Delete this ${one} — you can undo straight afterwards`}
        >
          <TrashIcon size={16} />
        </button>
      </span>
    </footer>
  )
}

/** The quote's mark. Four points, drawn rather than typed: a dingbat would
    arrive at whatever weight the font felt like. */
function Sparkle() {
  return (
    <svg className={styles.sparkle} width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2 C 12.8 8.4 15.6 11.2 22 12 C 15.6 12.8 12.8 15.6 12 22 C 11.2 15.6 8.4 12.8 2 12 C 8.4 11.2 11.2 8.4 12 2 Z"
        fill="currentColor"
      />
    </svg>
  )
}

/** The field under a place that has no map pinned to it.

    Not a placeholder and not a grey box: a drawn survey sheet, with contours
    derived from the keep's own id so one place never looks like another and a
    given place looks the same for ever. The grid itself is CSS on the plate —
    only the curves need to be drawn. */
function Survey({ seed }: { seed: number }) {
  const rings = [0, 1, 2, 3].map((i) => {
    const n = Math.abs(seed * 31 + i * 977)
    return {
      cx: 18 + ((n >> 3) % 64),
      cy: 14 + ((n >> 7) % 32),
      rx: 12 + i * 9 + ((n >> 11) % 7),
      ry: 8 + i * 6 + ((n >> 13) % 5),
      rotate: ((n >> 5) % 60) - 30,
    }
  })
  return (
    <svg
      className={styles.survey}
      viewBox="0 0 100 60"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {rings.map((r, i) => (
        <ellipse
          key={i}
          cx={r.cx}
          cy={r.cy}
          rx={r.rx}
          ry={r.ry}
          transform={`rotate(${r.rotate} ${r.cx} ${r.cy})`}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.5}
          opacity={0.55 - i * 0.09}
        />
      ))}
    </svg>
  )
}

/* ── The seven ────────────────────────────────────────────────────────── */

interface CardProps {
  keep: Entry
  book: Book
  onMotif: (motif: string) => void
  onEdit: () => void
  onDelete: () => void
}

function QuoteCard({ keep, ...foot }: CardProps) {
  return (
    <PaperSurface as="article" tone="quote" className={styles.quote}>
      <Rail
        lead={keep.page !== undefined ? `Page ${keep.page} · Quote` : 'Quote'}
        mark={<Sparkle />}
      />
      {/* The opening mark is drawn hung in the margin by the stylesheet rather
          than typed into the text, so the first letter of the line still sits
          on the card's own leading edge. */}
      <blockquote className={styles.line}>{keep.text}</blockquote>
      <Foot keep={{ ...keep, page: undefined }} {...foot} />
    </PaperSurface>
  )
}

function NoteCard({ keep, ...foot }: CardProps) {
  return (
    <PaperSurface as="article" tone="note" className={styles.note}>
      {/* The spine: a row of punched holes along the head of the sheet, so the
          note reads as a leaf torn off a spiral pad rather than as one more
          card. Drawn, not an image — the holes punch through to the page. */}
      <span className={styles.spine} aria-hidden="true" />
      <Rail lead="Note" />
      {/* Ruled like a notebook, and the hand actually sits on the rules: the
          pitch of the lines and the line-height of the text are the same
          number, set once in the stylesheet. */}
      <div className={styles.ruled}>
        <p className={styles.hand}>{keep.text}</p>
      </div>
      <Foot keep={keep} {...foot} />
      {/* The flip: a folded corner, bottom trailing, the way a page that has
          been turned back holds the crease. */}
      <span className={styles.fold} aria-hidden="true" />
    </PaperSurface>
  )
}

/** The one object on the page reversed out of the background.

    Every reference agreed on this and it is right: a recording is a device, not
    a piece of paper, and it should not look like one. The slab is `--color-ink`
    both ways round, so by day it is a dark bar on a pale page and after dark a
    pale bar on a dark one — inverted relative to the page, always, which is
    what makes it findable in a long scroll. */
function VoiceCard({ keep, ...foot }: CardProps) {
  return (
    <article className={styles.voice}>
      <Rail lead="Voice memo" />
      <VoiceOrb
        media={keep.media}
        duration={keep.duration}
        seed={keep.id}
        label={`the voice memo kept ${keptLabel(keep.keptOn)}`}
      />
      {keep.text && <p className={styles.slabCaption}>{keep.text}</p>}
      <Foot keep={keep} {...foot} />
    </article>
  )
}

function ImageCard({ keep, ...foot }: CardProps) {
  const url = useObjectUrl(keep.media)
  return (
    <PaperSurface as="figure" tone="image" className={styles.print}>
      <Rail lead="Picture" />
      <div className={styles.mount}>
        {url ? (
          /* The caption is the alt text when there is one. A reader writing
             "the page I kept turning back to" has described their own picture
             better than any generated string would. */
          <img
            className={styles.photo}
            src={url}
            alt={keep.text ?? 'A picture kept from this book'}
          />
        ) : (
          <p className={styles.gone}>This picture isn’t on this device.</p>
        )}
      </div>
      {keep.text && <figcaption className={styles.caption}>{keep.text}</figcaption>}
      <Foot keep={keep} {...foot} />
    </PaperSurface>
  )
}

function CharacterCard({ keep, ...foot }: CardProps) {
  return (
    <PaperSurface as="article" tone="character" className={styles.person}>
      <Rail lead="Character" />
      <div className={styles.who}>
        <span className={styles.medallion}>
          <Avatar id={keep.avatar} size={46} />
        </span>
        <h3 className={styles.name}>{keep.name}</h3>
      </div>
      {keep.text && <p className={styles.dossier}>{keep.text}</p>}
      <Foot keep={keep} {...foot} />
    </PaperSurface>
  )
}

function PlaceCard({ keep, ...foot }: CardProps) {
  const url = useObjectUrl(keep.media)
  return (
    /* Padding off, because the plate runs to the card's own edges. Every other
       card keeps the standard step. */
    <PaperSurface
      as="article"
      tone="place"
      className={styles.place}
      style={{ '--paper-pad': '0' } as CSSProperties}
    >
      <div className={styles.plate}>
        {url ? (
          <img className={styles.map} src={url} alt={`A map of ${keep.name ?? 'this place'}`} />
        ) : (
          <Survey seed={keep.id} />
        )}
      </div>
      <div className={styles.placeBody}>
        <Rail lead="Place & lore" />
        {keep.name && <h3 className={styles.name}>{keep.name}</h3>}
        {keep.text && <p className={styles.lore}>{keep.text}</p>}
        <Foot keep={keep} {...foot} />
      </div>
    </PaperSurface>
  )
}

/** The case card. A pushpin at its head, a dashed evidence frame inside its
    edge, and a typewritten heading — nothing else on the page is pinned,
    framed or typewritten, so a thread cannot be mistaken for a quote even at
    a squint. The pin and the frame get their colour from the stance, and the
    tag says it in words. */
function ThreadCard({ keep, ...foot }: CardProps) {
  const stance = STANCE[keep.stance ?? 'hunch']
  return (
    <PaperSurface
      as="article"
      tone="thread"
      className={styles.thread}
      data-stance={keep.stance ?? 'hunch'}
    >
      <span className={styles.pin} aria-hidden="true" />
      <div className={styles.rail}>
        {/* The stance is the card's headline fact, so it is a tag rather than
            a word: outlined for a hunch, heavier for a suspicion, filled for a
            certainty. The reader can see how sure they were from across the
            room. */}
        <span className={styles.stance}>{stance.label}</span>
      </div>
      {keep.name && <h3 className={styles.case}>{keep.name}</h3>}
      {keep.text && <p className={styles.said}>{keep.text}</p>}
      <Foot keep={keep} {...foot} />
    </PaperSurface>
  )
}

const CARD: Record<Entry['type'], (p: CardProps) => React.ReactElement> = {
  quote: QuoteCard,
  note: NoteCard,
  voice: VoiceCard,
  image: ImageCard,
  character: CharacterCard,
  place: PlaceCard,
  thread: ThreadCard,
}

interface KeepProps {
  keep: Entry
  book: Book
  onMotif: (motif: string) => void
  onEdit: (keep: Entry) => void
  onDelete: (keep: Entry) => void
}

function Keep({ keep, book, onMotif, onEdit, onDelete }: KeepProps) {
  const Card = CARD[keep.type]
  return (
    <Card
      keep={keep}
      book={book}
      onMotif={onMotif}
      onEdit={() => onEdit(keep)}
      onDelete={() => onDelete(keep)}
    />
  )
}

export default Keep
