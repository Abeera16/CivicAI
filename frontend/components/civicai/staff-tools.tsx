'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, CloudRain, Droplets, Loader2, Navigation, RefreshCcw, Thermometer, Wind } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { civicApi } from '@/lib/civicai-api'
import { useApiData } from '@/lib/hooks'
import { severityTone, titleCase } from '@/lib/geo'
import { Action, CompactCard, ErrorState, MiniTable, Tag } from './shell'

function aqiTone(aqi: number | null): 'green' | 'amber' | 'rose' {
  if (aqi === null) return 'green'
  if (aqi > 150) return 'rose'
  if (aqi > 100) return 'amber'
  return 'green'
}

// Most backends (including this one) serialize timestamps as naive UTC —
// e.g. Python's `datetime.isoformat()` produces "2026-08-31T03:58:00" with no
// trailing 'Z' or +offset. Per the JS spec, a date-time string with no
// timezone designator is parsed as the *browser's local time*, not UTC — so
// on a machine outside Asia/Karachi the same reading silently shows the wrong
// hour, and even a `timeZone: 'Asia/Karachi'` conversion downstream never
// actually applies. Assume UTC whenever no offset is present so every
// timestamp converts correctly for any viewer, anywhere.
function parseApiDate(value: string): Date {
  const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(value)
  return new Date(hasTimezone ? value : `${value}Z`)
}

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

function Gauge({ value, min, max, label, unit, color, note }: { value: number; min: number; max: number; label: string; unit: string; color: string; note?: string }) {
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
  const data = [
    { name: 'value', value: percentage },
    { name: 'rest', value: 100 - percentage }
  ]
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col items-center relative overflow-hidden transition hover:shadow-md">
      <h3 className="w-full text-left text-xs font-semibold text-muted-foreground absolute top-4 left-4">{label}</h3>
      <div className="h-[92px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={52}
              outerRadius={68}
              dataKey="value"
              stroke="none"
              cornerRadius={4}
            >
              <Cell fill={color} />
              <Cell fill="var(--muted)" style={{ opacity: 0.3 }} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="-mt-4 text-center z-10">
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}<span className="text-sm text-muted-foreground ml-1">{unit}</span></p>
      </div>
      {note && <p className="mt-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{note}</p>}
    </div>
  )
}

function getAqiColor(aqi: number) {
  if (aqi <= 50) return '#10b981'
  if (aqi <= 100) return '#f59e0b'
  if (aqi <= 150) return '#f97316'
  if (aqi <= 200) return '#ef4444'
  return '#8b5cf6'
}

const AQI_BANDS = [
  { label: 'Good', width: 50, color: '#10b981' },
  { label: 'Satisfactory', width: 50, color: '#f59e0b' },
  { label: 'Moderate', width: 50, color: '#f97316' },
  { label: 'Poor', width: 50, color: '#ef4444' },
  { label: 'Severe', width: 100, color: '#8b5cf6' },
]
const AQI_SCALE_MAX = AQI_BANDS.reduce((sum, b) => sum + b.width, 0)

const clamp = (n: number) => Math.min(100, Math.max(0, n))

export function WeatherPanel() {
  const { data: weather, error, loading, refetch } = useApiData(() => civicApi.weather(), [], { intervalMs: 5 * 60000 })

  // Multi-ring radial gauge — each metric normalized to 0-100 and drawn as a concentric ring
  const radialData = weather
    ? [
        { name: 'AQI', value: clamp(((weather.aqi ?? 0) / 300) * 100), fill: '#8b5cf6' },
        { name: 'Rainfall', value: clamp(((weather.rainfall_mm ?? 0) / 50) * 100), fill: '#6366f1' },
        { name: 'Humidity', value: clamp(weather.humidity_pct ?? 0), fill: '#0ea5e9' },
        { name: 'Temperature', value: clamp((weather.temperature_c / 50) * 100), fill: '#3b82f6' },
      ]
    : []

  // Risk breakdown — how much each factor is contributing to overall conditions risk right now
  const riskData = weather
    ? (() => {
        const heat = clamp(((weather.temperature_c - 20) / 25) * 100)
        const humidity = clamp((Math.abs((weather.humidity_pct ?? 50) - 50) / 50) * 100)
        const rain = clamp(((weather.rainfall_mm ?? 0) / 30) * 100)
        const air = clamp(((weather.aqi ?? 0) / 300) * 100)
        return [
          { name: 'Air quality', value: air, fill: '#8b5cf6' },
          { name: 'Rainfall', value: rain, fill: '#6366f1' },
          { name: 'Heat', value: heat, fill: '#f97316' },
          { name: 'Humidity', value: humidity, fill: '#0ea5e9' },
        ]
      })()
    : []

  // Comfort comparison — current reading vs a comfortable reference value
  const comfortData = weather
    ? [
        { metric: 'Temp (°C)', current: Math.round(weather.temperature_c), comfortable: 24 },
        { metric: 'Humidity (%)', current: weather.humidity_pct !== null ? Math.round(weather.humidity_pct) : 0, comfortable: 50 },
      ]
    : []

  const aqiMarkerLeft = weather ? clamp(((weather.aqi ?? 0) / AQI_SCALE_MAX) * 100) : 0

  const readingRows: ReactNode[][] = weather
    ? [
        ['Temperature', `${Math.round(weather.temperature_c)}°C`, weather.area],
        ['Humidity', weather.humidity_pct !== null ? `${Math.round(weather.humidity_pct)}%` : '—', '—'],
        ['Rainfall', weather.rainfall_mm !== null ? `${weather.rainfall_mm.toFixed(1)} mm` : '—', '—'],
        ['AQI', weather.aqi !== null ? String(Math.round(weather.aqi)) : '—', <Tag key="t" tone={aqiTone(weather.aqi)}>{aqiTone(weather.aqi) === 'green' ? 'Safe' : aqiTone(weather.aqi) === 'amber' ? 'Elevated' : 'High risk'}</Tag>],
        ['PM2.5', weather.pm2_5 !== null ? `${weather.pm2_5.toFixed(1)} µg/m³` : '—', '—'],
      ]
    : []

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <Tag tone="blue">Environmental signal</Tag>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-.03em]">Weather & Air Quality</h2>
          <p className="mt-1 text-sm text-muted-foreground">Live conditions used to weight incident severity and response urgency.</p>
        </div>
        <Action
          variant="outline"
          className="h-9 px-3 text-xs"
          onClick={() =>
            civicApi.weather(true).then(() => refetch()).catch(() => refetch())
          }
        >
          <RefreshCcw className="size-3.5" /> {loading ? 'Refreshing…' : 'Force refresh'}
        </Action>
      </div>

      {error && <ErrorState message={error} onRetry={refetch} />}
      {loading && !weather && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading current conditions…
        </div>
      )}

      {weather && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Gauge value={Math.round(weather.temperature_c)} min={0} max={50} label="Temperature" unit="°C" color="#3b82f6" note={weather.area} />
            <Gauge value={weather.humidity_pct !== null ? Math.round(weather.humidity_pct) : 0} min={0} max={100} label="Humidity" unit="%" color="#0ea5e9" />
            <Gauge value={weather.rainfall_mm !== null ? Number(weather.rainfall_mm.toFixed(1)) : 0} min={0} max={50} label="Rainfall" unit="mm" color="#6366f1" />
            <Gauge
              value={weather.aqi !== null ? Math.round(weather.aqi) : 0}
              min={0} max={300}
              label="AQI" unit=""
              color={getAqiColor(weather.aqi ?? 0)}
              note={weather.pm2_5 !== null ? `PM2.5 ${weather.pm2_5.toFixed(1)}` : undefined}
            />
          </div>

          {/* Bento block 1 — big multi-ring gauge left, two stacked visuals right */}
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CompactCard title="Conditions overview" subtitle="Every reading as a normalized ring, 0–100 scale">
                <div className="mt-1 h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart innerRadius="28%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
                      <RadialBar dataKey="value" background={{ fill: 'var(--muted)', opacity: 0.25 }} cornerRadius={8} />
                      <Legend
                        iconSize={8}
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        wrapperStyle={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value, name) => [`${Math.round(Number(value))}%`, name]}
                        contentStyle={{ borderRadius: '10px', border: '1px solid hsl(var(--border))', fontSize: 12 }}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
              </CompactCard>
            </div>

            <div className="flex flex-col gap-3">
              <CompactCard title="AQI scale position" subtitle="Standard 0–300 scale">
                <div className="mt-7 px-1">
                  <div className="relative h-4 w-full overflow-hidden rounded-full flex">
                    {AQI_BANDS.map((band) => (
                      <div key={band.label} className="h-full" style={{ width: `${(band.width / AQI_SCALE_MAX) * 100}%`, background: band.color }} />
                    ))}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-3.5 rounded-full border-[3px] border-card bg-foreground shadow-lg"
                      style={{ left: `${aqiMarkerLeft}%` }}
                      title={`Current AQI: ${weather.aqi ?? '—'}`}
                    />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Current: <span className="font-semibold text-foreground">{weather.aqi ?? '—'} AQI</span>
                  </p>
                </div>
              </CompactCard>

              <CompactCard title="Risk breakdown" subtitle="Relative share of current risk" className="flex-1">
                <div className="mt-1 h-[130px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={riskData} cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={2} dataKey="value" stroke="none">
                        {riskData.map((entry, index) => (
                          <Cell key={`risk-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`${Math.round(Number(value))}%`, name]} contentStyle={{ borderRadius: '10px', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CompactCard>
            </div>
          </div>

          {/* Bento block 2 — mirrored: comfort comparison left, wide readings table right */}
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="lg:order-1">
              <CompactCard title="Comfort comparison" subtitle="Today vs a comfortable reference">
                <div className="mt-3 h-[190px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comfortData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="metric" tickLine={false} axisLine={false} fontSize={10} />
                      <YAxis tickLine={false} axisLine={false} fontSize={10} width={24} />
                      <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="current" name="Current" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="comfortable" name="Comfortable" fill="#a3a3a3" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CompactCard>
            </div>

            <div className="lg:col-span-2 lg:order-2">
              <CompactCard title="Current readings" subtitle="Every live metric behind the visuals above">
                <MiniTable columns={['Metric', 'Value', 'Note']} rows={readingRows} />
              </CompactCard>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Wind className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Operational impact</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Reading recorded at <strong className="text-foreground">{parseApiDate(weather.recorded_at).toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' })}</strong> for <strong className="text-foreground">{weather.area}</strong>.
                Elevated rainfall and AQI feed directly into how CivicAI scores incident severity for flooding, drainage, and respiratory-risk categories.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const MAJOR_ROAD_TYPES = ['motorway', 'trunk', 'primary', 'secondary'] as const

export function RoadSimulation() {
  const { token } = useAuth()
  // 50k+ residential streets is unusable in a picker — load only the major
  // arteries a real closure-planning tool would care about, in parallel.
  const { data: roadLists } = useApiData(
    () => Promise.all(MAJOR_ROAD_TYPES.map((t) => civicApi.osmRoads(t))),
    [],
  )
  const allRoads = useMemo(() => {
    const merged = (roadLists ?? []).flat()
    // Motorways/trunk roads in OSM are usually tagged with a route number
    // (e.g. "M-2"), not a name, so they show up as indistinguishable
    // "Unnamed road" entries. Keep only named roads by default — a human
    // picking a road to close needs something recognizable to pick between.
    const named = merged.filter((r) => r.name && r.name.trim().length > 0)
    const pool = named.length > 0 ? named : merged

    // Long roads (e.g. "Canal Road") are mapped as many separate OSM way
    // segments sharing the same name — a person picks a road by name, not
    // by segment, so collapse each name down to one representative segment
    // (the highest-importance one, tie-broken by longest geometry).
    const byName = new Map<string, (typeof pool)[number]>()
    for (const road of pool) {
      const key = road.name!.trim().toLowerCase()
      const existing = byName.get(key)
      if (
        !existing ||
        road.importance_weight > existing.importance_weight ||
        (road.importance_weight === existing.importance_weight && road.geometry.length > existing.geometry.length)
      ) {
        byName.set(key, road)
      }
    }

    return Array.from(byName.values()).sort(
      (a, b) => b.importance_weight - a.importance_weight || (a.name ?? '').localeCompare(b.name ?? ''),
    )
  }, [roadLists])

  const [search, setSearch] = useState('')
  const roads = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allRoads
    return allRoads.filter((r) => (r.name ?? 'unnamed road').toLowerCase().includes(q))
  }, [allRoads, search])

  const [roadId, setRoadId] = useState('')
  const [hours, setHours] = useState(4)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Awaited<ReturnType<typeof civicApi.simulateRoadClosure>> | null>(null)

  // The simulate endpoint keys off OSM's own id (road_id = osm_id, per
  // PROJECT_API_REFERENCE.md), not our internal DB primary key — using the
  // wrong one gives a "No OSM road found" error even for a valid selection.
  const selectedRoadId = roads.some((r) => r.osm_id === roadId) ? roadId : roads[0]?.osm_id ?? ''

  async function runSimulation() {
    if (!token || !selectedRoadId) return
    setRunning(true)
    setError(null)
    try {
      const res = await civicApi.simulateRoadClosure(token, selectedRoadId, hours)
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not run the simulation.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-col gap-7 p-5 lg:p-8">
      <div>
        <Tag tone="amber">Scenario planning</Tag>
        <h2 className="mt-4 text-4xl font-semibold tracking-[-.06em]">Road closure simulation</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Model the impact of closing a real Lahore road segment — see which live incidents and nearby facilities would be affected.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Search roads
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by road name…"
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm font-normal outline-none focus:ring-4 focus:ring-primary/10"
            />
          </label>
          <label className="mt-4 flex flex-col gap-2 text-sm font-semibold">
            Road segment {allRoads.length > 0 && <span className="font-normal text-muted-foreground">({roads.length} of {allRoads.length} named major roads)</span>}
            <select
              value={selectedRoadId}
              onChange={(e) => setRoadId(e.target.value)}
              className="h-11 rounded-xl border border-input bg-background px-3 font-normal"
            >
              {roads.length === 0 && <option value="">No matching roads</option>}
              {roads.slice(0, 500).map((r) => (
                <option key={r.id} value={r.osm_id}>
                  {r.name ?? 'Unnamed road'} · {titleCase(r.road_type)}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-5 flex flex-col gap-2 text-sm font-semibold">
            Closure duration: <span className="font-normal text-muted-foreground">{hours} hours</span>
            <input type="range" min={1} max={48} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="accent-primary" />
          </label>
          {error && <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-700">{error}</p>}
          <Action className="mt-6 w-full" onClick={runSimulation} disabled={running || !selectedRoadId}>
            {running ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Running simulation
              </>
            ) : (
              <>
                <Navigation /> Run simulation
              </>
            )}
          </Action>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">Simulation result</h3>
          {!result && <p className="mt-3 text-sm text-muted-foreground">Run a simulation to see affected incidents and nearby facilities.</p>}
          {result && (
            <div className="mt-4 flex flex-col gap-4">
              <p className="rounded-xl bg-amber-500/10 p-4 text-sm leading-6 text-amber-900">{result.note}</p>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Affected incidents ({result.affected_incidents.length})
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  {result.affected_incidents.map((i) => (
                    <div key={i.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                      <span>{titleCase(i.category)}</span>
                      <Tag tone={severityTone(i.severity)}>{titleCase(i.severity)}</Tag>
                    </div>
                  ))}
                  {result.affected_incidents.length === 0 && <p className="text-sm text-muted-foreground">No nearby active incidents.</p>}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Nearby facilities ({result.nearby_facilities.length})
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  {result.nearby_facilities.map((f, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="size-3.5 text-amber-600" /> {f.name ?? 'Unnamed facility'}
                      </span>
                      <span className="text-xs uppercase text-muted-foreground">{f.type}</span>
                    </div>
                  ))}
                  {result.nearby_facilities.length === 0 && <p className="text-sm text-muted-foreground">No sensitive facilities nearby.</p>}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}