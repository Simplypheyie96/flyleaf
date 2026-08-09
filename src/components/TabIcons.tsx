/* Hand-drawn stroke icons for the shell tabs — round caps, no icon library. */

interface IconProps {
  size?: number
}

const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export function HomeIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M4.5 10.5 L 12 4.5 L 19.5 10.5" />
        <path d="M6.5 9.5 L 6.5 18.5 C 6.5 19 7 19.5 7.5 19.5 L 16.5 19.5 C 17 19.5 17.5 19 17.5 18.5 L 17.5 9.5" />
        <path d="M10 19.5 L 10 14.5 C 10 14 10.5 13.5 11 13.5 L 13 13.5 C 13.5 13.5 14 14 14 14.5 L 14 19.5" />
      </g>
    </svg>
  )
}

/* AN OPEN BOOK, AND IT SHOULD NEVER HAVE BEEN ANYTHING ELSE.

   This closed for one release, into a board with a spine band and a ribbon,
   because the brand mark had briefly become an open book too and two open books
   in the same chrome read as the app branding itself rather than naming a
   place. That was a real problem solved at the wrong end. The mark is the
   rosette now — the blossom already stitched into every cover and already on
   the keep button — so the collision is gone, and with it the only argument for
   shutting this one.

   Open is the better drawing on its own merits, which is why it was here first.
   It is the shape of the thing the tab actually holds: books, being read. The
   two pages off a centre spine give it a silhouette nothing else in the bar
   has, and at 22px a wide low shape is easier to tell from the shelf's uprights
   than another vertical rectangle was.

   It also serves FormatRow's "Physical" alongside the headphones and the
   screen — an open book, a slab, a headband: three objects the reader holds,
   far enough apart in outline to be told apart at 20px.

   Clearances follow the same rule as ShelfIcon below: a 1.8 stroke overhangs
   0.9 either side, so nothing sits closer than about 2.4 to its neighbour or
   the two strokes fuse into one dark bar. */
export function BookIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        {/* Both leaves in one closed outline, sagging away from the spine the
            way paper does when a book is held open in two hands. */}
        <path d="M12 6.5 C 10 4.8 7 4.5 4.5 5.2 L 4.5 18 C 7 17.3 10 17.6 12 19.2 C 14 17.6 17 17.3 19.5 18 L 19.5 5.2 C 17 4.5 14 4.8 12 6.5 Z" />
        {/* The spine, drawn rather than left as a gap — at this size a slot of
            negative space between two fills closes up. */}
        <path d="M12 6.5 L 12 19.2" />
      </g>
    </svg>
  )
}

export function SearchIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <circle cx="11" cy="11" r="6" />
        <path d="M15.5 15.5 L 19.5 19.5" />
      </g>
    </svg>
  )
}

export function QuoteIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M9.5 7.5 C 7 8 5.5 10 5.5 12.5 L 5.5 16 L 10 16 L 10 11.5 L 7.5 11.5 C 7.5 9.8 8.3 8.6 9.5 7.5 Z" />
        <path d="M18 7.5 C 15.5 8 14 10 14 12.5 L 14 16 L 18.5 16 L 18.5 11.5 L 16 11.5 C 16 9.8 16.8 8.6 18 7.5 Z" />
      </g>
    </svg>
  )
}

export function NoteIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M15.5 5.5 L 18.5 8.5 L 9 18 L 5.5 18.5 L 6 15 Z" />
        <path d="M13.5 7.5 L 16.5 10.5" />
      </g>
    </svg>
  )
}

/* A microphone held in a cradle that comes most of the way round it.

   The obvious way to tie this to the listening orb was to put the orb's wave
   in it: a capsule standing over five bars. It looked right at 110px and it
   failed at the size it is actually used — 15px in the filter row, where the
   bars are eleven hundredths of an em apart and merge into one dark block
   under a dot. Cutting to three bars only made it a smaller smudge.

   So the wave stays where a wave is legible (the orb while you talk, the bar
   trace when you play it back) and this glyph goes back to being a microphone,
   which is the one shape that survives 15px. What it takes from the orb is the
   ROUND: the cradle used to be a shallow saucer sitting under the capsule, and
   it now rises past the capsule's own shoulders on both sides, so the whole
   silhouette reads as a circle with a mic in it. Same family, no mush. */
export function VoiceIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <rect x="9.75" y="3.5" width="4.5" height="8.5" rx="2.25" />
        <path d="M6.4 8.8 C 6.4 15 8.9 17.2 12 17.2 C 15.1 17.2 17.6 15 17.6 8.8" />
        <path d="M12 17.2 L 12 20.5" />
      </g>
    </svg>
  )
}

/* A photograph, not a landscape. Every stock picture glyph is a mountain and
   a sun in a frame, which at 15px is three shapes fighting inside a square —
   this is the print itself, cornered on its mount, which is also exactly what
   the card underneath does with the real one. */
export function ImageIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <rect x="4.5" y="5.5" width="15" height="13" rx="1.5" />
        <path d="M4.5 14.5 L 9 10.5 L 13.5 14.5" />
        <path d="M13.5 14.5 L 15.5 12.5 L 19.5 16" />
        <circle cx="15" cy="9" r="1.2" />
      </g>
    </svg>
  )
}

/** A character: a person the reader is following. A head and shoulders, drawn
    as far from a passport photo as a 24-box allows — this labels somebody you
    are interested in, not a record of somebody. */
export function CharacterIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M5.5 19.5 C 5.5 15.9 8.4 13.5 12 13.5 C 15.6 13.5 18.5 15.9 18.5 19.5" />
      </g>
    </svg>
  )
}

/** A place: the fold of a map, not a location pin. A pin is where *you* are,
    and every one of these is somewhere you have never been. */
export function PlaceIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M3.5 6.5 L 9 4.5 L 15 7 L 20.5 5 L 20.5 17.5 L 15 19.5 L 9 17 L 3.5 19 Z" />
        <path d="M9 4.5 L 9 17" />
        <path d="M15 7 L 15 19.5" />
      </g>
    </svg>
  )
}

/* ---- Playback ----
   Solid, unlike every other glyph in this file. These two are reversed out of
   a filled disc, where a hairline outline would disappear, and they are the
   only icons in the set that are a button rather than a label. */
export function PlayIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 6.9 C 9 6.2 9.7 5.8 10.3 6.2 L 17.3 11.3 C 17.8 11.7 17.8 12.3 17.3 12.7 L 10.3 17.8 C 9.7 18.2 9 17.8 9 17.1 Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function PauseIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g fill="currentColor">
        <rect x="8.4" y="6" width="2.9" height="12" rx="1.2" />
        <rect x="12.7" y="6" width="2.9" height="12" rx="1.2" />
      </g>
    </svg>
  )
}

/* Stop, and only ever inside the recording orb. Pause is the right glyph for a
   thing you will resume; a recording that is stopped is finished, and offering
   the reader two vertical bars there promises a second half that never comes.
   Softened corners so it reads as an object in the sphere rather than a chip
   cut out of it. */
export function StopIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="7.2" y="7.2" width="9.6" height="9.6" rx="2.6" fill="currentColor" />
    </svg>
  )
}

/* ---- How a book is being read ----
   Paired with BookIcon, which serves the physical copy. Three objects the
   reader actually holds, not three abstractions — and deliberately far enough
   apart in silhouette to be told apart at 20px with no label under two of
   them: an open book, a slab, a headband. */

/* A reader held upright, with the one line of chrome along its foot that says
   screen rather than card. Nothing is drawn in the page area: a couple of
   ruled lines in there would collide with the shelf icon at this size. */
export function ScreenIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <rect x="6.4" y="3.4" width="11.2" height="17.2" rx="2.2" />
        <path d="M9.9 17.6 L 14.1 17.6" />
      </g>
    </svg>
  )
}

/* Headphones, not a speaker or a waveform. The microphone is already spoken
   for by VoiceIcon — that one is the reader recording, this one is the reader
   listening, and the two must not be confusable. */
/* The one date control in the app. Two posts above the head, because a
   calendar with a flat top edge reads as a window at this size. */
export function CalendarIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <rect x="3.6" y="5.4" width="16.8" height="15" rx="2.4" />
        <path d="M3.6 10 L 20.4 10" />
        <path d="M8.4 3.5 L 8.4 6.6 M 15.6 3.5 L 15.6 6.6" />
      </g>
    </svg>
  )
}

export function HeadphonesIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M5.5 13.4 L 5.5 11.6 C 5.5 8 8.4 5.1 12 5.1 C 15.6 5.1 18.5 8 18.5 11.6 L 18.5 13.4" />
        <rect x="3.6" y="12.6" width="3.8" height="6.4" rx="1.9" />
        <rect x="16.6" y="12.6" width="3.8" height="6.4" rx="1.9" />
      </g>
    </svg>
  )
}

/* ---- Library view switcher ----
   Three literal objects rather than three abstractions: a pile seen edge-on,
   spines standing on a shelf, thumbnails in a grid. Drawn on the same 24px
   grid and stroke weight as the tab icons so the switcher reads as part of
   the same chrome. */

/* Two covers at an angle, the way the Stack view actually piles them — not
   three horizontal bars, which at this size close up into a hamburger menu.
   The front card is filled so it reads as being on top of the other rather
   than crossing it. */
export function StackIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        {/* Offset diagonally as well as rotated. Two cards turned about one
            shared centre land on top of each other and read as a single
            rounded square. */}
        <rect x="4.4" y="3.4" width="10.4" height="13.2" rx="2.1" transform="rotate(-13 9.6 10)" />
        <rect
          x="9.2"
          y="7.4"
          width="10.4"
          height="13.2"
          rx="2.1"
          /* Knocks out the card behind it, so it has to match whatever
             surface the icon is sitting on — which changes when the pill
             becomes the selected one. */
          fill="var(--icon-knockout, var(--color-bg, white))"
          transform="rotate(7 14.4 14)"
        />
      </g>
    </svg>
  )
}

/* Spines standing on a board. Drawn 4.9 wide rather than 3.8: at a 1.8 stroke
   the old width left barely two units of interior, so the three rects sealed
   themselves shut and the icon came out as one dark block. */
export function ShelfIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {/* Gaps of 2.4, not 0.9. A 1.8 stroke sits centred on the path and so
          overhangs 0.9 either side: at the tighter spacing the neighbouring
          strokes met exactly and the three spines fused into one block. The
          board sits clear of the feet for the same reason. */}
      <g {...strokeProps}>
        <rect x="3" y="5" width="4.4" height="12.4" rx="1.2" />
        <rect x="9.8" y="6.3" width="4.4" height="11.1" rx="1.2" />
        {/* The lean is what separates a shelf from a bar chart. */}
        <rect x="16.6" y="5" width="4.4" height="12.4" rx="1.2" transform="rotate(8 18.8 17.4)" />
        <path d="M2.2 20 L 21.8 20" />
      </g>
    </svg>
  )
}

export function GridIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <rect x="4.6" y="4.6" width="6.2" height="6.2" rx="1.6" />
        <rect x="13.2" y="4.6" width="6.2" height="6.2" rx="1.6" />
        <rect x="4.6" y="13.2" width="6.2" height="6.2" rx="1.6" />
        <rect x="13.2" y="13.2" width="6.2" height="6.2" rx="1.6" />
      </g>
    </svg>
  )
}

/* Drawn a little inside the box rather than corner to corner: a full-bleed
   cross reads as a delete, and this only puts a sheet away. */
export function CloseIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M7.75 7.75 L 16.25 16.25" />
        <path d="M16.25 7.75 L 7.75 16.25" />
      </g>
    </svg>
  )
}

/* A chevron with no shaft, pointing whichever way it is asked to. Used on its
   own wherever something steps through a set in place — the deck on the
   Library, one book at a time. */
export function ChevronIcon({ size = 22, dir = 'left' }: IconProps & { dir?: 'left' | 'right' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path
          d={dir === 'left' ? 'M14.25 6 L 8.75 12 L 14.25 18' : 'M9.75 6 L 15.25 12 L 9.75 18'}
        />
      </g>
    </svg>
  )
}

/* The same glyph under the name of the job it does. Back moves between steps
   of one sheet, not to a previous page, and an arrow would promise the larger
   journey — but it is still a chevron, and there should only be one of those. */
export function BackIcon({ size = 22 }: IconProps) {
  return <ChevronIcon size={size} dir="left" />
}

/* The hint that a control has something folded underneath it. Drawn pointing
   down; the stylesheet turns it over when the thing is open. Takes a class
   because that turn belongs to whoever is using it, not to the icon. */
export function CaretIcon({ size = 22, className }: IconProps & { className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M6 9.5 L 12 15.5 L 18 9.5" />
      </g>
    </svg>
  )
}

/* Theme trio. Drawn a shade smaller than the tab glyphs — these sit in a
   control, not a shell, and a full-bleed sun beside a 15px word overpowers
   it. */
export function SunIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3.5 L 12 5.5" />
        <path d="M12 18.5 L 12 20.5" />
        <path d="M3.5 12 L 5.5 12" />
        <path d="M18.5 12 L 20.5 12" />
        <path d="M6 6 L 7.4 7.4" />
        <path d="M16.6 16.6 L 18 18" />
        <path d="M18 6 L 16.6 7.4" />
        <path d="M7.4 16.6 L 6 18" />
      </g>
    </svg>
  )
}

export function MoonIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        {/* One arc, not a disc with a bite taken out of it — a crescent drawn
            as a closed two-curve shape keeps an even stroke all the way round
            where a subtracted circle pinches at the horns. */}
        <path d="M19 14.5 C 17.9 15 16.7 15.3 15.4 15.3 C 10.9 15.3 7.3 11.7 7.3 7.2 C 7.3 6.4 7.4 5.6 7.6 4.9 C 5.5 6.4 4.2 8.9 4.2 11.7 C 4.2 16.4 8 20.2 12.7 20.2 C 15.3 20.2 17.7 19 19 17 Z" />
      </g>
    </svg>
  )
}

/* Auto — the contrast glyph: one disc, half of it filled. Reads as "both,
   decided for you" at 20px, where a clock or an "A" does not. */
export function AutoThemeIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5 A 7 7 0 0 1 12 19 Z" fill="currentColor" stroke="none" />
      <g {...strokeProps}>
        <circle cx="12" cy="12" r="7" />
      </g>
    </svg>
  )
}

export function SettingsIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M4.5 8 L 19.5 8" />
        <circle cx="9.5" cy="8" r="2" fill="var(--color-bg, white)" />
        <path d="M4.5 16 L 19.5 16" />
        <circle cx="14.5" cy="16" r="2" fill="var(--color-bg, white)" />
      </g>
    </svg>
  )
}

/* ── The journey's own verbs ──────────────────────────────────────────────
   Drawn in the same hand as the tabs above: one 24-box, round caps, 1.8
   stroke, and nothing an icon library would have given us. */

/** A plot thread: a line that leaves the spine, loops out on a suspicion, and
    comes back knotted. The knot is the point — a thread is a thought the
    reader intends to close. */
export function ThreadIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M8 4 L 8 20" />
        <path d="M8 7 C 14 8 16 10 16 12 C 16 14 14 16 8 17" />
        <circle cx="16" cy="12" r="1.6" />
      </g>
    </svg>
  )
}

/** The opening. One glyph on the whole page wears this, and nothing else ever
    may: a pennant run up a staff, planted on the day the reader started. It is
    drawn filled rather than hollow because it is the only mark on the thread
    that is a claim rather than a note. */
export function OpeningIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M7.5 3.5 L 7.5 20.5" />
        <path
          d="M7.5 5 L 18 7.6 C 18.6 7.75 18.6 8.6 18 8.8 L 7.5 12.2 Z"
          fill="currentColor"
          stroke="none"
        />
      </g>
    </svg>
  )
}

/** The closing, and the only other glyph allowed to be a claim. It is the
    opening pennant mirrored about the middle of its own staff: same staff, same
    flag, but the flag has slid to the foot. Read down the thread the two marks
    say one thing — run up on the first day, lowered on the last.

    Deliberately NOT a tick, a lock or a flag-with-a-cross. Those all say
    "completed", which is a task word; this book was not a task. */
export function ClosingIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M7.5 3.5 L 7.5 20.5" />
        <path
          d="M7.5 19 L 18 16.4 C 18.6 16.25 18.6 15.4 18 15.2 L 7.5 11.8 Z"
          fill="currentColor"
          stroke="none"
        />
      </g>
    </svg>
  )
}

/** More, on a keep. Three dots is the one place a convention beats a drawing:
    a reader looking for "everything else" looks here first. */
export function MoreIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g fill="currentColor">
        <circle cx="6" cy="12" r="1.7" />
        <circle cx="12" cy="12" r="1.7" />
        <circle cx="18" cy="12" r="1.7" />
      </g>
    </svg>
  )
}

export function ShareIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M12 15.5 L 12 4.5" />
        <path d="M8.5 8 L 12 4.5 L 15.5 8" />
        <path d="M7 11 L 5.5 11 C 5 11 4.5 11.5 4.5 12 L 4.5 19 C 4.5 19.5 5 20 5.5 20 L 18.5 20 C 19 20 19.5 19.5 19.5 19 L 19.5 12 C 19.5 11.5 19 11 18.5 11 L 17 11" />
      </g>
    </svg>
  )
}

export function TrashIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M4.5 7 L 19.5 7" />
        <path d="M9.5 7 L 9.5 5 C 9.5 4.5 10 4 10.5 4 L 13.5 4 C 14 4 14.5 4.5 14.5 5 L 14.5 7" />
        <path d="M6.5 7 L 7.4 19 C 7.45 19.6 7.9 20 8.5 20 L 15.5 20 C 16.1 20 16.55 19.6 16.6 19 L 17.5 7" />
        <path d="M10.5 10.5 L 10.8 16.5" />
        <path d="M13.5 10.5 L 13.2 16.5" />
      </g>
    </svg>
  )
}

/** Sort: three rules, longest first, with the arrow that reorders them. */
export function SortIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M4 7 L 14 7" />
        <path d="M4 12 L 11 12" />
        <path d="M4 17 L 8 17" />
        <path d="M17.5 6 L 17.5 18" />
        <path d="M15 15.5 L 17.5 18 L 20 15.5" />
      </g>
    </svg>
  )
}

/** The Feed shelf view: one book to a row, with its last keep under it. */
export function FeedIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <rect x="4" y="4.5" width="5" height="6.5" rx="1" />
        <path d="M11.5 6.5 L 20 6.5" />
        <path d="M11.5 9.5 L 17.5 9.5" />
        <rect x="4" y="13" width="5" height="6.5" rx="1" />
        <path d="M11.5 15 L 20 15" />
        <path d="M11.5 18 L 17.5 18" />
      </g>
    </svg>
  )
}

/** Fair Copy: a clean sheet drawn off a marked-up one. */
export function FairCopyIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M8 4.5 L 15 4.5 L 18.5 8 L 18.5 19.5 L 8 19.5 Z" />
        <path d="M14.5 4.5 L 14.5 8.5 L 18.5 8.5" />
        <path d="M10.8 12 L 15.7 12" />
        <path d="M10.8 15.5 L 14 15.5" />
        <path d="M5.5 7 L 5.5 17" />
      </g>
    </svg>
  )
}

/** Keep something: the rosette.

    Three drawings got thrown away before this one. A plus — the glyph every
    app on the phone already puts in that corner, saying nothing about which
    app you are in. Then a pressed sprig in hairlines, which at 22px reversed
    out of a dark disc closed into a scribble. Then the same sprig filled and
    scaled up, which is what is on screen now and reads as a tick: a stem
    sweeping up to the right with two narrow blades off it is, at this size,
    a checkmark with a decoration problem.

    Every one of those failed the same way — the shape was a diagonal made of
    thin parts, and a diagonal made of thin parts is a stroke, not an object.
    So this is an object. Five petals and a centre, radial, filled, occupying
    nearly the whole frame: a flower is one of about four silhouettes a person
    can name from the corner of their eye, and the needlework blossom is
    already printed on every cover in the library, so the button in the corner
    is now the app's own mark rather than a generic one.

    Geometry, so it stays true if anyone retouches it: petal centres sit 5.8
    from the middle of a 24 box, each an ellipse 3.5 long by 2.8 across lying
    on its own radius, 72° apart. Adjacent centres are 6.82 apart against a
    combined width of 5.6, so no two petals touch — the gaps are what make it
    legible small. Inner tips reach 2.3 from the middle and the eye is 1.8, so
    there is a half-unit ring of air around it that survives to about 16px. */
export function KeepIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g fill="currentColor">
        {/* Twelve o'clock, then round. Each petal is two half-arcs between the
            ends of its own major axis, with the axis rotation set to the same
            angle as the radius it sits on. */}
        <path d="M12 2.7 A 3.5 2.8 -90 1 1 12 9.7 A 3.5 2.8 -90 1 1 12 2.7 Z" />
        <path d="M20.845 9.126 A 3.5 2.8 -18 1 1 14.187 11.29 A 3.5 2.8 -18 1 1 20.845 9.126 Z" />
        <path d="M17.466 19.524 A 3.5 2.8 54 1 1 13.352 13.86 A 3.5 2.8 54 1 1 17.466 19.524 Z" />
        <path d="M6.534 19.524 A 3.5 2.8 126 1 1 10.648 13.86 A 3.5 2.8 126 1 1 6.534 19.524 Z" />
        <path d="M3.155 9.126 A 3.5 2.8 198 1 1 9.813 11.29 A 3.5 2.8 198 1 1 3.155 9.126 Z" />
        {/* The eye. Free-standing rather than cut out of the petals, because a
            knocked-out centre needs a background to knock out to and this
            glyph rides a dark disc, a pale chip and open sky in three
            different places. */}
        <circle cx="12" cy="12" r="1.8" />
      </g>
    </svg>
  )
}

/** A pencil, for editing what is already kept. */
export function EditIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M15.5 4.8 L 19.2 8.5 L 8.7 19 L 4.5 19.5 L 5 15.3 Z" />
        <path d="M13.5 6.8 L 17.2 10.5" />
      </g>
    </svg>
  )
}

/** Save: the share arrow turned round, coming down into the same tray. The two
    live side by side on the keepsake, so they have to read as one pair. */
export function SaveIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M12 4.5 L 12 15.5" />
        <path d="M8.5 12 L 12 15.5 L 15.5 12" />
        <path d="M7 11 L 5.5 11 C 5 11 4.5 11.5 4.5 12 L 4.5 19 C 4.5 19.5 5 20 5.5 20 L 18.5 20 C 19 20 19.5 19.5 19.5 19 L 19.5 12 C 19.5 11.5 19 11 18.5 11 L 17 11" />
      </g>
    </svg>
  )
}

/** Two arrows chasing each other: draw the next one. It sits beside "Another
    face", which without it is a piece of small uppercase text standing next to
    another piece of small uppercase text — the field's own label — at the same
    size and weight, and nothing said which of the two could be pressed. Dictate
    is legible as a control on the line below only because it carries a
    microphone, so this carries the same weight of mark. */
export function CycleIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M4.8 12 A 7.2 7.2 0 0 1 17.6 7.6" />
        <path d="M14.2 7.1 L 17.9 7.7 L 18.5 4" />
        <path d="M19.2 12 A 7.2 7.2 0 0 1 6.4 16.4" />
        <path d="M9.8 16.9 L 6.1 16.3 L 5.5 20" />
      </g>
    </svg>
  )
}

/** A tick, for marking a book finished and for confirming in menus. */
export function CheckIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M5 12.5 L 10 17.5 L 19 6.5" />
      </g>
    </svg>
  )
}

/* The funnel, because forty years of interfaces have taught every reader what
   it means, drawn with the house's round caps rather than as a solid wedge. */
export function FilterIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M4.5 6 H 19.5 L 14 12.5 V 18 L 10 16 V 12.5 Z" />
      </g>
    </svg>
  )
}

/* A real pin, seen from the side — head, shaft, point. The pushpin-at-an-
   angle every interface draws is a map marker's cousin and reads as "place";
   this reads as "held down", which is what it does to a book on the shelf. */
export function PinIcon({ size = 22, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps} fill={filled ? 'currentColor' : 'none'}>
        <path d="M9 3.5 H 15 L 13.8 9.2 L 17.5 13 V 14.5 H 6.5 V 13 L 10.2 9.2 Z" />
      </g>
      <g {...strokeProps}>
        <path d="M12 14.5 V 20.5" />
      </g>
    </svg>
  )
}
