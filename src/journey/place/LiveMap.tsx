/* The map a pinned location keep carries: a real one, keyless, drawn in the
   card's own colours.

   OpenFreeMap's vector tiles through MapLibre. Raster tiles were tried and
   lost (2026-10-18): OSM at street zoom is an empty square anywhere rural, and
   tinting a picture of a map never matches the paper. A vector map is
   repainted from the tokens instead — paper for land, verdigris for water and
   green, ink for the words — so it reads as part of the card.

   It moves. One finger still scrolls the page past it; two fingers (or Ctrl
   and the wheel) move the map, which is MapLibre's cooperative gestures.

   A WebGL context per card would run a long journey out of them, so a map is
   only alive while its card is near the screen, and the library itself is only
   fetched the first time one is. */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Map as Chart } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import styles from './livemap.module.css'

/* Required by the tiles' licence, set under the plate by whoever shows one. */
export const MAP_CREDIT = '© OpenFreeMap · OpenStreetMap'

const STYLE = 'https://tiles.openfreemap.org/styles/liberty'
/* Pulled back to the district: towns, rivers and roads around the pin rather
   than the one empty street it is on. */
const ZOOM = 10

/* MapLibre wants rgb and the tokens are oklch. A one-pixel canvas translates. */
function rgb(token: string, at: Element) {
  const ctx = document.createElement('canvas').getContext('2d')!
  ctx.fillStyle = getComputedStyle(at).getPropertyValue(token).trim()
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}
const mix = (a: number[], b: number[], t: number) =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`

function paint(map: Chart, at: Element) {
  const paper = rgb('--card-place-solid', at)
  const place = rgb('--color-place', at)
  const ink = rgb('--color-ink', at)
  for (const layer of map.getStyle().layers) {
    const { id, type } = layer
    if (type === 'background') map.setPaintProperty(id, 'background-color', mix(paper, ink, 0))
    /* Natural Earth's coloured relief, under everything at low zoom. */
    else if (type === 'raster') map.setPaintProperty(id, 'raster-opacity', 0)
    else if (type === 'fill' && /water/.test(id) && !layer.paint?.['fill-pattern'])
      map.setPaintProperty(id, 'fill-color', mix(paper, place, 0.45))
    else if (type === 'fill' && /building/.test(id)) map.setPaintProperty(id, 'fill-color', mix(paper, ink, 0.08))
    else if (type === 'fill-extrusion') map.setPaintProperty(id, 'fill-extrusion-color', mix(paper, ink, 0.08))
    /* Every other ground — park, wood, hospital, pitch — as one soft green, so
       no stray pink or yellow from the source style survives. */
    else if (type === 'fill') map.setPaintProperty(id, 'fill-color', mix(paper, place, 0.18))
    else if (type === 'line' && /water|river/.test(id)) map.setPaintProperty(id, 'line-color', mix(paper, place, 0.6))
    else if (type === 'line' && /boundary/.test(id)) map.setPaintProperty(id, 'line-color', mix(paper, ink, 0.35))
    else if (type === 'line' && /park/.test(id)) map.setPaintProperty(id, 'line-color', mix(paper, place, 0.25))
    /* Roads, and the bridges, tunnels, rails and runways that carry their own
       oranges and yellows in the source style. */
    else if (type === 'line') map.setPaintProperty(id, 'line-color', mix(paper, ink, 0.22))
    else if (type === 'symbol') {
      /* Shields (N1, M5), one-way arrows and POI icons are pictures in the
         source's colours; nothing paints them, so they go. The city dots stay. */
      if (layer.layout?.['icon-image'] && !/^label_/.test(id)) map.setLayoutProperty(id, 'visibility', 'none')
      map.setPaintProperty(id, 'text-color', mix(paper, ink, 0.75))
      map.setPaintProperty(id, 'text-halo-color', mix(paper, ink, 0))
    }
  }
}

interface Props {
  lat: number
  lon: number
  /** Shown if the map can't be drawn: no WebGL, or the library didn't load. */
  fallback?: ReactNode
}

export default function LiveMap({ lat, lon, fallback }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const watch = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: '300px' })
    watch.observe(el)
    return () => watch.disconnect()
  }, [])

  useEffect(() => {
    const el = box.current
    if (!near || !el) return
    let map: Chart | undefined
    let theme: MutationObserver | undefined
    let gone = false
    import('maplibre-gl')
      .then(({ default: gl }) => {
        if (gone) return
        map = new gl.Map({
          container: el,
          style: STYLE,
          center: [lon, lat],
          zoom: ZOOM,
          cooperativeGestures: true,
          attributionControl: false,
        })
        const chart = map
        chart.on('load', () => chart.resize())
        chart.on('style.load', () => paint(chart, el))
        /* The theme swaps tokens, not stylesheets, so repaint when it does. */
        theme = new MutationObserver(() => chart.isStyleLoaded() && paint(chart, el))
        theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
        const dot = document.createElement('span')
        dot.className = styles.dot
        new gl.Marker({ element: dot }).setLngLat([lon, lat]).addTo(chart)
      })
      .catch(() => setFailed(true))
    return () => {
      gone = true
      theme?.disconnect()
      map?.remove()
    }
  }, [near, lat, lon])

  if (failed) return <>{fallback}</>
  return (
    <div className={styles.map}>
      {/* MapLibre makes its container position: relative, so it gets its own. */}
      <div ref={box} className={styles.fill} role="img" aria-label="Map of this place" />
    </div>
  )
}
