// CivicAI API client — talks to the FastAPI backend documented in
// PROJECT_API_REFERENCE.md. Every function here maps 1:1 to a backend route.

export const API_BASE =
  process.env.NEXT_PUBLIC_CIVICAI_API_URL ?? 'http://localhost:8000/api'

// ---------- Shared enums ----------
export type CivicRole = 'citizen' | 'staff'
export type ReportCategory =
  | 'pothole'
  | 'flooding'
  | 'waste'
  | 'streetlight'
  | 'water_leak'
  | 'road_damage'
  | 'other'
export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type IncidentStatus = 'open' | 'in_progress' | 'resolved'
export type Department =
  | 'road_maintenance'
  | 'drainage'
  | 'waste_management'
  | 'municipal_services'
  | 'water_sanitation'
export type FacilityType = 'hospital' | 'school' | 'park'
export type RoadType = 'motorway' | 'trunk' | 'primary' | 'secondary' | 'residential' | 'other'
export type Confirmation = 'still_exists' | 'fixed'

export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  pothole: 'Roads and potholes',
  flooding: 'Flooding and drainage',
  waste: 'Waste collection',
  streetlight: 'Street lighting',
  water_leak: 'Water leak',
  road_damage: 'Road damage',
  other: 'Other',
}

// ---------- Auth ----------
export type CivicUser = {
  id: string
  full_name: string
  email: string
  role: CivicRole
  is_active: boolean
}

export type TokenPair = {
  access_token: string
  refresh_token: string
  token_type: string
}

// ---------- Gov-services assistant (Pass 1, unchanged) ----------
export type Citation = {
  title: string
  url: string
  snippet: string
  source_type: string
}

export type AgentStep = {
  agent: string
  action: string
  detail: string
  timestamp?: string
}

export type ChatResponse = {
  conversation_id: string
  message_id: string
  answer: string
  requires_clarification: boolean
  clarification_question?: string | null
  citations: Citation[]
  agent_trace: AgentStep[]
}

// ---------- Civic reporting ----------
export type CivicReport = {
  id: string
  category: ReportCategory
  description: string | null
  image_url: string
  lat: number
  lng: number
  severity: Severity
  confidence: number
  department: Department
  ai_reasoning: string
  status: IncidentStatus
  incident_id: string | null
  reporter_id: string | null
  citizen_confirmation: Confirmation | null
  citizen_confirmed_at: string | null
  created_at: string
}

export type UrbanIncident = {
  id: string
  category: string
  lat: number
  lng: number
  report_count: number
  severity: Severity
  impact_score: number
  impact_explanation: string
  impact_before: number | null
  impact_after: number | null
  status: IncidentStatus
  resolved_at: string | null
  before_photo_url: string | null
  after_photo_url: string | null
  created_at: string
  updated_at: string
  reports?: CivicReport[]
}

export type MapIncident = {
  id: string
  category: string
  lat: number
  lng: number
  severity: Severity
  impact_score: number
  status: IncidentStatus
  report_count: number
}

export type Hotspot = {
  label: string
  lat: number
  lng: number
  incident_count: number
  avg_impact_score: number
  top_category: string
}

export type OsmRoad = {
  id: string
  osm_id: string
  name: string | null
  road_type: RoadType
  importance_weight: number
  geometry: [number, number][]
  last_synced_at: string
}

export type OsmFacility = {
  id: string
  osm_id: string
  name: string | null
  facility_type: FacilityType
  lat: number
  lng: number
  last_synced_at: string
}

export type WeatherReading = {
  area: string
  temperature_c: number
  humidity_pct: number | null
  rainfall_mm: number | null
  aqi: number | null
  pm2_5: number | null
  recorded_at: string
}

export type AssistantChatResponse = {
  conversation_id: string | null
  answer: string
  citations: { title: string; url: string; snippet: string; source_type: string }[]
  agent_trace: { agent: string; action: string; detail: string }[]
}

export type SeverityCounts = { low: number; medium: number; high: number; critical: number }

export type RecommendedAction = {
  incident_id: string
  category: string
  severity: Severity
  impact_score: number
  department: Department
  action: string
}

export type CommandCenterSummary = {
  open_incident_count: number
  in_progress_incident_count: number
  resolved_incident_count: number
  severity_counts: SeverityCounts
  top_hotspot: Hotspot | null
  weather: WeatherReading | null
  recommended_actions: RecommendedAction[]
  generated_at: string
}

export type RoadClosureResult = {
  road_id: string
  road_name: string | null
  road_type: string
  hours: number
  affected_incidents: { id: string; category: string; severity: Severity; impact_score: number }[]
  nearby_facilities: { name: string | null; type: 'hospital' | 'school'; lat: number; lng: number }[]
  note: string
}

// ---------- Low-level request helper ----------
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, 'Could not reach the CivicAI backend. Check your connection or the API URL.')
  }

  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try {
      const body = await response.json()
      if (typeof body?.detail === 'string') detail = body.detail
      else if (Array.isArray(body?.detail)) detail = body.detail.map((d: { msg?: string }) => d.msg).join(', ')
    } catch {
      // ignore — keep default detail
    }
    throw new ApiError(response.status, detail)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const parts = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  if (!parts.length) return ''
  return '?' + parts.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
}

// ---------- API surface ----------
export const civicApi = {
  // Auth
  register: (full_name: string, email: string, password: string) =>
    request<CivicUser>('/auth/register', { method: 'POST', body: JSON.stringify({ full_name, email, password }) }),
  login: (email: string, password: string) =>
    request<TokenPair>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  refresh: (refresh_token: string) =>
    request<TokenPair>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refresh_token }) }),
  me: (token: string) => request<CivicUser>('/auth/me', {}, token),

  // Gov-services AI assistant (Pass 1 — unchanged, still available)
  chat: (token: string, message: string, conversation_id?: string | null) =>
    request<ChatResponse>('/chat', { method: 'POST', body: JSON.stringify({ message, conversation_id }) }, token),

  // Reporting
  submitReport: (
    token: string,
    payload: {
      lat: number
      lng: number
      description?: string
      category?: ReportCategory
      image?: File | null
      image_url?: string
    },
  ) => {
    const form = new FormData()
    form.set('lat', String(payload.lat))
    form.set('lng', String(payload.lng))
    if (payload.description) form.set('description', payload.description)
    if (payload.category) form.set('category', payload.category)
    if (payload.image) form.set('image', payload.image)
    else if (payload.image_url) form.set('image_url', payload.image_url)
    return request<CivicReport>('/reports', { method: 'POST', body: form }, token)
  },
  myReports: (token: string, status?: IncidentStatus) =>
    request<CivicReport[]>(`/reports/mine${qs({ status })}`, {}, token),
  confirmReport: (token: string, reportId: string, confirmation: Confirmation) =>
    request<CivicReport>(
      `/reports/${reportId}/confirm`,
      { method: 'POST', body: JSON.stringify({ confirmation }) },
      token,
    ),

  // Incidents
  incidents: (params: { status?: IncidentStatus; category?: string } = {}, token?: string) =>
    request<UrbanIncident[]>(`/incidents${qs(params)}`, {}, token),
  incident: (incidentId: string, token?: string) =>
    request<UrbanIncident>(`/incidents/${incidentId}`, {}, token),
  incidentImpact: (incidentId: string) =>
    request<UrbanIncident>(`/incidents/${incidentId}/impact`),
  setIncidentStatus: (token: string, incidentId: string, status: 'open' | 'in_progress') =>
    request<UrbanIncident>(
      `/incidents/${incidentId}/status`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
      token,
    ),
  resolveIncident: (token: string, incidentId: string, photos: { before_photo_url?: string; after_photo_url?: string } = {}) =>
    request<UrbanIncident>(`/incidents/${incidentId}/resolve`, { method: 'POST', body: JSON.stringify(photos) }, token),

  // Map / OSM
  mapIncidents: () => request<MapIncident[]>('/map/incidents'),
  hotspots: (limit = 10) => request<Hotspot[]>(`/map/hotspots${qs({ limit })}`),
  osmRoads: (road_type?: RoadType) => request<OsmRoad[]>(`/osm/roads${qs({ road_type })}`),
  osmFacilities: (facility_type?: FacilityType) => request<OsmFacility[]>(`/osm/facilities${qs({ facility_type })}`),

  // Weather
  weather: (force_refresh = false) => request<WeatherReading>(`/weather/current${qs({ force_refresh })}`),

  // City AI assistant
  assistantChat: (token: string, message: string, conversation_id?: string | null) =>
    request<AssistantChatResponse>(
      '/assistant/chat',
      { method: 'POST', body: JSON.stringify({ message, conversation_id }) },
      token,
    ),

  // Command center (staff only)
  commandCenterSummary: (token: string) => request<CommandCenterSummary>('/command-center/summary', {}, token),

  // Road closure simulation (staff only)
  simulateRoadClosure: (token: string, road_id: string, hours: number) =>
    request<RoadClosureResult>(
      '/simulate/road-closure',
      { method: 'POST', body: JSON.stringify({ road_id, hours }) },
      token,
    ),
}

export function mediaUrl(path: string): string {
  if (!path) return path
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const origin = API_BASE.replace(/\/api\/?$/, '')
  return `${origin}${path}`
}
