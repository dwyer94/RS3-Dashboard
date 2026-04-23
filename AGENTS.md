# RS3 Dashboard — CLAUDE.md

Personal RuneScape 3 dashboard by Christian. Aggregates player stats, GE market signals, and live game data in a modular widget-based interface.

**Full spec:** `RS3-Dashboard-Architecture-Spec.md` — read it for depth. This file is the rules layer.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite + TypeScript (non-strict) |
| Data fetching | TanStack Query v5 |
| State | Zustand v5 + persist middleware |
| Layout | react-grid-layout |
| Styling | Tailwind CSS v4 (class dark mode strategy) |
| Time | date-fns (UTC-aware only) |
| Tests | Vitest |
| Deploy | Cloudflare Pages (static) + Cloudflare Worker (CORS proxy) |

---

## Dev Commands

```bash
npm run dev        # Vite dev server
npm run proxy      # Local CORS proxy on :8787 (required for Jagex endpoints)
npm run build      # tsc -b && vite build
npm run test       # Vitest run once
npm run test:watch # Vitest watch
npm run lint       # ESLint
```

Run `dev` and `proxy` in parallel during development.

---

## Architecture: One-Way Data Flow

```
API Client (src/api/) → Hooks (src/hooks/) → Widget Components
```

**This is the law. No exceptions.**

### Layer Responsibilities

**API Client (`src/api/`)**
- Pure async functions. Construct URLs, parse responses, throw `ApiError`.
- No React. No state. No direct `import.meta.env` access (import from `src/config.ts`).

**Hooks (`src/hooks/`)**
- TanStack Query wrappers only. Configure `staleTime` and `refetchInterval` per hook.
- Gate mock data via `config.useMockData` → mock fixture, else API function.
- No business logic beyond what TanStack Query provides.

**Stores (`src/stores/`)**
- User configuration only: RSNs, watchlist, goals, layout, theme.
- **Never store server/API data in Zustand.** TanStack Query owns all fetched data.

**Widgets (`src/widgets/` + subdirs)**
- React functional components with no required props.
- Read player identity from `usePlayerStore()` — never accept RSN as prop.
- Consume hooks from `src/hooks/` only. Never call `fetch()` or import from another widget.
- Never render their own title bar, loading spinner, or error message — WidgetShell handles all of that.

---

## Critical TanStack Query Rules

`refetchOnWindowFocus: false` — **DO NOT change this.** RS3 players alt-tab constantly. Window focus refetching would spam the API on every switch.

`refetchIntervalInBackground: false` — No polling when the tab is hidden.

These are set globally in `src/queryClient.ts`. Never override them at the hook level.

---

## Environment & Config

`src/config.ts` is the **only** file that reads `import.meta.env`. All modules import from it.

```
VITE_PROXY_URL      # http://localhost:8787 (dev) | Cloudflare Worker URL (prod)
VITE_USE_MOCK_DATA  # true (offline UI dev) | false (prod)
VITE_APP_VERSION    # from package.json
```

---

## CORS Proxy Routing

`proxyUrl()` in `src/api/client.ts` is the single routing point.

- **Jagex domains** (`apps.runescape.com`, `secure.runescape.com`, `services.runescape.com`) → routed through proxy
- **Weird Gloop & Wiki** → direct fetch, CORS-safe, no proxy needed

---

## Widget Developer Contract

### A widget MUST:
- Be a React functional component with no required props
- Use `usePlayerStore()` to get player identity
- Only call hooks from `src/hooks/` for data
- Pass `isLoading`, `isError`, `error`, `dataUpdatedAt` to `WidgetShell`
- Declare `refreshKeys` on `WidgetShell`
- Register itself in `src/widgets/registry.ts`

### A widget MUST NOT:
- Call `fetch()` or any HTTP library directly
- Import from another widget's folder
- Write to localStorage directly (use stores)
- Manage polling timers or `setInterval`
- Catch/suppress errors from hooks
- Render a title bar, loading spinner, or error message
- Read `import.meta.env` directly

### WidgetShell props

```ts
interface WidgetShellProps {
  title:          string
  refreshKeys:    QueryKey[]
  isLoading:      boolean
  isError:        boolean
  error?:         Error | null
  dataUpdatedAt?: number
  isStale?:       boolean
  isLive?:        boolean    // shows teal pulse dot for polling data
  children:       React.ReactNode
}
```

### Widget registry entry

```ts
interface WidgetDefinition {
  id:          string              // stable key — used as localStorage key, never change
  name:        string
  description: string
  component:   React.FC
  defaultSize: { w: number; h: number }
  minSize:     { w: number; h: number }
  phase:       number
}
```

---

## Stores

All three stores use Zustand `persist` with `version: 1` and a `migrate` function. Never break existing schema without bumping version.

| Store | localStorage key | Owns |
|---|---|---|
| `usePlayerStore` | `rs3dash.players` | primaryRSN, trackedRSNs (max 10), profileStatus |
| `useLayoutStore` | `rs3dash.layout` | widget positions, theme |
| `useMarketStore` | `rs3dash.market` | GE watchlist, skill goals |

`HydrationGate` blocks all rendering until all three stores report `_hasHydrated === true`.

---

## UTC / Time Handling

All RS3 resets occur at 00:00 UTC. VoS rotates at the top of every UTC hour.

**Never use `new Date()` for reset calculations without UTC conversion.** JavaScript Date defaults to local timezone.

Use helpers from `src/utils/rs3Time.ts`:
- `getDailyResetMs()` — ms until next 00:00 UTC (for `useTMS` refetchInterval)
- `getHourlyResetMs()` — ms until next :00 UTC (for `useVoS` refetchInterval and countdown)
- `formatCountdown(ms)` — returns `"2h 34m"` format

---

## Design System

**Aesthetic:** "Runic Scrying Terminal" — dark navy-black base, RS3 warm gold accent, teal for live data.

### Color tokens (CSS variables in `src/index.css`)

```css
--bg-base:        #070b11   /* page background */
--bg-surface:     #0d1420   /* widget panels */
--bg-raised:      #111826   /* hover / inner panels */
--gold:           #c8923a
--gold-bright:    #e6ab49
--teal:           #3db8a0   /* live data, positive */
--red:            #d05858   /* market down */
--green:          #4ea86e   /* market up */
--text-primary:   #ddd4be   /* warm off-white */
--text-secondary: #7a8baa
--text-muted:     #3d4e68
```

### Typography

| Use | Font | Weight | Notes |
|---|---|---|---|
| Logo | Cinzel Decorative | 700 | |
| Widget titles | Cinzel | 600 | uppercase, letter-spacing 0.13em, gold color |
| Numbers / timestamps | IBM Plex Mono | 400/500 | |
| Body / labels | Outfit | 400/500 | |

### Widget shell chrome

- Gold gradient hairline top border via `::before`
- Bottom-left L-corner marks via `::after` + `.corner-br` div
- Header: Cinzel title in gold, monospace data-age, refresh button
- Teal pulsing dot on `isLive` widgets

### Grid

12 columns, 80px row height, 12px gap. Responsive breakpoints: `lg`=12col, `md`=10col, `sm`=6col, `xs`=4col, `xxs`=2col. Dashboard starts empty — users add widgets.

### Default widget sizes

| Widget type | Default | Min |
|---|---|---|
| Simple info (VoS, TMS) | 3×3 | 2×2 |
| Player stats snapshot | 6×4 | 4×3 |
| Chart / history | 6×5 | 4×4 |
| Wide table (market) | 12×5 | 6×4 |

---

## Error Handling

| Error | Detection | User message |
|---|---|---|
| Profile private | RuneMetrics error response | "This profile is set to private in RuneMetrics." |
| Player not found | RuneMetrics 404 | "Player not found. Check the RSN in Settings." |
| API down | Non-200 after 2 retries | "Live data unavailable — showing last known data." |
| Proxy down | Connection refused | "Connection error. Check that the proxy is running." |
| Widget JS error | React ErrorBoundary in WidgetShell | "Something went wrong in this widget." (isolated to that widget) |

`profileStatus` is cached in `playerStore` to prevent re-fetching known-bad RSNs.

---

## Build Phases (current: Phase 1 complete)

| Phase | Content | Status |
|---|---|---|
| 1 | Full scaffold: stores, hooks, API client, WidgetShell, grid, SettingsDrawer, all service layer | ✅ Done |
| 1b | proxy.js, Cloudflare Worker, VITE_PROXY_URL wiring | ✅ Done |
| 2 | VoiceOfSeren, TravellingMerchant, RS3News (Weird Gloop — no proxy needed) | Next |
| 3 | PlayerSkillSnapshot, ActivityFeed, SkillGoalTracker (requires proxy) | — |
| 4 | XPHeatmap, FriendComparison, ClanLeaderboard | — |
| 5 | MarketMovers, MarketWatchlist + GE signals | — |
| 6 | BossDropSimulator, SupplyRunCalculator | — |
| 7 | Patch Note Analyzer + Ollama integration | Deferred (out of scope v2.x) |

Always build the full service layer for a phase before building its widget components.

---

## Testing

Test pure utility functions and store actions. Do not test React hooks or widget components.

- `tests/api/` — API client URL construction and response parsing
- `tests/utils/` — `geSignals.ts` and `rs3Time.ts` (mock `Date.now()` for UTC tests)
- `tests/stores/` — Zustand store action state transitions
