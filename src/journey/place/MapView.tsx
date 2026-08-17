/* A map, drawn still.

   Tiles laid in a box with a pin at the middle of it. No dragging, no zooming,
   no controls — this is the picture a pinned location keeps, and it is used in
   two places that both want exactly that: the card in the journey, and the
   proof under the picker on the capture sheet.

   It measures itself rather than being told a size, because the two callers
   want different ones and neither of them knows its own width until the layout
   has run. The measurement drives which tiles are asked for, so an unmeasured
   box asks for nothing at all and paints as the paper it is on — which is the
   right first frame, not a flash of half a map in the wrong place.

   The tiles fade in as they land, one at a time. A tile server answers out of
   order and a grid that snaps in piecemeal reads as broken; a short fade makes
   the same arrival read as the map coming into focus. Transform and opacity
   only, and off entirely under reduced motion. */

import { useEffect, useRef, useState } from 'react'
import { CREDIT, cover } from './tiles'
import styles from './map.module.css'

interface Props {
  lat: number
  lon: number
  zoom: number
  /** What the pin is standing on, for somebody who cannot see the map. */
  label?: string
  /** Drawn over the tiles at the centre. Off for the thumbnail behind a
      picker, which draws its own. */
  pin?: boolean
  className?: string
}

function MapView({ lat, lon, zoom, label, pin = true, className }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number }>()

  useEffect(() => {
    const el = box.current
    if (!el) return
    const watch = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      /* Rounded up to a whole pixel: a fractional box makes the tile offsets
         fractional too, and a row of images at x.5 is a hairline seam between
         every pair of tiles. */
      setSize({ w: Math.ceil(width), h: Math.ceil(height) })
    })
    watch.observe(el)
    return () => watch.disconnect()
  }, [])

  const tiles = size ? cover(lat, lon, zoom, size.w, size.h) : []

  return (
    <div
      ref={box}
      className={className ? `${styles.map} ${className}` : styles.map}
      role="img"
      aria-label={label ? `Map of ${label}` : 'Map of this location'}
    >
      {tiles.map((tile) => (
        <img
          key={tile.key}
          className={styles.tile}
          src={tile.url}
          alt=""
          aria-hidden="true"
          draggable={false}
          loading="lazy"
          decoding="async"
          style={{ left: tile.left, top: tile.top }}
          onLoad={(e) => e.currentTarget.setAttribute('data-here', '')}
        />
      ))}
      {pin && <span className={styles.pin} aria-hidden="true" />}
      {/* Small, quiet, and never removable: the tiles are given away on the
          condition that the map says whose they are. */}
      <span className={styles.credit}>{CREDIT}</span>
    </div>
  )
}

export default MapView
