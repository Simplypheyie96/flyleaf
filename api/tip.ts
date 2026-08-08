/* The tip jar's server half.

   THE ONE RULE IN THIS FILE: the Paystack secret key never leaves it. It is
   read from the environment at request time, used to sign two calls to
   Paystack, and never returned, logged, or echoed into any response. There is
   no code path here that puts it in a redirect, an error body, or a header
   that goes back to the browser. Nothing in `src/` knows it exists.

   That is also why the amount is decided here rather than in the page. A
   browser-initialised payment means the browser names the price, and a browser
   can be told to name any price at all; the number arriving from the page is
   checked against a floor and a ceiling before it is ever sent on. And the
   payment is confirmed by asking Paystack directly on the way back — a client
   returning from a checkout is not evidence that it paid, only that it came
   back.

   Nothing is stored. There is no account behind a tip, no row written, no
   supporter record: Paystack has the receipt, the builder has the payout, and
   Flyleaf keeps being an app that holds nothing about anybody. */

/* One Vercel function, on the default Node runtime, written against the web
   Request/Response signature so there is nothing platform-shaped in it beyond
   the file's location. Both halves of the flow live here — open a checkout,
   confirm a checkout — because they are the same secret used twice, and one
   file is one place to audit. */

const PAYSTACK = 'https://api.paystack.co'

/* What a tip can be, per currency: the three amounts the page offers, and the
   range anything typed by hand has to fall inside. The ceiling is not a limit
   on generosity; it is the difference between a mistyped amount and a caught
   one. Presets aim at "a coffee, a good coffee, more than a coffee" priced
   for each place, not at exchange-rate equality — a tidy $2 beats $1.37.

   Every currency here uses two-decimal minor units, so the ×100 in `start`
   holds for all of them. A currency that does not (XOF has no minor unit)
   must NOT be added to this table without changing that line. */
const CURRENCIES = {
  NGN: { presets: [1000, 2500, 5000], floor: 200, ceiling: 500_000 },
  USD: { presets: [2, 5, 10], floor: 1, ceiling: 500 },
  GHS: { presets: [15, 40, 75], floor: 5, ceiling: 5_000 },
  ZAR: { presets: [20, 50, 100], floor: 10, ceiling: 10_000 },
  KES: { presets: [150, 400, 800], floor: 50, ceiling: 50_000 },
} as const

type Currency = keyof typeof CURRENCIES

/* Which of those THIS Paystack account can actually settle. A Paystack
   merchant takes only the currencies enabled on their dashboard, and an
   initialize call in any other one is refused — so the list lives in an
   environment variable next to the key it belongs to, and defaults to the
   one every Nigerian account has. Add `PAYSTACK_CURRENCIES=NGN,USD` in the
   Vercel dashboard once the account can take dollars; nothing else changes. */
function allowed(): Currency[] {
  const said = (process.env.PAYSTACK_CURRENCIES ?? 'NGN')
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter((code): code is Currency => code in CURRENCIES)
  return said.length ? said : ['NGN']
}

/* The currency a reader in each country would expect to see. Everyone else
   gets dollars when the account can take them — the one currency a reader
   anywhere can price a coffee in — and naira otherwise, which is at least
   honest about whose jar this is. */
const AT_HOME: Record<string, Currency> = { NG: 'NGN', GH: 'GHS', ZA: 'ZAR', KE: 'KES' }

function currencyFor(country: string | null): Currency {
  const can = allowed()
  // No country header means local dev or a proxy that stripped it — the jar's
  // home currency, not a guess.
  const wants: Currency = country ? (AT_HOME[country.toUpperCase()] ?? 'USD') : 'NGN'
  if (can.includes(wants)) return wants
  if (can.includes('USD')) return 'USD'
  return can.includes('NGN') ? 'NGN' : can[0]
}

/** What the page should offer this reader: decided here, from the request's
    country, so the amount on the button is always an amount this account can
    charge. Vercel stamps `x-vercel-ip-country` on every request; the page
    never guesses a currency on its own. */
function offer(request: Request) {
  const code = currencyFor(request.headers.get('x-vercel-ip-country'))
  return json({ currency: code, ...CURRENCIES[code] })
}

/* Where the supporter is sent back to. The request's own origin is derived
   from the Host header, which a caller controls, so a forged one would hand
   Paystack somebody else's address to return the reader to. Nothing secret
   rides on that redirect, but the fix is one environment variable, so: use the
   deployment Vercel knows about when there is one, and only fall back to the
   request when running somewhere that has no opinion (`vercel dev`). */
function home(origin: string) {
  const known = process.env.TIP_RETURN_ORIGIN ?? process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (!known) return origin
  return known.startsWith('http') ? known : `https://${known}`
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      // A tip is a one-off exchange; nothing about it should ever be reused.
      'cache-control': 'no-store',
    },
  })
}

async function ask(path: string, key: string, init?: RequestInit) {
  const reply = await fetch(`${PAYSTACK}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      ...init?.headers,
    },
  })
  return (await reply.json()) as {
    status?: boolean
    message?: string
    data?: Record<string, unknown>
  }
}

/** Open a checkout. Returns only the URL to send the supporter to. */
async function start(request: Request, origin: string, key: string) {
  let body: { amount?: unknown; email?: unknown; currency?: unknown }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return json({ error: 'Could not read that.' }, 400)
  }

  /* The page sends back the currency it DISPLAYED, and that is the one that
     gets charged — deciding it again here from the country header could
     silently charge a different currency than the button named, if the
     reader's network moved between the offer and the tap. It still has to be
     one this account takes; the amounts are still checked against that
     currency's own range. */
  const code = String(body.currency ?? 'NGN').toUpperCase() as Currency
  if (!(code in CURRENCIES) || !allowed().includes(code)) {
    return json({ error: 'That currency is not one this jar can take.' }, 400)
  }
  const { floor, ceiling } = CURRENCIES[code]

  const amount = Number(body.amount)
  if (!Number.isInteger(amount) || amount < floor || amount > ceiling) {
    return json(
      {
        error: `Choose an amount between ${floor.toLocaleString()} and ${ceiling.toLocaleString()} ${code}.`,
      },
      400,
    )
  }

  // Paystack requires an address to send the receipt to. It is the only thing
  // asked for, it goes straight to Paystack, and Flyleaf never keeps it.
  const email = String(body.email ?? '').trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return json({ error: 'That email address does not look right.' }, 400)
  }

  const reply = await ask('/transaction/initialize', key, {
    method: 'POST',
    body: JSON.stringify({
      email,
      // Paystack counts in minor units — kobo, cents, pesewas. Every
      // currency in the table above has two-decimal minor units, so ×100
      // is right for all of them; see the table's note before adding one
      // that does not.
      amount: amount * 100,
      currency: code,
      // Where Paystack sends them afterwards. It appends the reference itself.
      callback_url: `${home(origin)}/settings`,
      metadata: { purpose: 'Flyleaf tip jar' },
    }),
  })

  const url = reply.data?.authorization_url
  if (!reply.status || typeof url !== 'string') {
    // Paystack's own message is safe to pass on — it is about the request, not
    // about the key.
    return json({ error: reply.message ?? 'Paystack could not open a checkout.' }, 502)
  }

  return json({ url })
}

/** Ask Paystack whether a reference was actually paid. */
async function verify(reference: string, key: string) {
  if (!reference || reference.length > 128) {
    return json({ error: 'No payment to check.' }, 400)
  }

  const reply = await ask(`/transaction/verify/${encodeURIComponent(reference)}`, key)
  const paid = reply.status === true && reply.data?.status === 'success'
  const amount = Number(reply.data?.amount ?? 0)

  /* Deliberately narrow. The verify response carries the supporter's name,
     email, card bin, IP and more; none of that is Flyleaf's business, so the
     page is told the three facts it needs to say thank you and nothing else —
     the currency included, so the thank-you names the amount in the money it
     was actually given in. */
  return json({
    paid,
    amount: paid ? Math.round(amount / 100) : 0,
    currency: typeof reply.data?.currency === 'string' ? reply.data.currency : 'NGN',
  })
}

export default async function handler(request: Request) {
  const key = process.env.PAYSTACK_SECRET_KEY
  // No key configured is not an error worth explaining — the tip jar is simply
  // not switched on for this deployment.
  if (!key) return json({ error: 'The tip jar is not set up here.' }, 503)

  /* `request.url` arrives here as a PATH, not a URL — Vercel's Node runtime
     hands the handler `/api/tip`, and `new URL()` on a relative string throws
     ERR_INVALID_URL before a single Paystack call is made. The host header is
     the only place the origin actually lives, so it becomes the base. The
     fallback is only there so a malformed request cannot take the endpoint
     down; `home()` still prefers the configured origin over this one. */
  const host = request.headers.get('host') ?? 'flyleaf-app.vercel.app'
  const url = new URL(request.url, `https://${host}`)

  if (request.method === 'POST') return start(request, url.origin, key)
  if (request.method === 'GET') {
    // With a reference it is a payment being checked; without one it is the
    // page asking what to offer this reader.
    const reference = url.searchParams.get('reference')
    return reference ? verify(reference, key) : offer(request)
  }
  return json({ error: 'Not a thing this does.' }, 405)
}
