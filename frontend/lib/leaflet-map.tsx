'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { Circle, LayerGroup, Map as LeafletMapInstance, Marker } from 'leaflet'

export type MapMarker = {
  id: string
  lat: number
  lng: number
  color: string
  tooltip?: string
  selected?: boolean
  onClick?: () => void
}

export type MapCircleSpec = {
  id: string
  lat: number
  lng: number
  radiusMeters: number
  color: string
  tooltip?: string
}

const LAHORE_CENTER: [number, number] = [31.5497, 74.3436]

// Plain OpenStreetMap tiles — genuinely free forever, no API key, no CORS issues.
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/**
 * LeafletMap — renders an interactive map using free OpenStreetMap tiles.
 *
 * IMPORTANT: This component must only be rendered in the browser (Leaflet
 * manipulates the DOM directly). Import it via the dynamic wrapper below, or
 * wrap the call site with `next/dynamic` + `{ ssr: false }`.
 */
export function LeafletMap({
  markers,
  circles = [],
  center = LAHORE_CENTER,
  zoom = 12,
  height = 480,
  className = '',
}: {
  markers: MapMarker[]
  circles?: MapCircleSpec[]
  center?: [number, number]
  zoom?: number
  height?: number | string
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMapInstance | null>(null)
  const markerLayerRef = useRef<LayerGroup | null>(null)
  const circleLayerRef = useRef<LayerGroup | null>(null)
  const markersDataRef = useRef(markers)
  const circlesDataRef = useRef(circles)
  markersDataRef.current = markers
  circlesDataRef.current = circles

  // Create the map once (client-side only — Leaflet needs a real DOM).
  useEffect(() => {
    let cancelled = false
    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return

      const map = L.map(containerRef.current, {
        center,
        zoom,
        scrollWheelZoom: true,
        zoomControl: true,
      })

      // Free OpenStreetMap tiles — no API key required, no billing, works forever.
      L.tileLayer(OSM_TILE_URL, {
        attribution: OSM_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map)

      circleLayerRef.current = L.layerGroup().addTo(map)
      markerLayerRef.current = L.layerGroup().addTo(map)
      mapRef.current = map

      renderLayers(L)
    })
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-render markers/circles whenever the data changes.
  useEffect(() => {
    if (!mapRef.current) return
    import('leaflet').then((L) => renderLayers(L))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, circles])

  function renderLayers(L: typeof import('leaflet')) {
    markerLayerRef.current?.clearLayers()
    circleLayerRef.current?.clearLayers()

    for (const c of circlesDataRef.current) {
      const circle: Circle = L.circle([c.lat, c.lng], {
        radius: c.radiusMeters,
        color: c.color,
        fillColor: c.color,
        fillOpacity: 0.12,
        weight: 1,
      })
      if (c.tooltip) circle.bindTooltip(c.tooltip)
      circle.addTo(circleLayerRef.current!)
    }

    for (const m of markersDataRef.current) {
      const size = m.selected ? 20 : 14
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${m.color};border:2px solid #fff;box-shadow:0 1px 6px rgba(15,23,42,.45)"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })
      const marker: Marker = L.marker([m.lat, m.lng], { icon })
      if (m.tooltip) marker.bindTooltip(m.tooltip)
      if (m.onClick) marker.on('click', m.onClick)
      marker.addTo(markerLayerRef.current!)
    }
  }

  return <div ref={containerRef} style={{ height, width: '100%' }} className={`z-0 overflow-hidden rounded-3xl ${className}`} />
}
