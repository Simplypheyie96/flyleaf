import type { ReactNode } from 'react'
import styles from './legal.module.css'

/* The three pages a free, local-first app owes its readers, written to be read
   rather than survived.

   Two rules held throughout. First, every sentence describes what Flyleaf
   ACTUALLY does today — there is no account system, no server holding anybody's
   reading, and no sync, so none of that appears here, however much a policy
   template would like it to. A privacy policy that describes a more impressive
   app than the one you installed is not a privacy policy. Second, where the
   builder has to decide something a stranger cannot decide for them, the text
   says so in a slot they can see, instead of guessing and reading as settled.

   These are STARTER DRAFTS. They are not legal advice and have not been
   reviewed by anyone qualified to review them. Every page says so at the top,
   in the reader's plain sight, until the builder replaces this note. */

/* ---------------------------------------------------------------------------
   Who is behind Flyleaf, and how to reach them. Every page reads from here;
   change a value once and all three documents change with it.

   `email` is published on three public pages and will be scraped. If a
   personal address is not what you want on them, put a forwarding address
   here instead — it is the only change needed.

   Change `updated` whenever a document's wording changes; the date under each
   title is what tells a reader whether they are looking at the current terms.
   --------------------------------------------------------------------------- */
export const MAKER = {
  name: 'Ajayi Feyikemi Mabel',
  email: 'ajayifey@gmail.com',
  place: 'Nigeria',
  updated: '6 August 2026',
  /* Deliberately separate from the details above. Those are filled in; a
     professional reading is not, and only one of those two is the maker's to
     do alone. The banner comes off when this turns true — it is not
     decoration, it is the honest state of the document. */
  reviewed: false,
}

function Out({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className={styles.out} href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  )
}

/* The unfilled slots, visibly a slot. A reader should be able to tell the
   difference between a decision the maker made and one they have not made
   yet, and so should the maker, from across the room. */
function Slot({ children }: { children: ReactNode }) {
  return <span className={styles.slot}>{children}</span>
}

/* A bracketed value is a decision nobody has made yet, and it renders as a
   visible slot rather than as settled text. Filled values render as what they
   are — and the address as something you can actually write to, since a
   contact you have to copy out by hand is a contact nobody uses. */
const pending = (value: string) => value.startsWith('[')

const maker = pending(MAKER.name) ? <Slot>{MAKER.name}</Slot> : <>{MAKER.name}</>
const mail = pending(MAKER.email) ? (
  <Slot>{MAKER.email}</Slot>
) : (
  <a className={styles.out} href={`mailto:${MAKER.email}`}>
    {MAKER.email}
  </a>
)

export interface Section {
  heading: string
  content: ReactNode
}

export interface Doc {
  slug: string
  title: string
  /* The one line under the title — what this page is for, before any of it. */
  lede: string
  /* Read this and you have read the page. Everything below is the same thing,
     said carefully. */
  short: string[]
  body: Section[]
}

const privacy: Doc = {
  slug: 'privacy',
  title: 'Privacy',
  lede: 'What Flyleaf knows about you, which is nothing.',
  short: [
    'There is no account, no server holding your reading, and no analytics of any kind.',
    'Everything you write, record and keep stays in this browser, on this device.',
    'Flyleaf reaches the internet for three things only: to load itself, to look up a book you searched for, and to take a tip if you offer one.',
    'Because nothing is held anywhere else, clearing this browser clears your journey. Saving a copy is how you keep it.',
  ],
  body: [
    {
      heading: 'What we collect',
      content: (
        <>
          <p>
            Nothing. There is no sign-up, no password, no profile, and no server
            with your name on it. We could not tell you what is in your library
            if you asked us, because we have never had it.
          </p>
          <p>
            The name you pick when you first open Flyleaf is stored in your own
            browser so the app can greet you. It is not sent anywhere, and it is
            not a username — nobody else can see it, and nobody is checking
            whether it is taken.
          </p>
        </>
      ),
    },
    {
      heading: 'Where your reading lives',
      content: (
        <>
          <p>
            In your browser's own database (IndexedDB), on the device you are
            using. Your books, notes, quotes, highlights, images and voice memos
            are written there and nowhere else. Voice recordings and pictures are
            held as files in that same store; they are never uploaded.
          </p>
          <p>
            This means Flyleaf works with the plane doors closed, and it means
            your journey does not follow you to another device on its own. That
            is the trade, and it is deliberate.
          </p>
        </>
      ),
    },
    {
      heading: 'When Flyleaf talks to the internet',
      content: (
        <>
          <p>Three times, and you can see each one coming.</p>
          <p>
            <strong>Loading the app.</strong> Flyleaf is served by Vercel. Like
            every web host, its servers record ordinary request information —
            your IP address, the time, which file was asked for. That log belongs
            to Vercel and is governed by{' '}
            <Out href="https://vercel.com/legal/privacy-policy">their privacy policy</Out>.
            After the first visit the app is cached on your device and can open
            with no request at all.
          </p>
          <p>
            <strong>Searching for a book.</strong> When you look up a title, the
            words you typed go from your browser directly to{' '}
            <Out href="https://openlibrary.org/">Open Library</Out> and{' '}
            <Out href="https://books.google.com/">Google Books</Out>, and cover
            images load from their servers. Those requests carry your IP address
            to them, as any web request does. They do not pass through us —
            there is no us in the middle to pass through. Their terms:{' '}
            <Out href="https://archive.org/about/terms.php">Internet Archive</Out>{' '}
            and <Out href="https://policies.google.com/privacy">Google</Out>.
          </p>
          <p>
            <strong>Leaving a tip.</strong> Only if you choose to. See below.
          </p>
        </>
      ),
    },
    {
      heading: 'If you tip',
      content: (
        <>
          <p>
            Payments are handled entirely by{' '}
            <Out href="https://paystack.com/">Paystack</Out>. Your card details are
            typed on their page, on their servers, under{' '}
            <Out href="https://paystack.com/terms">their terms</Out> and{' '}
            <Out href="https://paystack.com/privacy">privacy policy</Out>. Flyleaf
            never sees them, never receives them, and could not store them if it
            wanted to.
          </p>
          <p>
            The one thing you give us is an email address, and it is passed
            straight to Paystack so they can send you a receipt. It is not kept,
            not added to a list, and not used to write to you. Nothing about a
            tip is recorded on our side and no tip is attached to your library.
          </p>
        </>
      ),
    },
    {
      heading: 'What Flyleaf does not do',
      content: (
        <>
          <p>
            No analytics. No tracking pixels, no session recording, no
            fingerprinting, no advertising, and no third parties watching you use
            the app. The type is served from Flyleaf's own files rather than a
            font network, so even reading a page does not announce you to anyone.
          </p>
          <p>
            There are no cookies used for tracking. The app stores what it needs
            to work — your reading, your name, whether you prefer day or night —
            in your browser, where you can clear it.
          </p>
        </>
      ),
    },
    {
      heading: 'Saved copies are yours to look after',
      content: (
        <p>
          A saved copy is one ordinary file, written by your device, holding
          everything: every book, every word, every recording and picture. It is
          not encrypted and it is not password-protected. Once it is on your
          disk, in your cloud drive or in someone's inbox, it is as private as
          the place you put it. Treat it like a diary, because that is what it
          is.
        </p>
      ),
    },
    {
      heading: 'Children',
      content: (
        <p>
          Flyleaf is not designed for or directed at children under 13, and it
          does not knowingly collect anything from anyone — of any age — because
          it does not collect anything at all. A parent who wants to look at what
          their child has kept can open the app on the child's device; there is
          no other copy to ask us for.
        </p>
      ),
    },
    {
      heading: 'Deleting everything',
      content: (
        <>
          <p>
            You do not need to ask us, and there is no request form, because
            there is nothing on our side to delete. Clearing the site data for
            Flyleaf in your browser's settings removes the whole library from
            that device, permanently and immediately. Uninstalling Flyleaf from
            your home screen does the same on most devices.
          </p>
          <p>
            This is irreversible and there is no backup on our side to restore
            from. Save a copy first if you might want the journey back.
          </p>
        </>
      ),
    },
    {
      heading: 'If you are in the UK or EU',
      content: (
        <p>
          The rights you have under the UK GDPR and the EU GDPR — to know what is
          held about you, to have it corrected, to have it erased, to take it
          with you — apply to data a service holds. Flyleaf holds none, so those
          rights are exercised through your own browser: the data is in front of
          you, you can export it in one press, and you can delete it in one. For
          anything that reaches the third parties named above, their own policies
          apply, and each of them accepts requests directly.
        </p>
      ),
    },
    {
      heading: 'Changes, and how to reach us',
      content: (
        <p>
          If this policy changes, the date at the top of the page changes with
          it, and the new version replaces this one the next time the app
          updates. Questions about privacy go to {mail}, and the person on the
          other end is {maker}.
        </p>
      ),
    },
  ],
}

const terms: Doc = {
  slug: 'terms',
  title: 'Terms',
  lede: 'The deal, in the fewest words it can honestly be put in.',
  short: [
    'Flyleaf is free, has no accounts, and is provided as it is, with no promises about it working forever.',
    'Everything you write in it is yours. We claim nothing and can read nothing.',
    'Keeping your journey safe is your job, and the app gives you one button to do it with.',
    'Tips are a thank-you, not a purchase. Nothing in Flyleaf is ever behind one.',
  ],
  body: [
    {
      heading: 'What you are agreeing to',
      content: (
        <p>
          By using Flyleaf you accept these terms. If you do not, the app is easy
          to stop using: close it, and if you have kept anything, clear the site
          data to remove it. There is no account to cancel and nothing to unwind.
        </p>
      ),
    },
    {
      heading: 'Your reading is yours',
      content: (
        <p>
          Every note, quote, highlight, recording and picture you put into
          Flyleaf belongs to you. We claim no licence over it, no right to
          publish it, and no right to look at it — and no technical means of
          doing any of the three, since none of it ever leaves your device. If
          you share something you have made, that is your decision and your
          responsibility.
        </p>
      ),
    },
    {
      heading: 'Backing up is yours to do',
      content: (
        <>
          <p>
            This is the part worth reading twice, and we would rather be blunt
            than polite about it.
          </p>
          <p>
            Because Flyleaf keeps your journey in your browser and nowhere else,
            your journey can be lost the way anything on a device can be lost.
            Clearing your browsing data will take it. So will a browser reclaiming
            storage from a site you have not opened in a long while, private or
            incognito windows closing, some "clean up my phone" tools, and a
            phone that goes into the sea. None of that reaches us and none of it
            can be undone by us. There is no copy on our side. There never was.
          </p>
          <p>
            Flyleaf gives you a saved copy in one press, in Settings. Use it, keep
            the file somewhere you trust, and make a fresh one now and then. We
            are not liable for reading lost to storage being cleared, devices
            being lost, or copies not being saved.
          </p>
        </>
      ),
    },
    {
      heading: 'Provided as it is',
      content: (
        <p>
          Flyleaf is offered free and as it is, with no warranty of any kind: no
          promise that it will be available, that it will keep working on your
          device, that it is free of faults, or that it fits any particular
          purpose. To the fullest extent the law allows, {maker} is not liable
          for any loss arising from using it, including lost data. Where the law
          does not allow a limit to be excluded, it applies only as far as it is
          allowed.
        </p>
      ),
    },
    {
      heading: 'Book information comes from elsewhere',
      content: (
        <p>
          Titles, authors, dates and covers are fetched from Open Library and
          Google Books. That information is theirs, not ours, and it is sometimes
          wrong, incomplete, or attached to the wrong edition. Flyleaf passes on
          what it is given and lets you correct it. Nothing shown about a book is
          a statement of fact by us.
        </p>
      ),
    },
    {
      heading: 'Using it fairly',
      content: (
        <p>
          Flyleaf is for your own private reading life. Do not use it to store or
          distribute anything unlawful, and do not attack, overload or attempt to
          break the service or the services it depends on. Quoting a book you are
          reading, in a private journal, for yourself, is what this app is for —
          publishing long extracts of a copyrighted work is a different act, and
          the responsibility for it is yours.
        </p>
      ),
    },
    {
      heading: 'Tips',
      content: (
        <p>
          If you leave a tip, you are thanking a person, not buying anything. No
          feature is unlocked, no limit is raised, and nothing about the app
          changes. Tips are processed by Paystack and are not refundable — please
          only send an amount you are happy to have sent. The app is free and
          stays free whether you tip or not.
        </p>
      ),
    },
    {
      heading: 'Changes, and endings',
      content: (
        <p>
          These terms may change; the date at the top of the page is how you will
          know. Flyleaf itself may change, and it may one day stop being
          published. That is the honest reason the saved copy exists: if the app
          goes away, your journey is a file you already have, and it does not go
          with it.
        </p>
      ),
    },
    {
      heading: 'Which law, and who to write to',
      content: (
        <p>
          These terms are governed by the laws of <Slot>{MAKER.place}</Slot>.
          Flyleaf is made and published by {maker}, who can be reached at {mail}.
        </p>
      ),
    },
  ],
}

const licences: Doc = {
  slug: 'licences',
  title: 'Licences & credits',
  lede: 'What Flyleaf is built out of, and who it is owed to.',
  short: [
    'Flyleaf itself, and everything drawn for it, belongs to its maker.',
    'Book information and real covers come from Open Library and Google Books, and belong to them and to the publishers.',
    'The type, the portrait set, the rabbit, the ambience recordings and the software underneath are open-licensed, and each is credited below.',
    'Covers Flyleaf draws itself are original art, made on your device.',
  ],
  body: [
    {
      heading: 'Flyleaf',
      content: (
        <p>
          © {new Date().getFullYear()} {maker}. The app, its writing, its
          drawings and its generated cover art are the maker's, and are not
          licensed for reuse except where a licence below says otherwise.
        </p>
      ),
    },
    {
      heading: 'Book information and covers',
      content: (
        <>
          <p>
            Search results, titles, authors, dates and real cover images come
            from <Out href="https://openlibrary.org/">Open Library</Out>, a
            project of the <Out href="https://archive.org/">Internet Archive</Out>,
            and from the <Out href="https://developers.google.com/books">Google Books API</Out>.
            Flyleaf uses their public interfaces under their terms of service and
            claims no ownership of what they return.
          </p>
          <p>
            Cover artwork remains the property of its publishers and artists. It
            is shown here to identify the book on your own shelf, in your own
            private library, and for no other purpose.
          </p>
        </>
      ),
    },
    {
      heading: 'Covers Flyleaf draws',
      content: (
        <p>
          When no real cover exists anywhere, Flyleaf makes one. That artwork is
          generated on your device from the book's own details, so the same book
          always gets the same cover, and the title and author are typeset by the
          app in its own fonts rather than drawn by any image model. These covers
          are original to Flyleaf.
        </p>
      ),
    },
    {
      heading: 'Faces',
      content: (
        <>
          <p>
            Every face in Flyleaf is built on your device with{' '}
            <Out href="https://www.dicebear.com/">DiceBear</Out> (MIT licence).
            Nothing is fetched from a portrait service, and no name — yours or a
            character's — leaves your device.
          </p>
          <ul>
            <li>
              Character portraits use the{' '}
              <Out href="https://avataaars.com/">Avataaars</Out> set by Pablo
              Stanley, free for personal and commercial use.
            </li>
            <li>
              The face you pick for yourself uses the{' '}
              <Out href="https://www.dicebear.com/styles/adventurer/">
                Adventurer
              </Out>{' '}
              set by Lisa Wischofsky, licensed{' '}
              <Out href="https://creativecommons.org/licenses/by/4.0/">
                CC BY 4.0
              </Out>
              .
            </li>
          </ul>
        </>
      ),
    },
    {
      heading: 'The rabbit, and the reader on the sofa',
      content: (
        <p>
          The rabbit who sits on the empty shelves, and the reader who lies
          along the sofa in the nook with her dog, are free animations from{' '}
          <Out href="https://lottiefiles.com/">LottieFiles</Out>, used under the{' '}
          <Out href="https://lottiefiles.com/page/license">
            Lottie Simple Licence
          </Out>
          , which allows them here and does not require this credit. The
          rabbit's poses — waving, thinking, dozing — and the reader's Flyleaf
          colours are Flyleaf's own work on the artists' rigs; the drawings
          themselves remain theirs.
        </p>
      ),
    },
    {
      heading: 'Sound',
      content: (
        <>
          <p>
            The reading nook can play rain and a fire. Both are recordings,
            licensed for use inside an app like this one; the room tone
            underneath them is made by Flyleaf as you listen, out of nothing
            but filtered noise, and is not a recording of anywhere.
          </p>
          <ul>
            <li>
              The rain — from{' '}
              <Out href="https://mixkit.co/free-sound-effects/">Mixkit</Out>,
              under the{' '}
              <Out href="https://mixkit.co/license/#sfxFree">
                Mixkit Sound Effects Free Licence
              </Out>
              .
            </li>
            <li>
              The fire — from{' '}
              <Out href="https://pixabay.com/sound-effects/">Pixabay</Out>, under
              the{' '}
              <Out href="https://pixabay.com/service/license-summary/">
                Pixabay Content Licence
              </Out>
              .
            </li>
          </ul>
          <p>
            Both licences allow the sounds to be built into Flyleaf and neither
            allows them to be handed on as sound files on their own, so they are
            here to listen to and not to take.
          </p>
        </>
      ),
    },
    {
      heading: 'Type',
      content: (
        <>
          <p>
            Three faces, all under the{' '}
            <Out href="https://openfontlicense.org/">SIL Open Font Licence 1.1</Out>,
            served from Flyleaf's own files rather than a font network:
          </p>
          <ul>
            <li>Quicksand — everything you read as words, and the app's own labels, buttons and rows</li>
            <li>EB Garamond — headings: page titles, book titles, your name</li>
            <li>Kalam — the handwriting on your own notes</li>
          </ul>
          <p>
            Packaged by <Out href="https://fontsource.org/">Fontsource</Out>.
          </p>
        </>
      ),
    },
    {
      heading: 'Software',
      content: (
        <ul>
          <li>
            <Out href="https://react.dev/">React</Out> and{' '}
            <Out href="https://reactrouter.com/">React Router</Out> — MIT
          </li>
          <li>
            <Out href="https://dexie.org/">Dexie</Out> and dexie-react-hooks —
            Apache 2.0
          </li>
          <li>
            <Out href="https://vite.dev/">Vite</Out> and{' '}
            <Out href="https://vite-pwa-org.netlify.app/">vite-plugin-pwa</Out>{' '}
            with <Out href="https://developer.chrome.com/docs/workbox">Workbox</Out>{' '}
            — MIT
          </li>
          <li>
            <Out href="https://github.com/airbnb/lottie-web">lottie-web</Out>,
            which plays the rabbit — MIT
          </li>
          <li>
            Hosted on <Out href="https://vercel.com/">Vercel</Out>; tips
            processed by <Out href="https://paystack.com/">Paystack</Out>
          </li>
        </ul>
      ),
    },
    {
      heading: 'Everything else',
      content: (
        <p>
          The sky, the paper, the thread, the leaf, the orb and every word in the
          interface were made for Flyleaf. If you think something here is yours
          and is not credited, write to {mail} and it will be fixed or removed.
        </p>
      ),
    },
  ],
}

export const DOCS: Doc[] = [privacy, terms, licences]

export function findDoc(slug: string | undefined) {
  return DOCS.find((doc) => doc.slug === slug)
}
