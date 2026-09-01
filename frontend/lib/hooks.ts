'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/lib/civicai-api'

type FetchState<T> = {
  data: T | null
  error: string | null
  loading: boolean
  refetch: () => void
}

/**
 * Generic polling fetch hook. `fetcher` is re-run whenever `deps` change, and
 * again every `intervalMs` (if provided) while the component is mounted.
 */
export function useApiData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options: { intervalMs?: number; enabled?: boolean } = {},
): FetchState<T> {
  const { intervalMs, enabled = true } = options
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [tick, setTick] = useState(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetcherRef
      .current()
      .then((result) => {
        if (cancelled) return
        setData(result)
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Something went wrong fetching live data.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tick, ...deps])

  useEffect(() => {
    if (!intervalMs || !enabled) return
    const id = setInterval(() => setTick((t) => t + 1), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, enabled])

  return { data, error, loading, refetch }
}

/** Browser geolocation, resolved once, with a Lahore-centred fallback. */
const LAHORE_FALLBACK = { lat: 31.5497, lng: 74.3436 }

export function useGeolocation() {
  const [coords, setCoords] = useState<{ lat: number; lng: number }>(LAHORE_FALLBACK)
  const [source, setSource] = useState<'pending' | 'gps' | 'fallback'>('pending')

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setSource('fallback')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setSource('gps')
      },
      () => setSource('fallback'),
      { timeout: 8000 },
    )
  }, [])

  return { coords, setCoords, source }
}
