/* HOW MANY PEOPLE OPEN FLYLEAF, AND NOTHING WHATSOEVER BEYOND THAT.

   For the first week after launch nothing was counting. The domain's DNS is
   answered by Cloudflare, so Cloudflare's DNS panel shows plenty of lookups,
   but the record points straight at Vercel and no request ever passes through
   Cloudflare — its web analytics had nothing to see and correctly showed zero.
   That week is gone. This is so the next one is not.

   Vercel's counter is cookieless and writes no identifier to the device, which
   is the only kind of counting this app can honestly do. Flyleaf tells readers
   it keeps nothing about them on a server, and that promise has to survive its
   own analytics.

   `beforeSend` is what keeps it true. A page view carries the address, and
   `/book/1430463001` names a particular book on a particular reader's shelf —
   which books somebody reads is precisely what this app exists to keep
   private. So the id is replaced by its shape before the event leaves the
   device: the count still says "a book was opened", and never which one. The
   query and hash go too, for the same reason and with nothing lost, since
   neither carries anything worth counting. The preview-only lab routes are
   dropped outright; those are the builder's, not traffic.

   Offline it fails and says nothing, which matters more here than in most
   apps: an installed Flyleaf opens from the service-worker cache and is very
   often opened with no network at all. Those opens go uncounted. Every number
   this produces is therefore a floor, not a total. */

import { Analytics } from '@vercel/analytics/react'

function Visits() {
  return (
    <Analytics
      beforeSend={(event) => {
        const url = new URL(event.url)
        if (/^\/(lab|styleguide)\b/.test(url.pathname)) return null
        url.pathname = url.pathname.replace(/^\/book\/[^/]+/, '/book/[id]')
        url.search = ''
        url.hash = ''
        return { ...event, url: url.toString() }
      }}
    />
  )
}

export default Visits
