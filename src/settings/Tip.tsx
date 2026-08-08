import { useEffect, useState } from 'react'
import LeafButton from '../components/LeafButton'
import { Row } from './Group'
import Sheet from '../components/Sheet'
import Sparkle from '../components/Sparkle'
import { CloseIcon } from '../components/TabIcons'
import card from './settings.module.css'
import styles from './tip.module.css'

/* An invitation, never a gate.

   Flyleaf is free and stays free; there is nothing behind this card and
   nothing withheld from anyone who scrolls past it. So it asks once, in one
   sentence, in the reader's own settings where they came looking — no banner,
   no interstitial, no second ask on the way out of a book.

   And it asks with ONE control. An amount, a second amount, a third, a box to
   type a fourth, an email field and a send button is a checkout, and a
   checkout sitting open in the settings of a free app is a shop counter in
   somebody's living room. All of that machinery still exists — it just waits
   behind the button, in the same glass sheet the install guide uses, where a
   reader who has decided to give something will happily meet it.

   The card is absent entirely unless the deployment has a tip jar configured.
   A support card that opens onto an error is worse than no support card.

   Every number here is checked again on the server, and the payment is
   confirmed by asking Paystack rather than by trusting the browser that came
   back saying it paid. The secret key lives in `api/tip.ts` and has no route
   into this file. */

const ON = import.meta.env.VITE_TIP_JAR === '1'

/* Read by the page so it can leave out the whole group — caption and card —
   rather than printing an empty box under a heading nobody can act on. */
export const TIP_JAR = ON

/* Naira. Three amounts that read as "a coffee, a good coffee, and more than a
   coffee" without being labelled with those words — a tier called "generous"
   quietly tells everyone who picked the first one what they are. */
const PRESETS = [1000, 2500, 5000]

const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`

/** Everything api/tip ever answers with, across both of its two calls. */
interface Answer {
  url?: string
  error?: string
  paid?: boolean
  amount?: number
}

/** What the server said, or why it could not be read. */
type Said = { got: 'offline' } | { got: 'broken' } | { got: 'reply'; ok: boolean; body: Answer }

/* A reply that is not JSON is not a connection problem.

   This cost a real evening. A crashed function on Vercel answers with a
   PLAIN-TEXT 500, so `response.json()` throws on the body — and that throw
   used to land in the same catch as a genuinely dead network, which told the
   reader to check a connection that was perfectly fine. Being told the wrong
   cause of a failure is worse than being told nothing: it spends somebody's
   time ruling out the one thing that was never wrong.

   So the three ways this can fail are kept apart. `fetch` rejecting is the
   only one that means the device never got out to the network. A reply that
   arrives but does not parse is our end falling over. And a parsed reply is
   the server talking, whatever it has to say. */
async function askServer(path: string, init?: RequestInit): Promise<Said> {
  let reply: Response
  try {
    reply = await fetch(path, init)
  } catch {
    return { got: 'offline' }
  }

  const text = await reply.text()
  try {
    return { got: 'reply', ok: reply.ok, body: JSON.parse(text) as Answer }
  } catch {
    return { got: 'broken' }
  }
}

type Stage =
  | { at: 'asking' }
  | { at: 'opening' }
  | { at: 'checking' }
  | { at: 'thanks'; amount: number }
  | { at: 'stuck'; why: string }

function Tip() {
  const [open, setOpen] = useState(false)
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
    void askServer(`/api/tip?reference=${encodeURIComponent(reference)}`).then((said) => {
      /* The careful one. A reader is standing here having just typed their
         card into Paystack, so "we could not check" must never be worded as
         "it did not work" — the money may well have moved. Only Paystack
         answering a flat no is allowed to say nothing was taken. */
      if (said.got !== 'reply' || !said.ok) {
        setStage({
          at: 'stuck',
          why: 'Could not check that payment just now. If it went through, Paystack has emailed you a receipt.',
        })
        return
      }
      setStage(
        said.body.paid
          ? { at: 'thanks', amount: said.body.amount ?? 0 }
          : { at: 'stuck', why: 'That payment did not go through. Nothing was taken.' },
      )
    })
  }, [])

  /* A failure on the way back has no sheet to appear in — the reader arrived
     from Paystack, not from the button — so it opens one for them. */
  useEffect(() => {
    if (stage.at === 'stuck') setOpen(true)
  }, [stage.at])

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
    const said = await askServer('/api/tip', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount: chosen, email: email.trim() }),
    })

    /* Nothing has been taken in any of these — the checkout has not opened
       yet, so nobody has typed a card number. Each one says so, because the
       first thing a person wonders when a payment screen fails is whether it
       failed after taking the money. */
    if (said.got === 'offline') {
      setStage({ at: 'stuck', why: 'No connection. Nothing has been taken — try again once you are back online.' })
      return
    }
    if (said.got === 'broken') {
      setStage({
        at: 'stuck',
        why: 'Flyleaf’s own end of the tip jar is not answering. Nothing has been taken — this one is the maker’s to fix.',
      })
      return
    }
    if (!said.ok || !said.body.url) {
      setStage({ at: 'stuck', why: said.body.error ?? 'Could not open Paystack just now.' })
      return
    }
    window.location.href = said.body.url
  }

  /* Afterwards the card stops asking. Somebody who has just given something
     should not be looking at the same invitation they answered. */
  if (stage.at === 'thanks') {
    return (
      <Row
        title="Thank you"
        control={stage.amount ? <span className={card.value}>{naira(stage.amount)}</span> : undefined}
      >
        <span className={styles.thanks}>
          <Sparkle size={18} className={styles.spark} />
          <span className={styles.warm}>That keeps Flyleaf free for everyone else.</span>
        </span>
      </Row>
    )
  }

  const busy = stage.at === 'opening' || stage.at === 'checking'

  return (
    <>
      {/* One row, and the whole checkout behind it. Not "buy the maker a
          coffee" — the caption above this card already says whose coffee it
          is, and a row repeating its own group's words reads as a stutter. */}
      <button
        type="button"
        className={card.action}
        onClick={() => {
          setStage({ at: 'asking' })
          setOpen(true)
        }}
      >
        Buy a coffee
        <span className={card.linkHint} aria-hidden="true">
          ›
        </span>
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        label="Buy the maker a coffee"
        name="tip-jar"
      >
        <div className={styles.jar}>
          <header className={styles.head}>
            <div className={styles.headLine}>
              <h2 className={styles.title} id="tip-jar">
                Buy the maker a coffee
              </h2>
              <button
                type="button"
                className={styles.close}
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <CloseIcon size={20} />
              </button>
            </div>
            <p className={styles.lede}>
              Pick an amount, and Paystack takes it from there.
            </p>
          </header>

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
            <p className={card.note} data-tone="bad" role="status">
              {stage.why}
            </p>
          )}

          <p className={card.fine}>
            Paystack handles the payment and the card details — Flyleaf never sees
            them, and keeps nothing about you afterwards. Your email goes to
            Paystack for the receipt and no further. Tips are a thank-you, not a
            purchase, and are not refundable.
          </p>
        </div>
      </Sheet>
    </>
  )
}

export default Tip
