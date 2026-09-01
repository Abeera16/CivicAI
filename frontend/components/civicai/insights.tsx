'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, Loader2, RefreshCcw, Sparkles } from 'lucide-react'
import {
  Area,
  AreaChart,
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
import { useAuth } from '@/lib/auth-context'
import { civicApi, CATEGORY_LABELS, ReportCategory } from '@/lib/civicai-api'
import { useApiData } from '@/lib/hooks'
import { parseApiDate, severityColorHex, severityTone, timeAgo, titleCase } from '@/lib/geo'
import { Action, CompactCard, CompactMetric, ErrorState, MiniTable, Tag } from './shell'

const COLORS = ['#2f7d6b', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#10b981']
const STATUS_COLORS = ['#3b82f6', '#f59e0b', '#10b981']
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const

const tooltipStyle = { borderRadius: '10px', border: '1px solid hsl(var(--border))', fontSize: 12 }

export function Insights() {
  const { token } = useAuth()
  const { data: summary, error, loading, refetch } = useApiData(
    () => civicApi.commandCenterSummary(token!),
    [token],
    { enabled: !!token, intervalMs: 45000 },
  )
  const { data: incidents } = useApiData(() => civicApi.incidents({}), [], { intervalMs: 60000 })

  const [briefing, setBriefing] = useState<string | null>(null)
  const [briefingLoading, setBriefingLoading] = useState(false)

  const hourly = useMemo(() => {
    if (!incidents) return []
    const buckets = new Array(24).fill(0)
    for (const i of incidents) buckets[parseApiDate(i.created_at).getHours()] += 1
    return buckets.map((count, hour) => ({ hour: `${hour}`, count }))
  }, [incidents])

  const categoryData = useMemo(() => {
    if (!incidents) return []
    const counts: Record<string, number> = {}
    for (const i of incidents) counts[i.category] = (counts[i.category] || 0) + 1
    return Object.entries(counts)
      .map(([name, value]) => ({ name: CATEGORY_LABELS[name as ReportCategory] || titleCase(name), value }))
      .sort((a, b) => b.value - a.value)
  }, [incidents])

  const weekdayData = useMemo(() => {
    if (!incidents) return []
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const buckets = new Array(7).fill(0)
    for (const i of incidents) buckets[parseApiDate(i.created_at).getDay()] += 1
    return days.map((day, idx) => ({ day, count: buckets[idx] }))
  }, [incidents])

  const impactByCategory = useMemo(() => {
    if (!incidents) return []
    const sums: Record<string, { total: number; count: number }> = {}
    for (const i of incidents) {
      const key = CATEGORY_LABELS[i.category as ReportCategory] || titleCase(i.category)
      if (!sums[key]) sums[key] = { total: 0, count: 0 }
      sums[key].total += i.impact_score
      sums[key].count += 1
    }
    return Object.entries(sums)
      .map(([name, { total, count }]) => ({ name, avgImpact: Math.round((total / count) * 10) / 10 }))
      .sort((a, b) => b.avgImpact - a.avgImpact)
      .slice(0, 5)
  }, [incidents])

  const severityData = useMemo(() => {
    if (!summary) return []
    return SEVERITY_ORDER.map((level) => ({ name: titleCase(level), level, value: summary.severity_counts[level] }))
  }, [summary])

  const statusData = useMemo(() => {
    if (!summary) return []
    return [
      { name: 'Open', value: summary.open_incident_count },
      { name: 'In progress', value: summary.in_progress_incident_count },
      { name: 'Resolved', value: summary.resolved_incident_count },
    ]
  }, [summary])

  const topCategoryRows = useMemo(() => {
    const total = categoryData.reduce((sum, c) => sum + c.value, 0) || 1
    return categoryData.slice(0, 5).map((c) => [
      <span key="name" className="font-medium text-foreground">{c.name}</span>,
      c.value,
      `${Math.round((c.value / total) * 100)}%`,
    ])
  }, [categoryData])

  const recentRows = useMemo(() => {
    if (!incidents) return []
    return [...incidents]
      .sort((a, b) => parseApiDate(b.created_at).getTime() - parseApiDate(a.created_at).getTime())
      .slice(0, 5)
      .map((i) => [
        <span key="cat" className="font-medium text-foreground">{titleCase(i.category)}</span>,
        <Tag key="sev" tone={severityTone(i.severity)}>{titleCase(i.severity)}</Tag>,
        titleCase(i.status),
        timeAgo(i.created_at),
      ])
  }, [incidents])

  const actionRows = useMemo(() => {
    if (!summary) return []
    return summary.recommended_actions.slice(0, 6).map((a) => [
      <span key="cat" className="font-medium text-foreground">{titleCase(a.category)}</span>,
      <span key="act" className="line-clamp-2 text-muted-foreground">{a.action}</span>,
      titleCase(a.department),
      <Tag key="sev" tone={a.severity === 'critical' ? 'rose' : a.severity === 'high' ? 'amber' : 'blue'}>
        {a.impact_score}
      </Tag>,
    ])
  }, [summary])

  async function generateBriefing() {
    if (!token) return
    setBriefingLoading(true)
    try {
      const res = await civicApi.assistantChat(
        token,
        'Give city operations a short, plain-language briefing of the current civic situation across Lahore based on live incident data — 3 to 4 sentences.',
      )
      setBriefing(res.answer)
    } catch {
      setBriefing('Could not generate a briefing right now — please try again shortly.')
    } finally {
      setBriefingLoading(false)
    }
  }

  const severity = summary?.severity_counts

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <Tag tone="blue">Command intelligence</Tag>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-.03em]">Insights</h2>
          <p className="mt-1 text-sm text-muted-foreground">A live read on how Lahore is trending, built from real incident data.</p>
        </div>
        <Action variant="outline" onClick={refetch} className="h-9 px-3 text-xs">
          <RefreshCcw className="size-3.5" /> Refresh
        </Action>
      </div>

      {error && <ErrorState message={error} onRetry={refetch} />}

      {severity && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CompactMetric label="Open incidents" value={String(summary!.open_incident_count)} icon={AlertTriangle} tone="blue" />
          <CompactMetric label="In progress" value={String(summary!.in_progress_incident_count)} icon={Clock3} tone="amber" />
          <CompactMetric label="Resolved" value={String(summary!.resolved_incident_count)} icon={CheckCircle2} tone="green" />
          <CompactMetric label="Critical severity" value={String(severity.critical)} icon={AlertTriangle} tone="rose" />
        </div>
      )}

      {loading && !summary && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading command-center intelligence…
        </div>
      )}

      {/* Bento block 1 — big chart left, two stacked charts right */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CompactCard title="Reporting rhythm" subtitle="Incidents created by hour of day">
            <div className="mt-3 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourly} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2f7d6b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2f7d6b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={11} interval={2} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} width={26} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="count" stroke="#2f7d6b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CompactCard>
        </div>

        <div className="flex flex-col gap-3">
          <CompactCard title="Incident categories" subtitle="Share by type">
            <div className="mt-1 h-[135px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={36} outerRadius={56} paddingAngle={2} dataKey="value" stroke="none">
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} incidents`, 'Count']} contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CompactCard>

          <CompactCard title="Severity distribution" subtitle="Current incidents" className="flex-1">
            <div className="mt-3 h-[125px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} />
                  <YAxis tickLine={false} axisLine={false} fontSize={10} allowDecimals={false} width={24} />
                  <Tooltip formatter={(value) => [`${value} incidents`, 'Count']} contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {severityData.map((entry, index) => (
                      <Cell key={`sev-${index}`} fill={severityColorHex(entry.level)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CompactCard>
        </div>
      </div>

      {/* Bento block 2 — mirrored: two stacked charts left, big chart right */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:order-1">
          <CompactCard title="Status breakdown" subtitle="Where incidents stand">
            <div className="mt-1 h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={32} outerRadius={50} paddingAngle={2} dataKey="value" stroke="none">
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

          <CompactCard title="Weekly pattern" subtitle="Reports by weekday" className="flex-1">
            <div className="mt-3 h-[130px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={10} />
                  <YAxis tickLine={false} axisLine={false} fontSize={10} allowDecimals={false} width={24} />
                  <Tooltip formatter={(value) => [`${value} incidents`, 'Count']} contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CompactCard>
        </div>

        <div className="lg:col-span-2 lg:order-2">
          <CompactCard title="Average impact by category" subtitle="Which categories carry the highest impact score">
            <div className="mt-3 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={impactByCategory} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={11} width={110} />
                  <Tooltip formatter={(value) => [value, 'Avg impact']} contentStyle={tooltipStyle} />
                  <Bar dataKey="avgImpact" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CompactCard>
        </div>
      </div>

      {/* Mini tables, side by side */}
      <div className="grid gap-3 lg:grid-cols-2">
        <CompactCard title="Top categories" subtitle="Ranked by volume, all time">
          <MiniTable columns={['Category', 'Incidents', 'Share']} rows={topCategoryRows} />
        </CompactCard>

        <CompactCard title="Recent incidents" subtitle="Latest 5 reported">
          <MiniTable columns={['Category', 'Severity', 'Status', 'Reported']} rows={recentRows} />
        </CompactCard>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <CompactCard title="AI situational briefing" subtitle="Generated live from current incident data" action={<Sparkles className="size-4 text-accent" />}>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {briefing ?? 'Generate a live, grounded summary of the current city situation using the CivicAI assistant.'}
          </p>
          <div className="mt-3">
            <Action variant="outline" onClick={generateBriefing} disabled={briefingLoading} className="h-8 px-3 text-xs">
              {briefingLoading ? <Loader2 className="size-3.5 animate-spin" /> : 'Generate new briefing'}
            </Action>
          </div>
        </CompactCard>

        {summary?.top_hotspot && (
          <CompactCard title="Top hotspot" subtitle="Strongest concentration of unresolved signals">
            <div className="mt-3 flex items-start justify-between rounded-xl border border-rose-500/10 bg-rose-500/5 p-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{summary.top_hotspot.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {summary.top_hotspot.incident_count} incidents · {titleCase(summary.top_hotspot.top_category)}
                </p>
              </div>
              <Tag tone="rose">Impact {summary.top_hotspot.avg_impact_score.toFixed(0)}</Tag>
            </div>
          </CompactCard>
        )}
      </div>

      {actionRows.length > 0 && (
        <CompactCard title="Recommended actions" subtitle="Highest-impact incidents that need attention now">
          <MiniTable columns={['Category', 'Action', 'Department', 'Impact']} rows={actionRows} />
        </CompactCard>
      )}
    </div>
  )
}