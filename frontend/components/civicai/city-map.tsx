'use client'

import { useMemo, useState } from 'react'
import { Activity, AlertTriangle, ArrowRight, Download, Layers3, Loader2, MapPinned, Radar as RadarIcon, Users } from 'lucide-react'
import { civicApi, type Hotspot, type MapIncident } from '@/lib/civicai-api'
import { useApiData } from '@/lib/hooks'
import { severityColorHex, severityTone, titleCase } from '@/lib/geo'
import { LeafletMap, type MapCircleSpec, type MapMarker } from '@/lib/leaflet-map-dynamic'
import { Action, CompactMetric, ErrorState, Tag } from './shell'

const SEVERITY_LEGEND = ['critical', 'high', 'medium', 'low'] as const

function useMapLayers(
  incidents: MapIncident[],
  hotspots: Hotspot[],
  showHotspots: boolean,
  selectedId: string | null,
  onSelect: (incident: MapIncident) => void,
) {
  const markers: MapMarker[] = useMemo(
    () =>
      incidents.map((item) => ({
        id: item.id,
        lat: item.lat,
        lng: item.lng,
        color: severityColorHex(item.severity),
        selected: item.id === selectedId,
        tooltip: `${titleCase(item.category)} · ${item.report_count} report${item.report_count === 1 ? '' : 's'} · impact ${item.impact_score}`,
        onClick: () => onSelect(item),
      })),
    [incidents, selectedId, onSelect],
  )

  const circles: MapCircleSpec[] = useMemo(
    () =>
      showHotspots
        ? hotspots.map((h, i) => ({
            id: `${h.label}-${i}`,
            lat: h.lat,
            lng: h.lng,
            radiusMeters: 250 + h.incident_count * 120,
            color: '#e11d48',
            tooltip: `${h.label} · avg impact ${h.avg_impact_score.toFixed(0)}`,
          }))
        : [],
    [hotspots, showHotspots],
  )

  return { markers, circles }
}

export function CityMap() {
  const { data: incidents, error: incidentsError, loading: loadingIncidents, refetch: refetchIncidents } = useApiData(
    () => civicApi.mapIncidents(),
    [],
    { intervalMs: 60000 },
  )
  const { data: hotspots, refetch: refetchHotspots } = useApiData(() => civicApi.hotspots(10), [], { intervalMs: 60000 })
  const [showHotspots, setShowHotspots] = useState(true)
  const [selected, setSelected] = useState<MapIncident | null>(null)

  const { markers, circles } = useMapLayers(incidents ?? [], hotspots ?? [], showHotspots, selected?.id ?? null, setSelected)

  const stats = useMemo(() => {
    if (!incidents) return null
    const critical = incidents.filter((i) => i.severity === 'critical').length
    const avgImpact = incidents.length ? Math.round(incidents.reduce((s, i) => s + i.impact_score, 0) / incidents.length) : 0
    return { total: incidents.length, critical, avgImpact, hotspots: hotspots?.length ?? 0 }
  }, [incidents, hotspots])

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <Tag tone="green">
            <span className="size-1.5 rounded-full bg-teal-600" /> Live spatial view
          </Tag>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-.03em]">City map</h2>
          <p className="mt-1 text-sm text-muted-foreground">See where civic signals cluster, change and need a coordinated response.</p>
        </div>
        <div className="flex gap-2">
          <Action variant="outline" onClick={() => setShowHotspots((v) => !v)} className="h-9 px-3 text-xs">
            <Layers3 className="size-3.5" /> {showHotspots ? 'Hide hotspots' : 'Show hotspots'}
          </Action>
          <Action
            className="h-9 px-3 text-xs"
            onClick={() => {
              refetchIncidents()
              refetchHotspots()
            }}
          >
            <Download className="size-3.5" /> Refresh
          </Action>
        </div>
      </div>

      {incidentsError && <ErrorState message={incidentsError} onRetry={refetchIncidents} />}

      {loadingIncidents && !incidents && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading live incidents…
        </div>
      )}

      {incidents && stats && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <CompactMetric label="Open incidents" value={String(stats.total)} icon={MapPinned} tone="blue" />
            <CompactMetric label="Critical severity" value={String(stats.critical)} icon={AlertTriangle} tone="rose" />
            <CompactMetric label="Active hotspots" value={String(stats.hotspots)} icon={RadarIcon} tone="amber" />
            <CompactMetric label="Avg impact score" value={String(stats.avgImpact)} icon={Activity} tone="green" />
          </div>

          <div className="grid gap-3 xl:grid-cols-[1fr_320px]">
            <section className="relative overflow-hidden rounded-2xl border border-border shadow-sm">
              <LeafletMap markers={markers} circles={circles} height={520} />

              <div className="pointer-events-none absolute bottom-4 left-4 z-[400] rounded-xl border border-white/70 bg-card/95 px-4 py-3 shadow-xl">
                <p className="text-[11px] font-semibold text-muted-foreground">Tap a pin to explore</p>
                <p className="mt-0.5 text-sm font-semibold">
                  {incidents.length} open incident{incidents.length === 1 ? '' : 's'} across Lahore
                </p>
              </div>

              <div className="pointer-events-none absolute top-4 right-4 z-[400] rounded-xl border border-white/70 bg-card/95 px-3 py-2.5 shadow-xl">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Severity</p>
                <div className="mt-1.5 flex flex-col gap-1">
                  {SEVERITY_LEGEND.map((level) => (
                    <span key={level} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="size-2 rounded-full" style={{ background: severityColorHex(level) }} />
                      {titleCase(level)}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <aside className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Hotspot watch</h3>
                <Tag tone="rose">{hotspots?.length ?? 0} active</Tag>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">The zones with the strongest concentration of unresolved signals.</p>
              <div className="mt-4 flex flex-col gap-2">
                {(hotspots ?? []).map((item, i) => (
                  <div key={`${item.label}-${i}`} className="rounded-xl border border-border p-3 transition hover:border-primary/30 hover:shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-[11px] font-bold text-rose-700">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold leading-tight">{item.label}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">Top category: {titleCase(item.top_category)}</p>
                        </div>
                      </div>
                      <Tag tone={item.avg_impact_score >= 70 ? 'rose' : item.avg_impact_score >= 40 ? 'amber' : 'green'}>
                        {item.avg_impact_score.toFixed(0)}
                      </Tag>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{item.incident_count} incidents</span>
                    </div>
                  </div>
                ))}
                {hotspots && hotspots.length === 0 && <p className="text-xs text-muted-foreground">No hotspots yet.</p>}
              </div>
              {selected && (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Selected incident</p>
                  <h4 className="mt-1.5 text-sm font-semibold">{titleCase(selected.category)}</h4>
                  <div className="mt-2 flex items-center gap-1.5">
                    <Tag tone={severityTone(selected.severity)}>{titleCase(selected.severity)}</Tag>
                    <Tag tone="blue">Impact {selected.impact_score}</Tag>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {selected.report_count} report{selected.report_count === 1 ? '' : 's'} · status {titleCase(selected.status)}
                  </p>
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  )
}

export function CitizenMap({ onReportSimilar }: { onReportSimilar: () => void }) {
  const { data: incidents, error, loading, refetch } = useApiData(() => civicApi.mapIncidents(), [], { intervalMs: 60000 })
  const { data: hotspots } = useApiData(() => civicApi.hotspots(8), [], { intervalMs: 60000 })
  const [selected, setSelected] = useState<MapIncident | null>(null)
  const active = selected ?? incidents?.[0] ?? null

  const { markers, circles } = useMapLayers(incidents ?? [], hotspots ?? [], true, active?.id ?? null, setSelected)

  const stats = useMemo(() => {
    if (!incidents) return null
    const totalReports = incidents.reduce((s, i) => s + i.report_count, 0)
    const counts: Record<string, number> = {}
    for (const i of incidents) counts[i.category] = (counts[i.category] || 0) + 1
    const topCategory = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
    return { open: incidents.length, totalReports, topCategory: topCategory ? titleCase(topCategory) : '—' }
  }, [incidents])

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div>
        <Tag tone="green">Community view</Tag>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-.03em]">City map</h2>
        <p className="mt-1 text-sm text-muted-foreground">Explore reported issues and service activity across Lahore.</p>
      </div>

      {error && <ErrorState message={error} onRetry={refetch} />}
      {loading && !incidents && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading the map…
        </div>
      )}

      {incidents && stats && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <CompactMetric label="Open issues nearby" value={String(stats.open)} icon={MapPinned} tone="blue" />
            <CompactMetric label="Community reports" value={String(stats.totalReports)} icon={Users} tone="green" />
            <CompactMetric label="Most reported" value={stats.topCategory} icon={AlertTriangle} tone="amber" />
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
            <section className="relative overflow-hidden rounded-2xl border border-border shadow-sm">
              <LeafletMap markers={markers} circles={circles} height={460} />

              <div className="pointer-events-none absolute bottom-4 left-4 z-[400] rounded-xl border border-white/70 bg-card/95 px-4 py-3 shadow-xl">
                <p className="text-[11px] font-semibold text-muted-foreground">Tap a pin to explore</p>
                <p className="mt-0.5 text-sm font-semibold">
                  {incidents.length} open incident{incidents.length === 1 ? '' : 's'} across Lahore
                </p>
              </div>

              <div className="pointer-events-none absolute top-4 right-4 z-[400] rounded-xl border border-white/70 bg-card/95 px-3 py-2.5 shadow-xl">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Severity</p>
                <div className="mt-1.5 flex flex-col gap-1">
                  {SEVERITY_LEGEND.map((level) => (
                    <span key={level} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="size-2 rounded-full" style={{ background: severityColorHex(level) }} />
                      {titleCase(level)}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <aside className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Selected signal</p>
              {active ? (
                <>
                  <div className="mt-3 flex items-start gap-3">
                    <div
                      className="grid size-10 shrink-0 place-items-center rounded-xl"
                      style={{ background: `${severityColorHex(active.severity)}1a`, color: severityColorHex(active.severity) }}
                    >
                      <AlertTriangle className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold leading-tight">{titleCase(active.category)}</h3>
                      <div className="mt-1.5">
                        <Tag tone={severityTone(active.severity)}>{titleCase(active.severity)} severity</Tag>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/50 px-3.5 py-2.5">
                    <span className="text-xs text-muted-foreground">Community reports</span>
                    <span className="text-sm font-semibold">{active.report_count}</span>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-muted-foreground">
                    This issue is being monitored by the relevant district service team. You can submit your own report if the situation has
                    changed.
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No open incidents right now — great news for Lahore.</p>
              )}
              <Action variant="outline" onClick={onReportSimilar} className="mt-4 h-9 w-full px-3 text-xs">
                Report similar issue <ArrowRight className="size-3.5" />
              </Action>
            </aside>
          </div>
        </>
      )}
    </div>
  )
}