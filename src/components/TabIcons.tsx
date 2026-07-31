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

export function BookIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path d="M12 6.5 C 10 4.8 7 4.5 4.5 5.2 L 4.5 18 C 7 17.3 10 17.6 12 19.2 C 14 17.6 17 17.3 19.5 18 L 19.5 5.2 C 17 4.5 14 4.8 12 6.5 Z" />
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

export function VoiceIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <rect x="9.5" y="4.5" width="5" height="10" rx="2.5" />
        <path d="M6 11.5 C 6 15 8.5 17 12 17 C 15.5 17 18 15 18 11.5" />
        <path d="M12 17 L 12 20" />
      </g>
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
        <rect
          x="4.4"
          y="3.4"
          width="10.4"
          height="13.2"
          rx="2.1"
          transform="rotate(-13 9.6 10)"
        />
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
        <rect
          x="16.6"
          y="5"
          width="4.4"
          height="12.4"
          rx="1.2"
          transform="rotate(8 18.8 17.4)"
        />
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
export function ChevronIcon({
  size = 22,
  dir = 'left',
}: IconProps & { dir?: 'left' | 'right' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...strokeProps}>
        <path
          d={
            dir === 'left'
              ? 'M14.25 6 L 8.75 12 L 14.25 18'
              : 'M9.75 6 L 15.25 12 L 9.75 18'
          }
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
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <g {...strokeProps}>
        <path d="M6 9.5 L 12 15.5 L 18 9.5" />
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
