import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import LeafButton from '../components/LeafButton'
import Sheet from '../components/Sheet'
import { CharacterIcon, CloseIcon, CycleIcon, FairCopyIcon, ShelfIcon, VoiceIcon } from '../components/TabIcons'
import type { EntryType } from '../data/db'
import { Row } from '../settings/Group'
import card from '../settings/settings.module.css'
import tip from '../settings/tip.module.css'
import { ios } from './platform'
import { askUnlock, buy, giveTip, prices, restore, TIPS, tipPrices, useUnlock, type Ask, type Reason, type Tip } from './unlock'

/* The store apps' one sheet for buying. It opens from a gate (a fourth book, a
   locked kind of keep, the printed journal, sync) or from Settings, and it is
   built from the tip jar's furniture so it looks like the rest of Settings. Only
   ever mounted when `native`; see App.tsx. */

const TIER: Record<Tip, string> = { tip1: 'Small tip', tip2: 'Kind tip', tip3: 'Generous tip' }

/* The title says back what was tapped, so the sheet answers the reader's own
   question before it lists anything else. */
const TITLE: Record<Reason, string> = {
  books: 'More books open with the unlock',
  kind: 'This opens with the unlock',
  export: 'The printed journal opens with the unlock',
  sync: 'Sync opens with the unlock',
  settings: 'The whole journal',
}
const KIND_TITLE: Partial<Record<EntryType, string>> = {
  voice: 'Voice memos open with the unlock',
  character: 'Characters open with the unlock',
  place: 'Places open with the unlock',
  thread: 'Threads open with the unlock',
}

/* Everything the one purchase opens, whichever gate the sheet came from. */
const OPENS = [
  { Icon: ShelfIcon, title: 'Every book, not only the first' },
  { Icon: VoiceIcon, title: 'Voice memos' },
  { Icon: CharacterIcon, title: 'Characters, places and threads' },
  { Icon: FairCopyIcon, title: 'The printed journal' },
  { Icon: CycleIcon, title: 'Sync between your devices' },
]

export default function UnlockSheet() {
  const [ask, setAsk] = useState<Ask | null>(null)
  const [price, setPrice] = useState<Awaited<ReturnType<typeof prices>>>({})
  const [tips, setTips] = useState<Partial<Record<Tip, string>>>({})
  const [busy, setBusy] = useState<'unlock' | Tip | 'restore' | null>(null)
  const [note, setNote] = useState<string>()
  const { full } = useUnlock()

  useEffect(() => {
    const open = (e: Event) => {
      setNote(undefined)
      setAsk((e as CustomEvent<Ask>).detail)
    }
    window.addEventListener('flyleaf-unlock', open)
    return () => window.removeEventListener('flyleaf-unlock', open)
  }, [])

  // Once unlocked the sheet offers tips, so it asks for their prices instead.
  useEffect(() => {
    if (!ask) return
    if (full) void tipPrices().then(setTips).catch(() => setNote('Tips are unavailable right now. Please try again later.'))
    else void prices().then(setPrice).catch(() => setNote('Could not reach the store. Check your connection.'))
  }, [ask, full])

  async function run(which: NonNullable<typeof busy>, job: () => Promise<boolean>, done: string) {
    setBusy(which)
    setNote(which === 'restore' ? 'Checking with the store…' : 'Opening the store…')
    try {
      if (await job()) {
        setNote(done)
        // A tip leaves the sheet open, so another can follow.
        if (!which.startsWith('tip')) window.setTimeout(() => setAsk(null), 1400)
      } else setNote((n) => (n === 'Checking with the store…' || n === 'Opening the store…' ? undefined : n))
    } catch (e) {
      setNote((e as Error).message || 'The store could not finish that. Try again in a moment.')
    } finally {
      setBusy(null)
    }
  }

  // A store sheet is up while busy: closing now would lose its answer.
  const close = () => {
    if (!busy) setAsk(null)
  }

  return (
    <Sheet open={ask !== null} onClose={close} label="Unlock Flyleaf" name="unlock">
      <div className={tip.jar}>
        <header className={tip.head}>
          <div className={tip.headLine}>
            <h2 className={tip.title} id="unlock">
              {full ? 'Unlocked' : ask && ((ask.kind && KIND_TITLE[ask.kind]) || TITLE[ask.reason])}
            </h2>
            <button type="button" className={tip.close} onClick={close} aria-label="Close">
              <CloseIcon size={20} />
            </button>
          </div>
          {!full && (
            <>
              {ask?.reason === 'books' && (
                <p className={tip.lede}>The free journal holds one book. Every book you have stays yours.</p>
              )}
              <p className={tip.lede}>The same purchase opens all of it, for good. No subscription.</p>
            </>
          )}
        </header>

        {full ? (
          <>
            <p className={card.note}>
              Everything is open. If Flyleaf has earned a thank-you, you can leave a tip. It opens
              nothing more.
            </p>
            <div className={tip.amounts}>
              {TIPS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={tip.amount}
                  disabled={!!busy}
                  onClick={() => void run(t, () => giveTip(t), 'Thank you for the tip. It means a lot.')}
                >
                  {busy === t ? 'Opening the store…' : `${TIER[t]}${tips[t] ? ` · ${tips[t]}` : ''}`}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <ul className={tip.opens}>
              {OPENS.map(({ Icon, title }) => (
                <li key={title}>
                  <Icon size={20} />
                  {title}
                </li>
              ))}
            </ul>
            <div className={card.row}>
              <LeafButton disabled={!!busy} onClick={() => void run('unlock', () => buy('unlock'), 'Unlocked. Thank you.')}>
                {busy === 'unlock' ? 'Opening the store…' : `Unlock${price.unlock ? ` · ${price.unlock}` : ''}`}
              </LeafButton>
              <button type="button" className={`${card.action} ${tip.restore}`} disabled={!!busy} onClick={close}>
                Not now
              </button>
            </div>
          </>
        )}

        <button
          type="button"
          className={`${card.action} ${tip.restore}`}
          disabled={!!busy}
          onClick={() =>
            void run('restore', async () => {
              const found = await restore()
              if (found) return true
              if (found === false) setNote('No purchase found for this store account.')
              return false
            }, 'Restored. Everything is open.')
          }
        >
          {busy === 'restore' ? 'Checking…' : 'Restore purchases'}
        </button>

        {/* Always mounted, so VoiceOver hears every change to it. */}
        <p className={card.note} role="status" aria-live="polite">
          {note}
        </p>

        <p className={card.fine}>
          {full && 'Tips are optional and open nothing. '}Payment goes through your{' '}
          {ios ? 'App Store' : 'Google Play'} account.
        </p>
        <p className={card.fine}>
          <Link to="/legal/terms" onClick={close}>Terms of Use</Link> ·{' '}
          <Link to="/legal/privacy" onClick={close}>Privacy</Link>
        </p>
      </div>
    </Sheet>
  )
}

/** The Settings row: where the reader stands, and the way to the sheet. */
export function UnlockRow() {
  const { owned } = useUnlock()
  const status = owned.length ? 'Unlocked' : 'Free'
  return (
    <>
      <Row title="Flyleaf" control={<span className={card.value}>{status}</span>} />
      <button type="button" className={card.action} onClick={() => askUnlock('settings')}>
        {owned.length ? 'Restore or support' : 'Unlock the whole journal'}
        <span className={card.linkHint} aria-hidden="true">
          ›
        </span>
      </button>
    </>
  )
}
