import { useEffect, useState } from 'react'
import PaperSurface from '../components/PaperSurface'
import LeafButton from '../components/LeafButton'
import Sparkle from '../components/Sparkle'
import card from './settings.module.css'
import styles from './tip.module.css'

/* An invitation, never a gate.

   Flyleaf is free and stays free; there is nothing behind this card and
   nothing withheld from anyone who scrolls past it. So it asks once, in one
   sentence, in the reader's own settings where they came looking — no banner,
   no interstitial, no second ask on the way out of a book.

   The card is absent entirely unless the deployment has a tip jar configured.
   A support card that opens onto an error is worse than no support card.

   Every number here is checked again on the server, and the payment is
   confirmed by asking Paystack rather than by trusting the browser that came
   back saying it paid. The secret key lives in `api/tip.ts` and has no route
   into this file. */

const ON = import.meta.env.VITE_TIP_JAR === '1'

/* Naira. Three amounts that read as "a coffee, a good coffee, and more than a
   coffee" without being labelled with those words — a tier called "generous"
   quietly tells everyone who picked the first one what they are. */
const PRESETS = [1000, 2500, 5000]

const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`

type Stage =
  | { at: 'asking' }
  | { at: 'opening' }
  | { at: 'checking' }
  | { at: 'thanks'; amount: number }
  | { at: 'stuck'; why: string }

function Tip() {
  const [stage, setStage] = useState<Stage>({ at: 'asking' })
  const [amount, setAmount] = useState(PRESETS[1])
  const [custom, setCustom] = useState('')
  const [email, setEmail] = useState('')

  /* Coming back from checkout. Paystack returns the supporter to /settings
     with its reference on the query string; the reference is worth nothing on
     its own, so it is handed to the server, swapped for a yes or a no, and
     wiped from the address bar either way — nobody wants a payment reference
     living in their history. */
  useEffect(() => {
    if (!ON) return
    const here = new URL(window.location.href)
    const reference = here.searchParams.get('reference') ?? here.searchParams.get('trxref')
    if (!reference) return

    here.searchParams.delete('reference')
    here.searchParams.delete('trxref')
    window.history.replaceState(null, '', here.pathname + here.search)

    setStage({ at: 'checking' })
    fetch(`/api/tip?reference=${encodeURIComponent(reference)}`)
      .then((r) => r.json())
      .then((out: { paid?: boolean; amount?: number }) => {
        setStage(
          out.paid
            ? { at: 'thanks', amount: out.amount ?? 0 }
            : { at: 'stuck', why: 'That payment did not go through. Nothing was taken.' },
        )
      })
      .catch(() =>
        setStage({ at: 'stuck', why: 'Could not reach Paystack to check. Try again in a moment.' }),
      )
  }, [])

  if (!ON) return null

  const chosen = custom ? Number(custom) : amount

  async function send() {
    /* Checked here rather than by grey-ing the button out. A primary action
       that is dead on arrival reads as a broken card, and "why can I not press
       this" is a worse first impression than one sentence after pressing it.
       The server checks both of these again regardless. */
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setStage({ at: 'stuck', why: 'Paystack needs an email to send the receipt to.' })
      return
    }
    if (!Number.isInteger(chosen) || chosen < 200 || chosen > 500000) {
      setStage({ at: 'stuck', why: 'Pick an amount between ₦200 and ₦500,000.' })
      return
    }

    setStage({ at: 'opening' })
    try {
      const reply = await fetch('/api/tip', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount: chosen, email: email.trim() }),
      })
      const out = (await reply.json()) as { url?: string; error?: string }
      if (!reply.ok || !out.url) {
        setStage({ at: 'stuck', why: out.error ?? 'Could not open Paystack just now.' })
        return
      }
      window.location.href = out.url
    } catch {
      setStage({ at: 'stuck', why: 'Could not reach Paystack. Check your connection.' })
    }
  }

  if (stage.at === 'thanks') {
    return (
      <PaperSurface className={`${card.section} ${styles.thanks}`}>
        <Sparkle size={18} className={styles.spark} />
        <h2 className={card.sectionTitle}>Thank you</h2>
        <p className={styles.warm}>
          {stage.amount ? `${naira(stage.amount)} — ` : ''}that genuinely helps, and it
          keeps Flyleaf free for everyone else. Back to your books.
        </p>
      </PaperSurface>
    )
  }

  const busy = stage.at === 'opening' || stage.at === 'checking'

  return (
    <PaperSurface className={card.section}>
      <div className={card.sectionHead}>
        <h2 className={card.sectionTitle} id="tip-jar">
          Buy the maker a coffee
        </h2>
        <span className={card.sectionHint}>
          Flyleaf is free, has no ads, and is made by one person. If it has kept your
          reading well, you can say so with a coffee. Nothing here is ever locked.
        </span>
      </div>

      <div className={styles.amounts} role="group" aria-labelledby="tip-jar">
        {PRESETS.map((each) => (
          <button
            key={each}
            type="button"
            className={styles.amount}
            aria-pressed={!custom && each === amount}
            onClick={() => {
              setCustom('')
              setAmount(each)
            }}
          >
            {naira(each)}
          </button>
        ))}
        <input
          type="number"
          inputMode="numeric"
          className={styles.other}
          value={custom}
          min={200}
          max={500000}
          placeholder="Another amount"
          aria-label="Another amount, in naira"
          onChange={(e) => setCustom(e.target.value)}
        />
      </div>

      <label className={styles.field}>
        <span className={styles.fieldName}>Email for the receipt</span>
        <input
          type="email"
          className={card.field}
          value={email}
          autoComplete="email"
          placeholder="you@example.com"
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <div className={card.row}>
        <LeafButton onClick={() => void send()} disabled={busy}>
          {stage.at === 'checking'
            ? 'Checking…'
            : stage.at === 'opening'
              ? 'Opening Paystack…'
              : chosen > 0
                ? `Send ${naira(chosen)}`
                : 'Send a tip'}
        </LeafButton>
      </div>

      {stage.at === 'stuck' && (
        <p className={card.note} data-tone="bad">
          {stage.why}
        </p>
      )}

      <p className={card.fine}>
        Paystack handles the payment and the card details — Flyleaf never sees them,
        and keeps nothing about you afterwards. Your email goes to Paystack for the
        receipt and no further. Tips are a thank-you, not a purchase, and are not
        refundable.
      </p>
    </PaperSurface>
  )
}

export default Tip
