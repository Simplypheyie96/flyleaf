import { useNavigate } from 'react-router-dom'
import PaperSurface from '../components/PaperSurface'
import LeafButton from '../components/LeafButton'
import { hideFirstPage, useFirstPage } from './progress'
import styles from './onboarding.module.css'

/* The first page of the journal, sitting at the top of Home.

   ONE INVITATION AT A TIME. A list of nine things to do is a chore; the same
   nine as a row of small stamps with one open invitation above them is a page
   being filled in. So the card says the next thing in the reader's own
   language, says in one line why it is worth doing, and offers the button
   that goes there. The eight it is not asking about are marks, not rows.

   It never argues. "Not now" removes it permanently, and it removes itself
   the moment the last mark lands — with one line of thanks, not confetti. */

function FirstPage() {
  const page = useFirstPage()
  const navigate = useNavigate()

  if (!page || !page.visible || !page.next) return null

  const { next, marks, done } = page

  return (
    <PaperSurface taped rotate={-0.5} className={styles.page}>
      <div className={styles.pageHead}>
        <p className={styles.eyebrow}>Your first page</p>
        <p className={styles.tally}>
          {done} of {marks.length}
        </p>
      </div>

      <h2 className={styles.invite}>{next.invite}</h2>
      <p className={styles.why}>{next.why}</p>

      <div className={styles.acts}>
        <LeafButton onClick={() => navigate(next.to)}>{next.act}</LeafButton>
        <button type="button" className={styles.skip} onClick={hideFirstPage}>
          Not now
        </button>
      </div>

      {/* The stamps. Each one is a step, and the one being invited is open
          and ringed; the rest are either filled or waiting. Decorative to a
          screen reader — the invitation above already says everything a
          reader needs, and nine unlabelled dots read aloud is noise. */}
      <ul className={styles.stamps} aria-hidden>
        {marks.map(({ step, done: had }) => (
          <li
            key={step.id}
            className={styles.stamp}
            data-done={had ? '' : undefined}
            data-now={step.id === next.id ? '' : undefined}
            title={step.invite}
          />
        ))}
      </ul>
    </PaperSurface>
  )
}

export default FirstPage
