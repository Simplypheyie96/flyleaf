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
import Recheck from '../settings/Recheck'
import { BackupCard, FaceCard, NameCard } from '../settings/Journey'
import Tip, { TIP_JAR } from '../settings/Tip'
import { DOCS } from '../legal/documents'
import card from '../settings/settings.module.css'
import pageStyles from './page.module.css'
import styles from './Settings.module.css'

/* Stamped in by vite.config.ts — the commit on a Vercel build, the build time
   on a local one. Declared here rather than in a global .d.ts to match how
   __PREVIEW_SEED__ is declared next to its only use in App.tsx. */
declare const __BUILD__: string

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

   NO FOOTNOTES. There used to be a line or two of prose under every card, and
   the owner's verdict was that it was "really too much and not really needed…
   it will overwhelm users when the texts are too much" — which is right, and
   the arithmetic says why: six captions is six paragraphs standing between
   seven groups of switches, so a page of controls reads as a page of reading.

   Whatever genuinely needs saying is said INSIDE the row it belongs to, in
   that row's fold, where only a reader who opened it meets it. The sync fold
   explains Drive; the lock fold explains the code; the erase fold carries its
   own warning; the tip sheet says what Paystack sees. None of that needed a
   caption over the card to repeat it. */

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
          <Group label="You">
            <NameCard />
            <FaceCard />
            <Row title="Theme" control={<ThemeToggle />} />
          </Group>

          {/* Second of six, directly under "You" — the owner's call, and it
              settles a question this comment used to argue the other way.

              It has now moved twice. It began below the install steps, where a
              reader had to scroll past seven sets of instructions for devices
              they do not own before reaching it, and in practice nobody did.
              It then sat third, under "Your journey", on the reasoning that an
              app whose Settings open with a request for money is a different
              app. That reasoning still holds for the FIRST group and this is
              not it: "You" stays at the top, and the ask comes after the
              reader, not before them. Everything about the journey, syncing,
              the tour, installing and the small print now follows. */}
          {TIP_JAR && (
            <Group label="Support the maker">
              <Tip />
            </Group>
          )}

          {/* Erase sits in this group and last in it, not in a group of its
              own. It is the same subject as the rows above — where the journey
              is and what the reader can do with it — and the honest end of that
              subject is that they can also end it. A separate "Danger zone"
              card would say the opposite of everything this app is: it would
              make leaving feel like breaking something. */}
          {/* Two cards, not one, and that split outlived the footnotes that
              prompted it. These rows were always two subjects wearing one
              label: WHERE the journey is kept and what you can carry it away
              in, then WHO can reach it. Everything either half needs to say
              sits inside the row it belongs to — the lock's terms in the
              lock's fold, the erase warning in the erase fold. */}
          <Group label="Your journey">
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
          <Group label="Sync and lock">
            <SyncCard />
            <LockCard />
          </Group>

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
          <Group label="Install Flyleaf">
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

          {/* The version, at the very foot, in the place a version belongs.
              This exists so that "is the fix on this device yet?" can be
              answered by reading rather than by guessing: two devices showing
              different stamps have not both been updated, and two showing the
              same stamp and different behaviour have found a real bug. See the
              note on __BUILD__ in vite.config.ts. */}
          <p className={styles.build}>Version {__BUILD__}</p>
          {/* A PULL, BECAUSE THE PUSH IS NOT RELIABLE ENOUGH TO BE THE ONLY WAY.
              The update toast is the right default and it still stands, but it
              depends on a chain of things going right that a reader cannot see:
              the browser refetching sw.js, the new worker reaching `waiting`,
              and the toast being on screen at the moment it does. When any link
              in that chain slips, the reader is left reloading a page over and
              over with nothing to tell them why the version above has not
              moved — which is exactly what happened, and it is a worse failure
              than the one prompt mode was chosen to fix.

              This asks the server directly and then says what it found, in
              those words. There is no state it can leave the reader in where
              the honest answer is "keep reloading and hope". */}
          <Recheck />
        </div>
      </div>

      <Sheet open={touring} onClose={() => setTouring(false)} label="How Flyleaf works" name="tour">
        {touring && <Guide plain doneLabel="Done" onDone={() => setTouring(false)} />}
      </Sheet>
    </main>
  )
}

export default Settings
