'use client'

import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, CloudRain, FileText, Loader2, MapPinned, Plus, Sparkles } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '@/lib/auth-context'
import { civicApi } from '@/lib/civicai-api'
import { useApiData } from '@/lib/hooks'
import { severityDot, severityColorHex, parseApiDate, severityTone, titleCase } from '@/lib/geo'
import { LeafletMap } from '@/lib/leaflet-map-dynamic'
import { Action, CompactCard, CompactMetric, ErrorState, Metric, MiniTable, Tag } from './shell'

const STATUS_COLORS = ['#3b82f6', '#f59e0b', '#10b981']
const CATEGORY_COLORS = ['#2f7d6b', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9']
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const
const tooltipStyle = { borderRadius: '10px', border: '1px solid hsl(var(--border))', fontSize: 12 }

export function CitizenOverview({ onReport, onOpenMap, onOpenReports }: { onReport: () => void; onOpenMap: () => void; onOpenReports: () => void }) {
  const { user, token } = useAuth()
  const { data: reports } = useApiData(() => civicApi.myReports(token!), [token], { enabled: !!token })
  const { data: weather, loading: weatherLoading } = useApiData(() => civicApi.weather(), [], { intervalMs: 5 * 60000 })

  const open = reports?.filter((r) => r.status !== 'resolved').length ?? 0
  const resolved = reports?.filter((r) => r.status === 'resolved').length ?? 0

  return (
    <div className="flex flex-col gap-7 p-5 lg:p-8">
      <div>
        <Tag tone="green">Welcome back</Tag>
        <h2 className="mt-4 text-4xl font-semibold tracking-[-.06em]">
          Hi {user?.full_name?.split(' ')[0] ?? 'there'}, here&apos;s Lahore today.
        </h2>
        <p className="mt-2 text-muted-foreground">See what you&apos;ve reported and what&apos;s happening around the city.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Your open reports" value={String(open)} icon={FileText} />
        <Metric label="Resolved reports" value={String(resolved)} icon={CheckCircle2} tone="green" />
        <Metric
          label="Current temperature"
          value={weather ? `${Math.round(weather.temperature_c)}°C` : weatherLoading ? 'Fetching…' : '—'}
          icon={CloudRain}
          tone="blue"
          note={weather ? `AQI ${weather.aqi ?? '—'} · ${weather.area}` : undefined}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <button
          onClick={onReport}
          className="flex flex-col items-start gap-3 rounded-3xl border border-primary/15 bg-primary p-6 text-left text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5"
        >
          <div className="grid size-10 place-items-center rounded-xl bg-primary-foreground/15">
            <Plus />
          </div>
          <p className="font-semibold">Report an issue</p>
          <p className="text-sm text-primary-foreground/70">Seen a pothole, leak or outage? Tell CivicAI in under a minute.</p>
        </button>
        <button
          onClick={onOpenReports}
          className="flex flex-col items-start gap-3 rounded-3xl border border-border bg-card p-6 text-left shadow-sm transition hover:-translate-y-0.5"
        >
          <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <FileText />
          </div>
          <p className="font-semibold">Track my reports</p>
          <p className="text-sm text-muted-foreground">Follow the status of everything you&apos;ve submitted.</p>
        </button>
        <button
          onClick={onOpenMap}
          className="flex flex-col items-start gap-3 rounded-3xl border border-border bg-card p-6 text-left shadow-sm transition hover:-translate-y-0.5"
        >
          <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <MapPinned />
          </div>
          <p className="font-semibold">Explore the city map</p>
          <p className="text-sm text-muted-foreground">See what&apos;s being reported near you.</p>
        </button>
      </div>
    </div>
  )
}

export function CommandCenter({ onOpenReports, onOpenMap }: { onOpenReports: () => void; onOpenMap: () => void }) {
  const { token } = useAuth()
  const { data: summary, error, loading, refetch } = useApiData(
    () => civicApi.commandCenterSummary(token!),
    [token],
    { enabled: !!token, intervalMs: 45000 },
  )
  const { data: mapIncidents } = useApiData(() => civicApi.mapIncidents(), [], { intervalMs: 60000 })

  const categoryBreakdown = useMemo(() => {
    if (!mapIncidents) return []
    const counts: Record<string, number> = {}
    for (const m of mapIncidents) counts[m.category] = (counts[m.category] || 0) + 1
    return Object.entries(counts)
      .map(([name, value]) => ({ name: titleCase(name), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [mapIncidents])

  const statusData = useMemo(() => {
    if (!summary) return []
    return [
      { name: 'Open', value: summary.open_incident_count },
      { name: 'In progress', value: summary.in_progress_incident_count },
      { name: 'Resolved', value: summary.resolved_incident_count },
    ]
  }, [summary])

  const topIncidentRows = useMemo(() => {
    if (!mapIncidents) return []
    return [...mapIncidents]
      .sort((a, b) => b.impact_score - a.impact_score)
      .slice(0, 5)
      .map((i) => [
        <span key="cat" className="font-medium text-foreground">{titleCase(i.category)}</span>,
        <Tag key="sev" tone={severityTone(i.severity)}>{titleCase(i.severity)}</Tag>,
        titleCase(i.status),
        i.impact_score,
      ])
  }, [mapIncidents])

  const actionRows = useMemo(() => {
    if (!summary) return []
    return summary.recommended_actions.slice(0, 5).map((a) => [
      <span key="cat" className="font-medium text-foreground">{titleCase(a.category)}</span>,
      <span key="act" className="line-clamp-2 text-muted-foreground">{a.action}</span>,
      titleCase(a.department),
      <Tag key="sev" tone={severityTone(a.severity)}>{titleCase(a.severity)}</Tag>,
    ])
  }, [summary])

  const severityTotal = summary ? Object.values(summary.severity_counts).reduce((a, b) => a + b, 0) || 1 : 1

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <Tag tone="blue">
            <Sparkles className="size-3.5" /> Live command center
          </Tag>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-.03em]">City pulse, right now.</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {summary ? `Updated ${parseApiDate(summary.generated_at).toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi' })}` : 'Loading the latest operating picture…'}
          </p>
        </div>
        <div className="flex gap-2">
          <Action variant="outline" onClick={onOpenMap} className="h-9 px-3 text-xs">
            <MapPinned className="size-3.5" /> Open map
          </Action>
          <Action onClick={onOpenReports} className="h-9 px-3 text-xs">View incidents</Action>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={refetch} />}
      {loading && !summary && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading command-center data…
        </div>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <CompactMetric label="Open incidents" value={String(summary.open_incident_count)} icon={AlertTriangle} tone="blue" />
            <CompactMetric label="In progress" value={String(summary.in_progress_incident_count)} icon={Clock3} tone="amber" />
            <CompactMetric label="Resolved" value={String(summary.resolved_incident_count)} icon={CheckCircle2} tone="green" />
            <CompactMetric
              label="Weather"
              value={summary.weather ? `${Math.round(summary.weather.temperature_c)}°C` : 'Fetching…'}
              icon={CloudRain}
              tone="rose"
              note={summary.weather ? `AQI ${summary.weather.aqi ?? '—'}` : undefined}
            />
          </div>

          {/* Compact distribution row */}
          <div className="grid gap-3 lg:grid-cols-3">
            <CompactCard title="Incident distribution" subtitle="Share by severity">
              <div className="mt-3 grid grid-cols-2 gap-2">
                {SEVERITY_ORDER.map((level) => {
                  const value = summary.severity_counts[level]
                  const pct = Math.round((value / severityTotal) * 100)
                  return (
                    <div key={level} className="rounded-xl p-2.5 text-white" style={{ background: severityColorHex(level) }}>
                      <p className="text-[10px] uppercase tracking-wider opacity-80">{titleCase(level)}</p>
                      <p className="mt-1 text-lg font-semibold leading-none">{pct}%</p>
                      <p className="mt-1 text-[10px] opacity-80">{value} incidents</p>
                    </div>
                  )
                })}
              </div>
            </CompactCard>

            <CompactCard title="Incidents by category" subtitle="Live on the map">
              <div className="mt-2 h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryBreakdown} layout="vertical" margin={{ top: 0, right: 14, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tickLine={false} axisLine={false} fontSize={10} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={10} width={78} />
                    <Tooltip formatter={(value) => [`${value} incidents`, 'Count']} contentStyle={tooltipStyle} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cat-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CompactCard>

            <CompactCard title="Status overview" subtitle="Open vs in progress vs resolved">
              <div className="mt-1 h-[110px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={30} outerRadius={48} paddingAngle={2} dataKey="value" stroke="none">
                      {statusData.map((entry, index) => (
                        <Cell key={`status-${index}`} fill={STATUS_COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} incidents`, name]} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1 flex flex-wrap justify-center gap-2 text-[10px] text-muted-foreground">
                {statusData.map((s, i) => (
                  <span key={s.name} className="flex items-center gap-1">
                    <span className="size-2 rounded-full" style={{ background: STATUS_COLORS[i] }} />
                    {s.name} · {s.value}
                  </span>
                ))}
              </div>
            </CompactCard>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
            <section className="relative overflow-hidden rounded-2xl border border-border shadow-sm">
              <LeafletMap
                height={300}
                markers={(mapIncidents ?? []).map((item) => ({
                  id: item.id,
                  lat: item.lat,
                  lng: item.lng,
                  color: severityColorHex(item.severity),
                  tooltip: `${titleCase(item.category)} · impact ${item.impact_score}`,
                }))}
              />
              <div className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-xl border border-white/70 bg-card/95 px-3 py-2 text-xs font-semibold shadow-xl">
                {mapIncidents?.length ?? 0} live incidents across Lahore
              </div>
            </section>

            <CompactCard title="Severity breakdown" subtitle="All tracked incidents">
              <div className="mt-3 flex flex-col gap-2.5">
                {SEVERITY_ORDER.map((level) => {
                  const value = summary.severity_counts[level]
                  const max = Math.max(1, ...Object.values(summary.severity_counts))
                  return (
                    <div key={level}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="capitalize text-muted-foreground">{level}</span>
                        <span className="font-semibold">{value}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-muted">
                        <div className={`h-full rounded-full ${severityDot(level)}`} style={{ width: `${(value / max) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              {summary.top_hotspot && (
                <div className="mt-3 rounded-xl bg-rose-500/10 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-800/70">Top hotspot</p>
                  <p className="mt-1 text-xs font-semibold text-rose-900">{summary.top_hotspot.label}</p>
                  <p className="mt-0.5 text-[11px] text-rose-800/70">
                    {summary.top_hotspot.incident_count} incidents · {titleCase(summary.top_hotspot.top_category)}
                  </p>
                </div>
              )}
            </CompactCard>
          </div>

          {/* Mini tables, side by side */}
          <div className="grid gap-3 lg:grid-cols-2">
            <CompactCard title="Highest-impact incidents" subtitle="Top 5 on the live map">
              <MiniTable columns={['Category', 'Severity', 'Status', 'Impact']} rows={topIncidentRows} />
            </CompactCard>

            {actionRows.length > 0 && (
              <CompactCard title="Recommended actions" subtitle="Needs attention now">
                <MiniTable columns={['Category', 'Action', 'Department', 'Severity']} rows={actionRows} />
              </CompactCard>
            )}
          </div>
        </>
      )}
    </div>
  )
}