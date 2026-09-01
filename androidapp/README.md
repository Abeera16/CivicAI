# CivicAI — Android App (Kotlin + Jetpack Compose)

A native Android client for the **CivicAI — Lahore Urban Intelligence API**,
covering citizen reporting, the live incident map, AI-classified impact
scoring, the Ask CivicAI assistant, and a staff Command Center.

Every screen is backed by a live network call — **no hardcoded reports,
incidents, weather, or user data anywhere in the app.** See
[`API_INTEGRATION.md`](./API_INTEGRATION.md) for the full screen-by-endpoint
mapping and an honest note about the one place (Alerts) where the API doc
doesn't define an endpoint and the app derives real data instead of faking it.

## Screens

| | | |
|---|---|---|
| Welcome | Sign In / Register | Home |
| Report a Problem | Nearby (map) | My Reports |
| Alerts | Ask CivicAI (chat) | Incident Detail |
| Command Center (staff) | | |

## Tech stack

- **Kotlin** + **Jetpack Compose** (Material 3)
- **Retrofit 2** + **OkHttp** for networking, Gson for (de)serialization
- **Coroutines** for async work
- **Navigation Compose** for the app's nav graph
- **DataStore Preferences** for JWT session persistence
- **Coil** for image loading (resolves the API's relative `/media/...` URLs)
- **Google Maps Compose** + **Fused Location Provider** for the Nearby map
- **Accompanist Permissions** for runtime location permission handling
- Plain, hand-written dependency injection (`AppContainer` in
  `CivicAiApplication.kt`) — no Hilt/Dagger annotation processing, so the
  whole dependency graph is readable in one file.

## Project structure

```
app/src/main/java/com/civicai/app/
├── CivicAiApplication.kt        # Application class + AppContainer (manual DI)
├── MainActivity.kt              # Hosts the nav graph, observes auth state
├── data/
│   ├── local/TokenManager.kt    # DataStore-backed JWT + role persistence
│   ├── remote/
│   │   ├── CivicAiApiService.kt # Retrofit interface — every documented endpoint
│   │   ├── NetworkModule.kt     # OkHttp client, auth interceptor, refresh logic
│   │   └── dto/                 # Data classes matching API §4 shapes exactly
│   └── repository/              # One repository per API "area" (auth, reports,
│                                 # incidents, city data, assistant)
├── ui/
│   ├── theme/                   # Colors, typography, Material 3 theme
│   ├── navigation/               # Nav graph + route definitions
│   ├── components/               # Shared chips, cards, bottom nav, states
│   └── screens/                  # One package per screen, each with its own
│                                  # ViewModel (state) + Screen (Compose UI)
└── util/                        # ApiResult wrapper, location + image helpers,
                                  # generic ViewModel factory
```

## Getting started

1. **Open in Android Studio** (Koala/2024.1+ recommended) as an existing project.
   Android Studio will detect the Gradle wrapper and fetch `gradle-wrapper.jar`
   automatically on first sync (it wasn't hand-bundled here — if you're
   building from the command line instead, run `gradle wrapper` once with any
   local Gradle install to generate it).
2. Copy `local.properties.example` → `local.properties` and fill in:
   - `sdk.dir` — your Android SDK path
   - `CIVICAI_BASE_URL` — your backend's base URL (see
     [`API_INTEGRATION.md §5`](./API_INTEGRATION.md#5-backend-setup-checklist)
     for emulator vs. physical device notes)
   - `MAPS_API_KEY` — optional, only needed for the Nearby map screen
3. Let Gradle sync, then run on an emulator or device.
4. Register a citizen account in-app, or promote one to staff on the backend
   to see the Command Center and incident-resolution actions.

## Notes

- `usesCleartextTraffic` + a scoped `network_security_config.xml` are enabled
  so you can point at a local `http://` backend during development without
  extra setup. Tighten this for any production/HTTPS deployment.
- The app never fabricates data to fill a gap in the API — see
  `API_INTEGRATION.md` §3–4 for the couple of places (Alerts, guest mode,
  staff gating) where a real design decision had to be made, and how each one
  is still backed by genuine API responses.
