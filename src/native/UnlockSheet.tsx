import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import LeafButton from '../components/LeafButton'
import Sheet from '../components/Sheet'
import { CloseIcon } from '../components/TabIcons'
import { Row } from '../settings/Group'
import card from '../settings/settings.module.css'
import tip from '../settings/tip.module.css'
import { ios } from './platform'
import { askUnlock, buy, prices, restore, useUnlock, type Reason } from './unlock'

/* The store apps' one sheet for buying. It opens from a gate (a fourth book, a
   locked kind of keep, the printed journal, sync) or from Settings, and it is
   built from the tip jar's furniture so it looks like the rest of Settings. Only
   ever mounted when `native`; see App.tsx. */

const WHY: Record<Reason, string> = {
  books: "The free journal holds one book. Every book you have stays yours.",
  kind: 'Voice memos, characters, places and threads come with the unlock.',
  export: 'The printed journal and sharing come with the unlock.',
  sync: 'Sync comes with the unlock.',
  settings: 'One purchase, once. No subscription.',
}

export default function UnlockSheet() {
  const [reason, setReason] = useState<Reason | null>(null)
  const [price, setPrice] = useState<Awaited<ReturnType<typeof prices>>>({})
  const [busy, setBusy] = useState<'unlock' | 'supporter' | 'restore' | null>(null)
  const [note, setNote] = useState<string>()
  const { owned, full } = useUnlock()

  useEffect(() => {
    const open = (e: Event) => {
      setNote(undefined)
      setReason((e as CustomEvent<Reason>).detail)
    }
    window.addEventListener('flyleaf-unlock', open)
    return () => window.removeEventListener('flyleaf-unlock', open)
  }, [])

  useEffect(() => {
    if (reason) void prices().then(setPrice).catch(() => setNote('Could not reach the store. Check your connection.'))
  }, [reason])

  async function run(which: NonNullable<typeof busy>, job: () => Promise<boolean>, done: string) {
    setBusy(which)
    setNote(which === 'restore' ? 'Checking with the store…' : 'Opening the store…')
    try {
      if (await job()) {
        setNote(done)
        window.setTimeout(() => setReason(null), 1400)
      } else setNote((n) => (n === 'Checking with the store…' || n === 'Opening the store…' ? undefined : n))
    } catch (e) {
      setNote((e as Error).message || 'The store could not finish that. Try again in a moment.')
    } finally {
      setBusy(null)
    }
  }

  // A store sheet is up while busy: closing now would lose its answer.
  const close = () => {
    if (!busy) setReason(null)
  }

  return (
    <Sheet open={reason !== null} onClose={close} label="Unlock Flyleaf" name="unlock">
      <div className={tip.jar}>
        <header className={tip.head}>
          <div className={tip.headLine}>
            <h2 className={tip.title} id="unlock">
              The whole journal
            </h2>
            <button type="button" className={tip.close} onClick={close} aria-label="Close">
              <CloseIcon size={20} />
            </button>
          </div>
          <p className={tip.lede}>{reason && WHY[reason]}</p>
          <p className={tip.lede}>
            Unlimited books, voice memos, characters, places and threads, the printed journal, and
            sync between your devices.
          </p>
        </header>

        {full && (
          <p className={card.note} role="status">
            {owned.includes('supporter')
              ? 'Everything is open. Thank you for supporting Flyleaf.'
              : 'Everything is open on this account.'}
          </p>
        )}

        {/* Bought things go, not grey out: a disabled price still read as a
            button. Supporter stays on after Unlock, as a tip. */}
        <div className={card.row}>
          {!full && (
            <LeafButton disabled={!!busy} onClick={() => void run('unlock', () => buy('unlock'), 'Unlocked. Thank you.')}>
              {busy === 'unlock' ? 'Opening the store…' : `Unlock${price.unlock ? ` · ${price.unlock}` : ''}`}
            </LeafButton>
          )}
          {!owned.includes('supporter') && (
            <button
              type="button"
              className={tip.amount}
              disabled={!!busy}
              onClick={() =>
                void run(
                  'supporter',
                  () => buy('supporter'),
                  full ? 'Thank you for supporting Flyleaf.' : 'Unlocked. Thank you for the extra.',
                )
              }
            >
              {busy === 'supporter'
                ? 'Opening the store…'
                : `${full ? 'Support Flyleaf' : 'Supporter'}${price.supporter ? ` · ${price.supporter}` : ''}`}
            </button>
          )}
        </div>

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
          Unlock and Supporter open exactly the same things; Supporter pays a little more toward
          keeping Flyleaf going. Payment goes through your {ios ? 'App Store' : 'Google Play'}{' '}
          account.
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
  const status = owned.includes('supporter') ? 'Supporter' : owned.length ? 'Unlocked' : 'Free'
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
