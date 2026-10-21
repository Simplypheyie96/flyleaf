/* Finding a place by name, with no map and no key.

   A location keep can be tied to the real world: a name the reader searched
   for, and the coordinates the geocoder answered with. There used to be a
   slippy map here to drag a pin on; it was taken out on 2026-10-18 because a
   dot on an empty cream map said less than the place's name does. The
   coordinates are still saved with the pin, so a map can come back later
   without a single keep losing its place.

   Searching costs nothing: OpenStreetMap's geocoder, Wikipedia and Photon all
   answer anyone politely, and none of them wants a key or a card on file. */

/** One result from a place search. `about` is the one-line gloss a shelf
    volunteered — "Shopping area in Chiyoda, Tokyo" — which is the difference
    between a list of three identical-looking names and a list you can choose
    from. */
export interface Found {
  lat: number
  lon: number
  label: string
  about?: string
}

/* ── Finding a place by name ─────────────────────────────────────────────────

   Three shelves, asked at once, because one of them was not enough and the
   reason was not that it was broken.

   Nominatim is OpenStreetMap's own geocoder and it is the right first answer
   for anything with an address: a street, a building, a town. What it will not
   do is recognise a place by a name nobody has written on a map. Ask it for
   "akiba electric town" — what half of Tokyo calls Akihabara — and it returns
   nothing at all, because that string is not in the address database, and a
   reader who has just found the place on another map reads that emptiness as
   the app being wrong.

   So the other two cover the two ways a name can be real without being an
   address. PHOTON reads the same OpenStreetMap data but matches loosely and
   as-you-type, so it forgives a word out of place. WIKIPEDIA is the one that
   actually answers the Akihabara question: it indexes what places are *called*
   — nicknames, historical names, the name a book uses — and hands back
   coordinates for anything notable enough to have a page. Measured, not
   guessed: "akiba electric town", "electric town tokyo" and "Akihabara
   Electric Town" all land on 35.6983°N, 139.7731°E through Wikipedia and on
   nothing at all through Nominatim.

   One honest gap, recorded so it is not rediscovered as a bug: none of the
   three corrects spelling. "akiba ELECTRICITY town" finds nothing, where a
   search engine would quietly read it as "electric" first. That is a thing
   Google does with a query-understanding model, and there is no keyless
   service that does it. The picker's own wording — try fewer words, or drag to
   it — is the answer to that case, and dragging is always there.

   Order, not merge. The shelves are asked in parallel but read in sequence:
   Nominatim first because an address is the most precise thing anyone can
   mean, Wikipedia second because a named place is the next most, Photon last
   because loose matching is exactly what you want only once the strict ones
   have come back empty. Sorting by some invented relevance score across three
   sources that score differently would be a fourth opinion nobody asked for. */

const PATIENCE = 8000

async function askNominatim(query: string): Promise<Found[]> {
  const res = await fetch(
    'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=' +
      encodeURIComponent(query),
    { signal: AbortSignal.timeout(PATIENCE), headers: { Accept: 'application/json' } },
  )
  if (!res.ok) throw new Error(`Nominatim ${res.status}`)
  const body = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[]
  return body.map((row) => {
    /* The card keeps "place, country"; the region in between is what tells
       two places of the same name apart in the list, so it goes in the gloss. */
    const parts = (row.display_name ?? '').split(',').map((p) => p.trim()).filter(Boolean)
    return {
      lat: Number(row.lat),
      lon: Number(row.lon),
      label: row.display_name ?? '',
      about: parts.slice(1, -1).slice(-2).join(', ') || undefined,
    }
  })
}

/** Wikipedia's search, kept to pages that carry coordinates. `generator=search`
    runs the ordinary search and then asks for the coordinates of whatever it
    found, which is how a nickname reaches a latitude. `origin=*` is what makes
    it answerable from a browser without a key. */
async function askWikipedia(query: string): Promise<Found[]> {
  const res = await fetch(
    'https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*' +
      '&generator=search&gsrlimit=6&prop=coordinates%7Cdescription&gsrsearch=' +
      encodeURIComponent(query),
    { signal: AbortSignal.timeout(PATIENCE) },
  )
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`)
  const body = (await res.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          index?: number
          title?: string
          description?: string
          coordinates?: { lat?: number; lon?: number }[]
        }
      >
    }
  }
  const pages = Object.values(body.query?.pages ?? {})
  /* The object comes back keyed by page id, which is not the search ranking;
     `index` is. Without this sort the third-best answer can arrive first. */
  pages.sort((a, b) => (a.index ?? 99) - (b.index ?? 99))
  return pages
    .filter((page) => page.coordinates?.[0])
    .map((page) => ({
      lat: Number(page.coordinates?.[0]?.lat),
      lon: Number(page.coordinates?.[0]?.lon),
      label: page.title ?? '',
      about: page.description?.trim() || undefined,
    }))
}

async function askPhoton(query: string): Promise<Found[]> {
  const res = await fetch(
    'https://photon.komoot.io/api/?limit=5&q=' + encodeURIComponent(query),
    { signal: AbortSignal.timeout(PATIENCE), headers: { Accept: 'application/json' } },
  )
  if (!res.ok) throw new Error(`Photon ${res.status}`)
  const body = (await res.json()) as {
    features?: {
      geometry?: { coordinates?: number[] }
      properties?: { name?: string; city?: string; state?: string; country?: string }
    }[]
  }
  return (body.features ?? []).map((feature) => {
    const p = feature.properties ?? {}
    return {
      /* GeoJSON is longitude first. Getting this the wrong way round puts
         every European result in the Indian Ocean. */
      lon: Number(feature.geometry?.coordinates?.[0]),
      lat: Number(feature.geometry?.coordinates?.[1]),
      label: [p.name, p.city ?? p.state, p.country].filter(Boolean).join(', '),
    }
  })
}

/** Roughly two hundred metres. Two shelves naming the same place will not agree
    to the decimal, and a list that offers Akihabara three times is a list that
    has stopped being a choice. */
function sameSpot(a: Found, b: Found): boolean {
  return Math.abs(a.lat - b.lat) < 0.002 && Math.abs(a.lon - b.lon) < 0.002
}

/** Two rows the reader cannot tell apart are one row, wherever they point. */
function sameName(a: Found, b: Found): boolean {
  return shortLabel(a.label) === shortLabel(b.label) && (a.about ?? '') === (b.about ?? '')
}

/** Ask every shelf where a name is.

    An empty array means all three answered and none of them knew. A throw means
    none of them could be reached at all — the picker says different things for
    the two, because one is "that place isn't on a map" and the other is "your
    train went into a tunnel". */
export async function findPlace(query: string): Promise<Found[]> {
  const words = query.trim()
  if (!words) return []

  const shelves = await Promise.allSettled([
    askNominatim(words),
    askWikipedia(words),
    askPhoton(words),
  ])

  if (shelves.every((shelf) => shelf.status === 'rejected')) {
    throw new Error('No place search could be reached')
  }

  const out: Found[] = []
  for (const shelf of shelves) {
    if (shelf.status !== 'fulfilled') continue
    for (const hit of shelf.value) {
      if (!Number.isFinite(hit.lat) || !Number.isFinite(hit.lon) || !hit.label) continue
      if (out.some((kept) => sameSpot(kept, hit) || sameName(kept, hit))) continue
      out.push(hit)
      if (out.length >= 6) return out
    }
  }
  return out
}

/* WHERE I AM, WHEN THE DEVICE WILL NOT SAY.
   The browser's own location needs the reader's permission, and plenty of
   phones, in-app browsers and desktops refuse it. GeoJS answers from the
   network instead: free, no key, open to the browser, right to the city and
   not the street. It runs only when the reader presses "Where I am" and the
   device has already said no. */
export async function roughlyHere(): Promise<Found> {
  const res = await fetch('https://get.geojs.io/v1/ip/geo.json', {
    signal: AbortSignal.timeout(PATIENCE),
  })
  if (!res.ok) throw new Error(`GeoJS ${res.status}`)
  const body = (await res.json()) as { latitude?: string; longitude?: string; city?: string; country?: string }
  const lat = Number(body.latitude)
  const lon = Number(body.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('GeoJS gave no spot')
  return { lat, lon, label: [body.city, body.country].filter(Boolean).join(', ') }
}

/** The long comma-separated address a geocoder returns, cut down to something
    that fits on a card: the place, and the country it is in. */
export function shortLabel(label: string): string {
  const parts = label.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length <= 2) return parts.join(', ')
  return `${parts[0]}, ${parts[parts.length - 1]}`
}
