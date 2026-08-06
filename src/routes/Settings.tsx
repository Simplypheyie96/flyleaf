import { Link } from 'react-router-dom'
import Sparkle from '../components/Sparkle'
import ThemeToggle from '../components/ThemeToggle'
import Group, { Row } from '../settings/Group'
import InstallHow from '../settings/InstallHow'
import { BackupCard, NameCard } from '../settings/Journey'
import Tip, { TIP_JAR } from '../settings/Tip'
import { DOCS } from '../legal/documents'
import card from '../settings/settings.module.css'
import pageStyles from './page.module.css'
import styles from './Settings.module.css'

/* Settings as a list of named groups, not a stack of cards.

   Six free-floating cards down a page is six separate documents: nothing says
   that the name and the theme belong to different subjects, and a reader
   hunting for one switch has to read every card to find out which one holds
   it. Grouped rows on shared paper, each group captioned above it, can be
   skimmed by caption alone.

   What folds and what does not is the whole of it. A control a reader came to
   change stays in front of them — the name field, the theme switch, the two
   backup buttons. What folds is prose: seven sets of install steps, six of
   them for devices this reader does not own. Folding a switch only puts a tap
   between someone and the thing they opened Settings to do.

   And every row is one line high. The explaining lives in the footnote under
   each card, said once, where it can be read or skipped — not repeated as a
   hint under every label, which is what turned this page into an essay with
   switches buried in it. */

function Settings() {
  return (
    <main className={pageStyles.page}>
      <div className={pageStyles.column}>
        <header className={styles.masthead}>
          <h1 className={styles.title}>
            Settings <Sparkle size={15} className={styles.spark} />
          </h1>
          <p className={styles.subtitle}>how Flyleaf behaves</p>
        </header>

        <div className={styles.list}>
          {/* The reader first: their name, then the theme they read in. Both
              are one line each, so they share a card. */}
          <Group label="You" note="Auto follows your device from day into night.">
            <NameCard />
            <Row title="Theme" control={<ThemeToggle />} />
          </Group>

          <Group
            label="Your journey"
            note="Held on this device only, never on our servers. A saved copy is one file with everything in it — open it anywhere to bring your journey back."
          >
            <BackupCard />
          </Group>

          {/* One row per device rather than one guess. See InstallHow. Named
              for the thing rather than the place it lands — the first row
              already says "Add to your home screen", and a caption repeating
              its own first row is a stutter. */}
          <Group
            label="Install Flyleaf"
            note="Installing only takes the browser away from around it. No update ever clears what you have written."
          >
            <InstallHow />
          </Group>

          {TIP_JAR && (
            <Group
              label="Support the maker"
              note="Flyleaf is free, has no ads, and is made by one person. Nothing here is ever locked."
            >
              <Tip />
            </Group>
          )}

          {/* Last, and deliberately plain. The three documents are the part of
              Settings a reader opens once — and the part that has to be
              findable the day somebody goes looking for it. */}
          <Group label="The small print">
            {DOCS.map((doc) => (
              <Link key={doc.slug} to={`/legal/${doc.slug}`} className={card.link}>
                {doc.title}
                <span className={card.linkHint} aria-hidden="true">
                  ›
                </span>
              </Link>
            ))}
          </Group>
        </div>
      </div>
    </main>
  )
}

export default Settings
