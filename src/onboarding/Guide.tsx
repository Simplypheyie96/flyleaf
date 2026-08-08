/* THE TOUR — four cards between "what should we call you" and the app.

   The owner asked for this twice before it existed: a first-time guide that
   runs BEFORE the reader lands on Home, so the first screen they meet is not
   also the screen they have to decode. Four steps, one idea each, in the order
   a reader will actually meet them: add a book, keep things from it, the
   reading nook, and whose data this is. Nothing here scrolls, nothing here is
   a video — a card a second is the whole cost.

   IT IS ALSO NOT A ONE-SHOT. The same cards open from Settings ("How Flyleaf
   works"), because the reader who skimmed them on day one is the reader who
   wants them on day nine. One component, two doors: `plain` drops the paper
   wrapper when the cards are shown inside a sheet that already has a surface
   of its own. */

import { useState } from 'react'
import PaperSurface from '../components/PaperSurface'
import LeafButton from '../components/LeafButton'
import { BookIcon, NoteIcon, QuoteIcon, VoiceIcon } from '../components/TabIcons'
import styles from './onboarding.module.css'

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

/* Two icons the tab bar never needed, drawn in its idiom — round caps, no
   icon library. The lamp is the nook's floor lamp reduced to shade, stem and
   glow; the leaf-in-hand is the closest this app has to a padlock that is not
   a padlock, because "private" here is a kindness, not a vault. */
function LampIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...stroke}>
        <path d="M9 4.5 H 15 L 17 9.5 H 7 Z" />
        <path d="M12 9.5 V 17.5" />
        <path d="M8.5 20 H 15.5" />
        <path d="M12 17.5 Q 8.5 17.5 8.5 20" />
        <path d="M12 17.5 Q 15.5 17.5 15.5 20" />
        <path d="M6 12.5 Q 4.8 13.4 4.5 14.8 M18 12.5 Q 19.2 13.4 19.5 14.8" opacity="0.65" />
      </g>
    </svg>
  )
}

function LeafIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g {...stroke}>
        <path d="M18.5 5.5 C 12 5.5 7.5 8.5 7.5 14 C 7.5 16.5 9 18.5 11.5 18.5 C 16.5 18.5 18.5 12 18.5 5.5 Z" />
        <path d="M7.5 19.5 C 9.5 15 13 10.5 16.5 8" />
      </g>
    </svg>
  )
}

interface Step {
  icon: React.ReactNode
  title: string
  line: string
}

const STEPS: Step[] = [
  {
    icon: <BookIcon size={26} />,
    title: 'Add a book — we find the rest',
    line: 'Search a title and the cover and details arrive on their own. Every book you add gets its own journey page.',
  },
  {
    icon: (
      <>
        <QuoteIcon size={26} />
        <NoteIcon size={26} />
        <VoiceIcon size={26} />
      </>
    ),
    title: 'Keep what it gives you',
    line: 'Quotes, notes and pictures — and voice memos, spoken to the orb. Each one hangs on that book’s own thread.',
  },
  {
    icon: <LampIcon />,
    title: 'Somewhere to read',
    line: 'At the foot of Home there’s a lamp. Tap it for rain and a fire to read to, and start the clock to keep your reading time.',
  },
  {
    icon: <LeafIcon />,
    title: 'Private, and yours',
    line: 'No account, nothing sent anywhere. Your journal lives on this device — save a copy, or print it, any time from Settings.',
  },
]

interface GuideProps {
  onDone: () => void
  /** Label for the last step's button — "Open my journal" on first run,
   *  something quieter from Settings. */
  doneLabel?: string
  /** Rendered inside a surface that already exists (the Settings sheet), so
   *  skip the paper and the skip-link — a sheet has its own way out. */
  plain?: boolean
}

export default function Guide({ onDone, doneLabel = 'Open my journal', plain = false }: GuideProps) {
  const [step, setStep] = useState(0)
  const last = step === STEPS.length - 1
  const { icon, title, line } = STEPS[step]

  const card = (
    <>
      <div className={styles.stepIcon} aria-hidden="true">
        {icon}
      </div>
      <h2 className={styles.big}>{title}</h2>
      <p className={styles.lede}>{line}</p>

      <div className={styles.dots} aria-hidden="true">
        {STEPS.map((_, i) => (
          <i key={i} className={styles.dot} data-on={i === step || undefined} />
        ))}
      </div>
      {/* The dots say it to the eye; this says it once to a screen reader. */}
      <p className={styles.count} role="status">
        Step {step + 1} of {STEPS.length}
      </p>

      <div className={styles.acts}>
        <LeafButton onClick={() => (last ? onDone() : setStep(step + 1))}>
          {last ? doneLabel : 'Next'}
        </LeafButton>
        {!plain && !last && (
          <button type="button" className={styles.skip} onClick={onDone}>
            Skip the tour
          </button>
        )}
      </div>
    </>
  )

  if (plain) return <div className={styles.plainGuide}>{card}</div>

  /* A fresh rotation per step, so advancing reads as a new card being laid
     down rather than the same card changing its mind. */
  return (
    <PaperSurface taped rotate={step % 2 ? 0.5 : -0.5} className={styles.panel} key={step}>
      {card}
    </PaperSurface>
  )
}
