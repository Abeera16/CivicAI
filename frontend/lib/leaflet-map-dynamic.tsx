/**
 * SSR-safe re-export of LeafletMap.
 *
 * Leaflet manipulates the DOM directly so it must never run on the server.
 * Import from this file instead of lib/leaflet-map directly whenever you
 * need the map inside a Next.js page or layout.
 */
import dynamic from 'next/dynamic'

export type { MapMarker, MapCircleSpec } from './leaflet-map'

export const LeafletMap = dynamic(
  () => import('./leaflet-map').then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div
        style={{ height: 480, width: '100%' }}
        className="z-0 flex items-center justify-center overflow-hidden rounded-3xl bg-muted/40"
      >
        <p className="text-sm text-muted-foreground">Loading map…</p>
      </div>
    ),
  },
)
