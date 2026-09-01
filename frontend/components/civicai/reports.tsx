'use client'

import { useMemo, useState } from 'react'
import { Download, Loader2, Search } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { civicApi, type IncidentStatus, type UrbanIncident } from '@/lib/civicai-api'
import { useApiData } from '@/lib/hooks'
import { parseApiDate, severityTone, timeAgo, titleCase } from '@/lib/geo'
import { Action, ChartCard, EmptyState, ErrorState, Tag } from './shell'
import { IncidentDrawer } from './incident-drawer'

const STATUS_FILTERS: { label: string; value: IncidentStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
]

const PIE_COLORS = ['#1a404a', '#2f7d6b', '#c9922f', '#b8443f', '#5b7fa6', '#8a6fb0']

export function Reports() {
  const [status, setStatus] = useState<IncidentStatus | 'all'>('all')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const { data: incidents, error, loading, refetch } = useApiData(
    () => civicApi.incidents(status === 'all' ? {} : { status }),
    [status],
    { intervalMs: 45000 },
  )

  const filtered = useMemo(() => {
    if (!incidents) return []
    const q = query.trim().toLowerCase()
    const matched = q
      ? incidents.filter((i) => i.category.toLowerCase().includes(q) || i.id.toLowerCase().includes(q))
      : incidents
    // Newest reports first, regardless of whatever order the backend sends them in.
    return [...matched].sort((a, b) => parseApiDate(b.updated_at).getTime() - parseApiDate(a.updated_at).getTime())
  }, [incidents, query])

  const categoryMix = useMemo(() => {
    if (!incidents) return []
    const counts = new Map<string, number>()
    for (const i of incidents) counts.set(i.category, (counts.get(i.category) ?? 0) + 1)
    return Array.from(counts.entries()).map(([name, value]) => ({ name: titleCase(name), value }))
  }, [incidents])

  const dailyTrend = useMemo(() => {
    if (!incidents) return []
    const counts = new Map<string, number>()
    for (const i of incidents) {
      const day = parseApiDate(i.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      counts.set(day, (counts.get(day) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .slice(-10)
      .map(([day, count]) => ({ day, count }))
  }, [incidents])

  return (
    <div className="flex flex-col gap-7 p-5 lg:p-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Tag tone="blue">Incident register</Tag>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-.06em]">Reports</h2>
          <p className="mt-2 text-muted-foreground">Every incident CivicAI has grouped from resident reports, ranked by impact.</p>
        </div>
        <Action variant="outline" onClick={refetch}>
          <Download /> Refresh
        </Action>
      </div>

      {error && <ErrorState message={error} onRetry={refetch} />}

      {incidents && (
        <div className="grid gap-5 lg:grid-cols-2">
          <ChartCard title="Category mix" subtitle="Live distribution across current incidents">
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {categoryMix.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
          <ChartCard title="New incidents by day" subtitle="Based on when each incident was first created">
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#1a404a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-2xl bg-muted p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                status === f.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex h-11 items-center gap-2 rounded-xl border border-input bg-card px-3 sm:w-72">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search category or ID"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      {loading && !incidents && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading incidents…
        </div>
      )}

      {incidents && filtered.length === 0 && <EmptyState title="No incidents match" subtitle="Try a different filter or search term." />}

      {filtered.length > 0 && (
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-semibold">Incident</th>
                <th className="px-5 py-3 font-semibold">Severity</th>
                <th className="px-5 py-3 font-semibold">Impact</th>
                <th className="px-5 py-3 font-semibold">Reports</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((incident: UrbanIncident) => (
                <tr
                  key={incident.id}
                  onClick={() => setOpenId(incident.id)}
                  className="cursor-pointer transition hover:bg-muted/40"
                >
                  <td className="px-5 py-4">
                    <p className="font-semibold">{titleCase(incident.category)}</p>
                    <p className="text-xs text-muted-foreground">#{incident.id.slice(0, 8).toUpperCase()}</p>
                  </td>
                  <td className="px-5 py-4">
                    <Tag tone={severityTone(incident.severity)}>{titleCase(incident.severity)}</Tag>
                  </td>
                  <td className="px-5 py-4 font-semibold">{incident.impact_score}</td>
                  <td className="px-5 py-4 text-muted-foreground">{incident.report_count}</td>
                  <td className="px-5 py-4">
                    <Tag tone={incident.status === 'resolved' ? 'green' : incident.status === 'in_progress' ? 'amber' : 'blue'}>
                      {titleCase(incident.status)}
                    </Tag>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{timeAgo(incident.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openId && <IncidentDrawer incidentId={openId} onClose={() => setOpenId(null)} />}
    </div>
  )
}