import { useState } from 'react'
import { Link } from 'react-router-dom'
import Guide from '../onboarding/Guide'
import Sheet from '../components/Sheet'
import Sparkle from '../components/Sparkle'
import ThemeToggle from '../components/ThemeToggle'
import Group, { Row } from '../settings/Group'
import Erase from '../settings/Erase'
import LockCard from '../settings/Lock'
import SyncCard from '../settings/Sync'
import InstallHow from '../settings/InstallHow'
import { BackupCard, FaceCard, NameCard } from '../settings/Journey'
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
  const [touring, setTouring] = useState(false)

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
          {/* The reader first: their name, then the face, then the theme they
              read in. Three rows on one card, one line each — the face row
              folds its own twelve discs away, which is the only thing on this
              page that was ever taller than a line. */}
          <Group label="You" note="Auto follows your device from day into night.">
            <NameCard />
            <FaceCard />
            <Row title="Theme" control={<ThemeToggle />} />
          </Group>

          {/* Erase sits in this group and last in it, not in a group of its
              own. It is the same subject as the rows above — where the journey
              is and what the reader can do with it — and the honest end of that
              subject is that they can also end it. A separate "Danger zone"
              card would say the opposite of everything this app is: it would
              make leaving feel like breaking something. */}
          {/* ONE FOOTNOTE USED TO CARRY ALL OF THIS AND IT WAS FIVE SENTENCES
              LONG (owner's call to break it up). It explained the file, the
              Drive folder, the code and the printed journal under a single
              card — so a reader who wanted to know one of those things read
              past three they had not asked about, and nothing in the paragraph
              sat next to the row it described.

              Splitting the card in two is what fixed it, not shortening the
              prose. These rows were always two subjects wearing one label:
              WHERE the journey is kept and what you can carry it away in, then
              WHO can reach it. Each half now has a footnote about its own
              rows, short enough to read, and everything else moved inside the
              row it belongs to — the lock's terms are in the lock's fold, the
              erase warning in the erase fold. */}
          <Group
            label="Your journey"
            note="Held on this device, never on our servers. A saved copy is one file with everything in it — open it anywhere to bring your journey back."
          >
            <BackupCard />
            {/* Last, and in this half rather than beside the lock: ending the
                journey is the final thing you can do WITH it, not a question
                about who may read it. A separate "Danger zone" card would say
                the opposite of everything this app is — it would make leaving
                feel like breaking something. */}
            <Erase />
          </Group>

          {/* Both optional, and the footnote says so in as many words. Neither
              of these is how Flyleaf works — a reader can shelve books and
              write in them for years having touched neither — and the day
              sign-in starts reading as a requirement is the day this app has
              broken its own promise. Sync first: it is the one that answers
              "what if I lose this phone", which is the question the rows above
              raise. */}
          <Group
            label="Sync and lock"
            note="Both optional. Syncing keeps a copy in your own Google Drive, in a hidden folder only Flyleaf can open, so a new phone finds your reading waiting."
          >
            <SyncCard />
            <LockCard />
          </Group>

          {/* Third of six, not second from last.

              It sat below the install steps, which meant a reader had to scroll
              past seven sets of instructions for devices they do not own before
              they found it — in practice, nobody did. Up here it is on the
              first screen of Settings, under the two groups that are genuinely
              the reader's own business.

              Not higher than that. It stays below "You" and "Your journey"
              because it is the one row on this page that asks for something
              rather than offering something, and an app whose Settings OPEN
              with a request for money is a different app. Visible, third,
              nothing locked — that is the whole brief. */}
          {TIP_JAR && (
            <Group
              label="Support the maker"
              note="Flyleaf is free, has no ads, and is made by one person. Nothing here is ever locked."
            >
              <Tip />
            </Group>
          )}

          {/* The tour, findable ever after. The owner asked for a first-run
              guide and, rightly, for a way to see it that does not require
              wiping the app — this is that way. Same four cards Guide.tsx
              shows a brand-new reader. */}
          <Group label="How Flyleaf works">
            <button type="button" className={card.link} onClick={() => setTouring(true)}>
              See the tour again
              <span className={card.linkHint} aria-hidden="true">
                ›
              </span>
            </button>
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

      <Sheet open={touring} onClose={() => setTouring(false)} label="How Flyleaf works" name="tour">
        {touring && <Guide plain doneLabel="Done" onDone={() => setTouring(false)} />}
      </Sheet>
    </main>
  )
}

export default Settings
