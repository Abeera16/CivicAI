# CivicAI Android — API Integration Map

This document maps every screen in the app to the exact endpoint(s) it calls from
**CivicAI — Lahore Urban Intelligence API Reference**, and says plainly where a
screen had to make a judgment call because the API doc doesn't cover something.

Nothing in this app uses hardcoded/mock report, incident, weather, or user data.
Every list, card, chip, and number you see on screen comes from a live network
call at runtime. The only static content is UI copy (labels, placeholders,
empty-state messages) and the onboarding illustration on the Welcome screen.

## 1. Where the base URL and auth live

- `local.properties` → `CIVICAI_BASE_URL` → injected as `BuildConfig.CIVICAI_BASE_URL`
  → used by `data/remote/NetworkModule.kt` to build the single Retrofit instance
  every repository shares.
- JWT access/refresh tokens are persisted in `data/local/TokenManager.kt`
  (Jetpack DataStore). `data/remote/NetworkModule.kt`'s `AuthInterceptor`:
  1. Attaches `Authorization: Bearer <access_token>` to every outgoing request.
  2. On a `401`, calls `POST /auth/refresh` once and retries the original
     request with the new token (per API §2.4 — access tokens expire in 60
     minutes). If refresh also fails, the 401 propagates and the UI's
     `ApiResult.Error` path is shown.
- `data/local/TokenManager.kt` also stores the signed-in user's `role`
  (from `GET /auth/me`), which `MainActivity.kt` reads and passes down through
  `CivicNavGraph` so staff-only UI (Command Center FAB, incident resolve
  actions) only renders for `role == "staff"`, matching API §2's role model.

## 2. Screen → endpoint map

| Screen (file) | Endpoint(s) called | Repository |
|---|---|---|
| Welcome (`ui/screens/welcome/WelcomeScreen.kt`) | none — pure onboarding UI | — |
| Sign In (`ui/screens/auth/LoginScreen.kt`) | `POST /auth/login`, then `GET /auth/me` | `AuthRepository` |
| Create account (`ui/screens/auth/RegisterScreen.kt`) | `POST /auth/register`, then login flow above | `AuthRepository` |
| Home (`ui/screens/home/HomeScreen.kt`) | `GET /map/incidents`, `GET /weather/current` | `CityDataRepository` |
| Report a Problem (`ui/screens/report/ReportScreen.kt`) | `POST /reports` (multipart) | `ReportsRepository` |
| Nearby / map (`ui/screens/nearby/NearbyScreen.kt`) | `GET /map/incidents`, `GET /map/hotspots`, `GET /osm/facilities` | `CityDataRepository` |
| My Reports (`ui/screens/myreports/MyReportsScreen.kt`) | `GET /reports/mine`, `POST /reports/{id}/confirm` | `ReportsRepository` |
| Alerts (`ui/screens/alerts/AlertsScreen.kt`) | `GET /reports/mine` (derived — see §3 below) | `ReportsRepository` |
| Ask CivicAI (`ui/screens/chat/ChatScreen.kt`) | `POST /assistant/chat` | `AssistantRepository` |
| Incident detail (`ui/screens/incident/IncidentDetailScreen.kt`) | `GET /incidents/{id}`, `PATCH /incidents/{id}/status`, `POST /incidents/{id}/resolve` | `IncidentsRepository` |
| Command Center (`ui/screens/commandcenter/CommandCenterScreen.kt`) | `GET /command-center/summary`, `GET /osm/roads`, `POST /simulate/road-closure` | `CityDataRepository` |

Every endpoint in the reference doc is implemented in
`data/remote/CivicAiApiService.kt`, including ones no screen calls yet
(`POST /osm/sync`, `GET /incidents` list, `GET /incidents/{id}/impact`) —
they're there ready to wire into a future screen (e.g. a full incidents
browser) without touching the network layer.

## 3. The one honest gap: Alerts / notifications

The API reference has **no notifications/alerts endpoint** — nothing under
`/alerts`, no push/WebSocket channel, nothing in §3 or §4. Rather than
hardcode fake alert data to match the screenshot, `AlertsViewModel.kt` derives
a real, sorted alert feed from the signed-in user's actual reports
(`GET /reports/mine`):

- one "received" alert per report (from `created_at`)
- a follow-up "investigating" alert if `status` has reached `in_progress`
  or `resolved`
- a "resolved" alert once `status == "resolved"`

Every alert links back to a real `report_id` / `incident_id` — tapping one
opens the real incident via `GET /incidents/{id}`. This is clearly commented
in the source. If the backend later adds a real alerts/push endpoint, replace
the body of `AlertsViewModel.load()` with a direct call to it; the `AlertUi`
model and `AlertsScreen.kt` UI don't need to change.

## 4. Other judgment calls (all non-hardcoded, all documented in code)

- **Guest mode**: "Continue as guest" (Login screen) skips auth and drops the
  user straight into Home. Screens that require auth (Report, My Reports,
  Alerts, Chat) will surface the real `401` from the backend via
  `ApiResult.Error` if a guest reaches them — the API doc doesn't specify a
  client-side guest allowlist, so the server's own auth response is the
  source of truth.
- **Distance-from-me sorting** on Home/Nearby uses the device's real GPS via
  `FusedLocationProviderClient` (`util/LocationUtils.kt`) and a haversine
  calculation (`ui/components/Cards.kt: distanceMeters`) against each
  incident's real `lat`/`lng` from the API — no simulated location.
- **Image URLs**: `civic_report.image_url` per the API doc can be a relative
  `/media/...` path. `ui/components/Cards.kt: ReportThumbnail` resolves that
  against `BuildConfig.CIVICAI_BASE_URL` automatically.
- **Staff gating**: any screen/action the doc marks "Auth: staff" is hidden
  behind `role == "staff"` client-side (Command Center FAB, incident
  status/resolve buttons) *and* still handles a raw `403` gracefully if a
  citizen reaches it via a deep link, per the API doc's explicit instruction
  in §2.

## 5. Backend setup checklist

1. Run your CivicAI backend locally (or point at a hosted instance).
2. Copy `local.properties.example` → `local.properties` and set:
   - `sdk.dir` to your local Android SDK path
   - `CIVICAI_BASE_URL` — use `http://10.0.2.2:8000/api/` for the emulator
     talking to a backend on your host machine, or your LAN IP
     (`http://192.168.x.x:8000/api/`) for a physical device on the same
     Wi-Fi, or your real HTTPS URL for a deployed backend.
   - `MAPS_API_KEY` — only required for the Nearby map screen (Google Maps
     Compose). Get one at https://console.cloud.google.com/google/maps-apis
     with the "Maps SDK for Android" enabled.
3. `network_security_config.xml` allows cleartext HTTP only to
   `10.0.2.2` / `localhost` / `127.0.0.1`, so local dev works without HTTPS.
   Point at a real HTTPS backend for anything beyond local testing.
4. To test staff-only screens, promote a test account with the backend's
   `scripts/promote_to_staff.py <email>` (per API §2) and log in with it —
   the Command Center FAB and incident resolve actions will appear
   automatically once `GET /auth/me` returns `role: "staff"`.
