/* Web Mercator, by hand, so that a map costs nothing.

   A location keep can now be pinned to the real world, which means Flyleaf has
   to draw a map — and the ordinary way to draw a map is to add a mapping
   library and an API key and a card on file. None of those belong in an app
   whose whole promise is that your journal is a folder on your own device.

   What is actually needed is much smaller than a mapping library. OpenStreetMap
   serves plain 256px PNG tiles at a URL anyone can request, and the arithmetic
   that turns a latitude and a longitude into "which tile, and how far into it"
   is the twenty lines below. Laying those tiles out in a box is CSS. There is
   no vector renderer here, no basemap style, no clustering, no geometry — the
   reader is placing one pin, and one pin does not need a GIS.

   The projection is the standard slippy-map one every tile server uses. At zoom
   z the world is 2^z tiles across; each tile is 256px; so the world is
   256 * 2^z pixels wide and every point on earth has one pixel address. All the
   layout code needs is that address, which is why the functions here return
   *world pixels* rather than tile indices — a tile index throws away the part
   of the answer that says where inside the tile you are, and that fraction is
   the difference between a pin on the harbour and a pin in the sea.

   Attribution is not optional and is not decoration: OpenStreetMap's tiles are
   given away on the condition that the map says whose they are. Every surface
   that draws these tiles carries the line, and `CREDIT` below is it.

   One honest caveat, recorded here rather than discovered later: tile.openstreetmap.org
   is run on donated hardware for people looking at maps, not for products
   hammering it. Flyleaf's use — a reader pinning a location now and then, a
   handful of tiles per card — is well inside what that policy has in mind. If
   this ever became something a lot of people did a lot of, it would need a paid
   tile host, and that is a decision to bring to the owner rather than to slide
   in. */

/** One tile, in pixels. Fixed by the tile scheme, not a preference. */
export const TILE = 256

/** The tightest and widest the picker will go. Past 19 the servers have no
    tiles for most of the world and the box fills with grey squares; below 2 the
    world is smaller than the box it is being drawn in. */
export const MIN_ZOOM = 2
export const MAX_ZOOM = 19

/* ── Where the tiles come from ───────────────────────────────────────────────

   One entry is live at a time, named by `SOURCE` below. They are listed rather
   than hard-coded because the choice is a taste decision the owner makes by
   looking at them, not one this file should make on its own — and because
   every one of them is keyless, changing it is a one-word edit rather than an
   account, a card and a key in the frontend.

   Esri's two put the row and column the other way round in the path, which is
   why the URL is a function per source rather than a template string. */
const SOURCES = {
  osm: {
    url: (z: number, x: number, y: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
    credit: '© OpenStreetMap contributors',
  },
  voyager: {
    url: (z: number, x: number, y: number) =>
      `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`,
    credit: '© CARTO, © OpenStreetMap contributors',
  },
  esriStreet: {
    url: (z: number, x: number, y: number) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`,
    credit: '© Esri, © OpenStreetMap contributors',
  },
  esriImagery: {
    url: (z: number, x: number, y: number) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
    credit: '© Esri, Maxar, Earthstar Geographics',
  },
} as const

/** The live basemap. Change this one word to change how every map in the app
    is drawn; nothing else in the codebase names a tile server.

    Voyager and not `esriStreet`, which was the look the owner picked, because
    the pick came with a condition — "make sure you are using a complete map
    that has all the locations around the world" — and Esri's keyless raster
    basemap does not meet it. Measured, 18 cities × 5 zooms, tiles fetched and
    looked at rather than status-checked, because a missing Esri tile answers
    200 with a flat cream JPEG rather than a 404:

      · Abuja at z19, Ulaanbaatar at z19, Suva at z18, Pyongyang at z19 — all
        blank cream. The cache simply stops before the app's MAX_ZOOM there.
      · Worse than the holes, the data behind them is thinner. Abuja at z16 is
        a handful of unnamed white lines on cream; the same tile on OSM has
        street names, buildings, a park and a hospital. Suva at z17 is the word
        SUVA on an empty field. `World_Topo_Map` has the same gaps.

    Voyager is OSM's own data drawn in the detailed, coloured, Google-ish style
    that prompted the request — buildings, rail, local-script labels — and it
    covers everywhere, because it is rendered from vectors rather than served
    from a cache with edges. Same 18 cities × 5 zooms: nothing blank, nothing
    missing.

    If the Esri look is wanted anyway, this is still the one word to change. */
const SOURCE: keyof typeof SOURCES = 'voyager'

/** Required wherever these tiles are drawn. Attribution is a condition of the
    licence, not decoration — it moves with the source above. */
export const CREDIT = SOURCES[SOURCE].credit

/** Longitude → world-pixel x at this zoom. */
export function lonToX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * TILE * 2 ** zoom
}

/** Latitude → world-pixel y at this zoom. The log-tangent is the Mercator
    part: it is what makes the poles unreachable and Greenland enormous. */
export function latToY(lat: number, zoom: number): number {
  const rad = (clampLat(lat) * Math.PI) / 180
  const y = Math.log(Math.tan(rad) + 1 / Math.cos(rad))
  return (0.5 - y / (2 * Math.PI)) * TILE * 2 ** zoom
}

/** World-pixel x → longitude. */
export function xToLon(x: number, zoom: number): number {
  return (x / (TILE * 2 ** zoom)) * 360 - 180
}

/** World-pixel y → latitude. */
export function yToLat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / (TILE * 2 ** zoom)
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

/* Mercator cannot draw the poles — the projection runs to infinity there — so
   the usable band stops just short of them. This is the same 85.0511° every
   slippy map uses, and it is where the maths, not the taste, puts it. */
export function clampLat(lat: number): number {
  return Math.min(85.0511, Math.max(-85.0511, lat))
}

/** Wrap a longitude back into range, so dragging west past the dateline comes
    out east rather than off the edge of the world. */
export function wrapLon(lon: number): number {
  return ((((lon + 180) % 360) + 360) % 360) - 180
}

export function tileUrl(zoom: number, x: number, y: number): string {
  return SOURCES[SOURCE].url(zoom, x, y)
}

/** One tile's place in the box being drawn. */
export interface Placed {
  key: string
  url: string
  left: number
  top: number
}

/** Which tiles cover a box of `width` × `height` centred on a point, and where
    each of them sits inside it.

    Rows off the top or bottom of the world are dropped — there is nothing above
    the north edge to request. Columns are wrapped instead of dropped, so a map
    centred on the Pacific still has land on both sides of it. */
export function cover(
  lat: number,
  lon: number,
  zoom: number,
  width: number,
  height: number,
): Placed[] {
  const z = Math.round(zoom)
  const span = 2 ** z
  const cx = lonToX(lon, z)
  const cy = latToY(lat, z)
  /* The box's own top-left corner, in world pixels. Every tile's position is
     measured off this, which is the whole of the layout. */
  const left = cx - width / 2
  const top = cy - height / 2

  const firstX = Math.floor(left / TILE)
  const lastX = Math.floor((left + width) / TILE)
  const firstY = Math.floor(top / TILE)
  const lastY = Math.floor((top + height) / TILE)

  const out: Placed[] = []
  for (let ty = firstY; ty <= lastY; ty++) {
    if (ty < 0 || ty >= span) continue
    for (let tx = firstX; tx <= lastX; tx++) {
      const wrapped = ((tx % span) + span) % span
      out.push({
        key: `${z}/${tx}/${ty}`,
        url: tileUrl(z, wrapped, ty),
        left: tx * TILE - left,
        top: ty * TILE - top,
      })
    }
  }
  return out
}

/** How a pinned point is said in one line when there is no name for it. Two
    decimal places is about a kilometre, which is the honest precision of a pin
    dropped by thumb on a phone. */
export function saidAs(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(2)}°${ns} ${Math.abs(lon).toFixed(2)}°${ew}`
}

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
  return body.map((row) => ({
    lat: Number(row.lat),
    lon: Number(row.lon),
    label: row.display_name ?? '',
  }))
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
      if (out.some((kept) => sameSpot(kept, hit))) continue
      out.push(hit)
      if (out.length >= 6) return out
    }
  }
  return out
}

/** The long comma-separated address a geocoder returns, cut down to something
    that fits on a card: the place, and the country it is in. */
export function shortLabel(label: string): string {
  const parts = label.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length <= 2) return parts.join(', ')
  return `${parts[0]}, ${parts[parts.length - 1]}`
}
