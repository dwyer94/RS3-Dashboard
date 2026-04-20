# RS3 Dashboard
## Technical Architecture & Application Specification · v2.1

A personal RuneScape 3 dashboard aggregating player stats, Grand Exchange market signals, and live game data into a modular, widget-based interface. This document covers all major architecture decisions, rationale, service design, and widget specifications required for a clean implementation without technical debt.

| **Field**             | **Value**                                                                 |
| --------------------- | ------------------------------------------------------------------------- |
| **Version**           | 2.1 — Full Architecture Spec (decisions resolved)                         |
| **Stack**             | React 18 + Vite + TypeScript + TanStack Query v5 + Zustand + Tailwind CSS |
| **Deployment Target** | Cloudflare Pages (static) + Cloudflare Worker (CORS proxy)                |
| **Primary APIs**      | Weird Gloop, RuneMetrics, Jagex GE Catalogue, RS Wiki MediaWiki           |
| **Persistence**       | localStorage via Zustand persist middleware — no backend required         |
| **Author**            | Christian — Strongpoint Labs (personal project)                           |

---

# 1. Architecture Decision Record

All major technology and design decisions are documented here with rationale and alternatives considered. These decisions were made upfront to prevent technical debt during widget development.

## 1.1 Core Technology Decisions

| **Decision**              | **Rationale**                                                                                                                                                                                                                                   | **Alternative Considered**                                                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **TypeScript (non-strict)** | Claude Code generates significantly better code with TypeScript — types constrain outputs and catch field name mismatches against API shapes. Non-strict mode balances safety with development speed for a hobby project. | _Plain JavaScript — rejected because it produces lower-quality Claude Code output and allows silent bugs in API response handling._ |
| **TanStack Query v5**     | Solves the three hardest dashboard problems in one library: deduplication (6 widgets requesting the same RSN = 1 HTTP call), per-query stale/refresh config (GE every 10 min, VoS every hour), and stale-while-revalidate UX with error states. | _Custom useEffect fetching — rejected because it requires reimplementing deduplication, caching, background refetch, and error handling per widget, leading to inconsistent behavior._ |
| **Zustand with persist**  | Lightweight, no provider boilerplate, works naturally outside React components. persist middleware handles localStorage serialization automatically with zero custom code. | _React Context — rejected because it re-renders all consumers on any state change, causing performance issues with frequent GE data updates across multiple widgets._ |
| **react-grid-layout**     | Battle-tested drag/drop/resize grid for React dashboards. Produces a layout state object that serializes cleanly to localStorage. Well-documented and actively maintained. | _CSS Grid with manual drag — rejected as too much custom code for a non-core feature._ |
| **date-fns**              | Lightweight, tree-shakeable, fully UTC-aware. RS3 uses UTC for all resets. Provides exactly the time arithmetic needed without moment.js bundle weight. | _moment.js — rejected due to large bundle size and deprecated status._ |
| **Vitest**                | Zero-config with Vite. Fast. Tests only pure utility functions and store logic — not widget components. Right level of coverage for a hobby project. | _Jest — rejected because it requires Vite interop configuration overhead._ |
| **Tailwind dark mode (class strategy)** | Single `dark` class on `<html>` toggled by user preference, persisted in layoutStore. Tailwind's `class` strategy gives full control over dark mode activation without system preference coupling. | _`media` strategy — rejected because it can't be overridden by a user toggle._ |

## 1.2 Data Architecture Decisions

| **Decision**                                            | **Rationale**                                                                                                                                                                                                                                 | **Alternative Considered**                                                                                                                             |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Zustand = config only; TanStack Query = all API data** | Clear separation of concerns prevents storing server state in client state. Zustand persists user preferences. TanStack Query manages API data lifecycle. Mixing them causes stale data bugs and cache invalidation complexity. | _All state in Zustand — rejected because it requires manual staleness tracking and cache invalidation logic that TanStack Query handles automatically._ |
| **GE dump is the single market data source**            | The Weird Gloop rs_dump.json includes item id, name, icon, buy limit, price, last price, and volume per item. No supplementary metadata file is needed. The dump is normalized once in `useGEDump()` into `GEItem[]`. | _Bundled item-metadata.json — rejected; the dump already contains all required fields (confirmed against live data)._ |
| **GE data normalized at service layer**                 | Raw rs_dump.json is parsed once in the GE hook into a unified `GEItem` shape. All market widgets consume the normalized shape — no widget reaches into raw API responses. Format changes require updating one place. | _Widgets parse the dump themselves — rejected because it duplicates logic across widgets and creates inconsistency when the format changes._ |
| **Staggered RuneMetrics prefetch**                      | On initial load, all tracked RSNs are prefetched with 200ms between requests. Avoids a burst of simultaneous requests while keeping total startup time short. Cap of 10 tracked RSNs means worst case is 1.8s sequential startup fetch. | _Parallel fetch all RSNs — rejected as potentially disrespectful to an undocumented rate limit._ |
| **refetchOnWindowFocus: false (CRITICAL)**              | Players constantly alt-tab between RS3 and the dashboard. Default TanStack Query behavior refetches all queries every time the window regains focus. This would spam every API on every alt-tab. Must be disabled globally. | _Default (true) — rejected because it would generate unsustainable API load during normal gaming sessions._ |
| **profileStatus cached in playerStore**                 | Private profile and not-found errors are stored in playerStore per RSN. Prevents re-fetching known-bad RSNs on every page load or widget render. | _Re-fetch on every load — rejected as wasteful and potentially getting the app rate-limited._ |

## 1.3 Critical TanStack Query Global Configuration

These defaults must be set on the QueryClient instance at app startup. They override TanStack Query's standard behavior for game dashboard usage:

| **Option**                   | **Value**                                | **Reason**                                                                          |
| ---------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| **refetchOnWindowFocus**     | false                                    | CRITICAL. Prevents API spam on every alt-tab from RS3 to the dashboard.             |
| **refetchIntervalInBackground** | false                                 | No value in polling while the tab is hidden — player is in-game.                   |
| **gcTime**                   | 30 minutes                               | Keeps cached data warm for a full gaming session without re-fetching.               |
| **retry**                    | 2 with exponential backoff               | Handles transient failures without hammering a struggling API.                      |
| **staleTime**                | 0 (global default, overridden per hook)  | Individual hooks set longer stale times. Global 0 is the safe conservative default. |

---

# 2. CORS Proxy Architecture

Several Jagex-hosted APIs do not return CORS headers permitting direct browser requests. A proxy layer is required. The proxy is completely transparent to widgets — they call the same API client functions regardless of whether proxying is involved.

## 2.1 What Needs Proxying

| **Endpoint**                                          | **Proxy Required?** | **Reason**                                            |
| ----------------------------------------------------- | ------------------- | ----------------------------------------------------- |
| **api.weirdgloop.org (VoS, TMS, news, GE history)**   | No                  | Weird Gloop explicitly supports CORS for browser use. |
| **chisel.weirdgloop.org/gazproj/gazbot/rs_dump.json** | No                  | CORS-safe.                                            |
| **apps.runescape.com/runemetrics/***                  | Yes                 | No CORS headers on Jagex RuneMetrics endpoints.       |
| **secure.runescape.com/m=hiscore/***                  | Yes                 | No CORS headers on Jagex Hiscores endpoints.          |
| **services.runescape.com/m=itemdb_rs/api/graph/***    | Yes                 | No CORS headers on Jagex GE Graph API.                |
| **runescape.wiki/api.php**                            | No                  | RS Wiki MediaWiki API supports CORS.                  |

## 2.2 Proxy Implementation

**Production: Cloudflare Worker**

A single Cloudflare Worker acts as a passthrough proxy for all Jagex-hosted endpoints. The Worker validates the `?target=` URL against a domain allowlist before forwarding, appending CORS response headers. It does not cache — TanStack Query is the cache layer.

**Allowlist (domain-level matching):**
- `apps.runescape.com`
- `secure.runescape.com`
- `services.runescape.com`

Any request whose target URL does not match one of these domains is rejected with a `403 Forbidden`. This prevents the proxy from being used as an open relay.

**Development: Local Express Proxy**

A single-file Express server (`proxy.js` in the repo root) replicates Worker behavior locally. Run with `npm run proxy` alongside the Vite dev server. No Cloudflare account required to develop locally.

```
VITE_PROXY_URL=http://localhost:8787         # .env.local (dev)
VITE_PROXY_URL=https://rs3-proxy.*.workers.dev  # .env.production
```

**Proxy Routing in API Client**

The `proxyUrl()` helper in `src/api/client.ts` is the only place in the codebase that knows about proxy routing. Jagex-domain URLs are routed through it; Weird Gloop and Wiki URLs pass through directly.

```ts
const JAGEX_DOMAINS = ['apps.runescape.com', 'secure.runescape.com', 'services.runescape.com']

const proxyUrl = (url: string) =>
  JAGEX_DOMAINS.some(d => url.includes(d))
    ? `${config.proxyUrl}?target=${encodeURIComponent(url)}`
    : url;
```

---

# 3. Service Layer Design

_Architecture rule: Data flows in one direction only. API Client → Hook → Widget. No widget reaches past its hooks._

## 3.1 Layer Responsibilities

| **Layer**      | **Location** | **Responsibility**                                                                                                       | **Must NOT Do**                                                 |
| -------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| **API Client** | src/api/     | Pure async functions. Constructs URLs, routes through proxy, parses responses, throws typed errors. No React, no state. | Cache data, manage timers, access stores, or know about React.  |
| **Hooks**      | src/hooks/   | TanStack Query wrappers. Configure staleTime, refetchInterval, queryKey per data type. Return typed data.                | Make direct `fetch()` calls or manage local component state.    |
| **Stores**     | src/stores/  | Zustand persistent stores. User configuration only: RSNs, watchlist, goals, layout, theme.                              | Store API responses or server state of any kind.                |

## 3.2 Complete Hook Catalogue

All hooks are defined upfront. Widget developers import from this catalogue only — they never write new query logic. New data needs = new hook added to catalogue first.

**Player Hooks**

| **Hook**                     | **Query Key**                     | **staleTime / refetchInterval** | **Notes**                                                                                      |
| ---------------------------- | --------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------- |
| **usePlayerProfile(rsn)**    | `['player','profile',rsn]`        | 5 min / manual                  | Disabled when rsn empty. Returns SkillData[], totalXP, totalLevel, activityLog, combatLevel.   |
| **useXPMonthly(rsn, skill?)** | `['player','xpmonthly',rsn,skill]` | 1 hour / manual                | Returns 12-month XP array per skill. Skill optional — all skills if omitted.                   |
| **useAllTrackedProfiles()**  | `['player','profile',rsn]` per RSN | 5 min / manual                 | Calls usePlayerProfile for each RSN in playerStore. Staggered 200ms on first load.             |

**Grand Exchange Hooks**

| **Hook**                 | **Query Key**              | **staleTime / refetchInterval** | **Notes**                                                                                                   |
| ------------------------ | -------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **useGEDump()**          | `['ge','dump']`            | 10 min / 10 min (foreground)    | Fetches and normalizes rs_dump.json into GEItem[]. Single shared cache — many widgets, one request.         |
| **useGEItem(itemId)**    | `['ge','dump']`            | 10 min / 10 min                 | Derived from useGEDump() — filters to one item. No extra request.                                           |
| **useGEHistory(itemId)** | `['ge','history',itemId]`  | 10 min / manual                 | 180-day daily prices from Jagex GE Graph API via proxy. Used by GESignals for trend calculations.           |
| **useGESignals(itemId)** | `['ge','dump']`            | 10 min / 10 min                 | Computes Z-score, percentile, streak, volumeTier from dump data. No extra fetch.                            |

**Game State Hooks**

| **Hook**               | **Query Key**               | **staleTime / refetchInterval** | **Notes**                                                               |
| ---------------------- | --------------------------- | ------------------------------- | ----------------------------------------------------------------------- |
| **useVoS()**           | `['gamestate','vos']`       | 1 hour / 1 hour (foreground)    | Current two active districts + next rotation timestamp.                 |
| **useVoSHistory()**    | `['gamestate','vos-history']` | 1 hour / manual               | Recent VoS rotation history.                                            |
| **useTMS()**           | `['gamestate','tms']`       | 1 day / daily reset             | Today's and tomorrow's TMS stock. refetchInterval = ms until 00:00 UTC. |
| **useRS3News()**       | `['gamestate','news']`      | 1 hour / manual                 | Latest RS3 patch notes and news from Weird Gloop social endpoint.       |
| **useHiscores(skill)** | `['hiscores',skill]`        | 5 min / manual                  | Top 50 players for a skill. Via proxy.                                  |

## 3.3 Zustand Store Schemas

All stores use `version: 1` with a stub `migrate` function. When a store schema changes in a breaking way, increment `version` and add a migration case. For a single-user personal project, clearing localStorage is an acceptable alternative to writing a migration — but the versioning infrastructure must exist to make that choice explicit.

**playerStore (`rs3dash.players`) — version 1**
```ts
interface PlayerStore {
  primaryRSN:    string
  trackedRSNs:   string[]          // max 10 enforced in addRSN
  profileStatus: Record<string, 'ok' | 'private' | 'notfound'>
  _hasHydrated:  boolean
  setPrimary:    (rsn: string) => void
  addRSN:        (rsn: string) => void   // validates via API before storing; noop if already at 10
  removeRSN:     (rsn: string) => void
}
```

**marketStore (`rs3dash.market`) — version 1**
```ts
interface MarketStore {
  watchlist:   number[]      // item IDs
  goals:       SkillGoal[]   // { id, rsn, skill, targetXP, name }
  _hasHydrated: boolean
  addItem:     (id: number) => void
  removeItem:  (id: number) => void
  addGoal:     (goal: SkillGoal) => void
  removeGoal:  (id: string) => void
}
```

**layoutStore (`rs3dash.layout`) — version 1**
```ts
interface LayoutStore {
  widgets:      WidgetLayout[]   // { id, x, y, w, h, visible }
  theme:        'light' | 'dark'
  _hasHydrated: boolean
  updateLayout: (layouts: WidgetLayout[]) => void
  toggleWidget: (id: string) => void
  resetLayout:  () => void        // clears all widgets; user re-adds from scratch
  setTheme:     (theme: 'light' | 'dark') => void
}
```

**Hydration Safety**

Each store exposes `_hasHydrated`, set to `true` in the persist `onRehydrateStorage` callback. A `HydrationGate` component at the app root blocks all widget rendering until every store reports `_hasHydrated === true`. This prevents widgets from rendering with empty store values and immediately re-rendering with real values, which would cause UI flicker and potentially duplicate API calls.

---

# 4. Widget System

## 4.1 Widget Developer Contract

**A Widget MUST:**
- Be a React functional component accepting no required props.
- Retrieve player identity via `usePlayerStore()` — never accept RSN as a prop.
- Use only hooks from `src/hooks/` for all data access.
- Pass `isLoading`, `isError`, `error`, and `dataUpdatedAt` to `WidgetShell` as props.
- Declare its query keys via the `refreshKeys` prop on `WidgetShell`.
- Be registered in `src/widgets/registry.ts`.

**A Widget MUST NOT:**
- Call `fetch()` or any HTTP library directly.
- Import from another widget's folder.
- Write to localStorage directly — use stores.
- Manage its own polling timers or `setInterval`.
- Catch or suppress errors from hooks — let them propagate to `WidgetShell`.
- Render its own title bar, loading spinner, or error message.
- Access `import.meta.env` directly — use the typed config module.

_The only player state source is `usePlayerStore()`. This ensures all widgets respond correctly when the primary RSN changes in Settings — no widget needs individual updating._

## 4.2 WidgetShell Interface

```ts
interface WidgetShellProps {
  title:          string
  refreshKeys:    QueryKey[]
  isLoading:      boolean
  isError:        boolean
  error?:         Error | null
  dataUpdatedAt?: number
  isStale?:       boolean
  children:       React.ReactNode
}
```

`WidgetShell` is wrapped in a React `ErrorBoundary`. An uncaught JS error in a widget's render will be caught and display an error card — it will not crash the rest of the dashboard.

## 4.3 Widget Registry Interface

```ts
interface WidgetDefinition {
  id:          string         // unique stable key — used as localStorage key
  name:        string         // display name
  description: string         // shown in Add Widgets panel
  component:   React.FC
  defaultSize: { w: number; h: number }
  minSize:     { w: number; h: number }
  phase:       number         // build phase reference
}
```

Adding a new widget = one registry entry + one component file. No other wiring required.

## 4.4 Grid System Specification

The dashboard uses `react-grid-layout` with the following configuration:

**Grid dimensions:**
- 12 columns
- Row height: 80px
- Margin: `[12, 12]` (horizontal, vertical gap between widgets in px)

**Responsive breakpoints (`react-grid-layout` `ResponsiveGridLayout`):**

| **Breakpoint** | **Min Width** | **Columns** | **Notes**                      |
| -------------- | ------------- | ----------- | ------------------------------ |
| `lg`           | 1200px        | 12          | Full desktop layout            |
| `md`           | 996px         | 10          | Narrow desktop / large tablet  |
| `sm`           | 768px         | 6           | Tablet portrait                |
| `xs`           | 480px         | 4           | Large phone landscape          |
| `xxs`          | 0px           | 2           | Phone portrait — stacked       |

**Default state:** The dashboard starts empty. No widgets are shown on first load. Users open the "Add Widgets" panel (accessible from the top bar) to select and add widgets. Each widget is placed at the next available grid position.

**Layout persistence:** `layoutStore.widgets` holds the full `WidgetLayout[]` state. `react-grid-layout` calls `updateLayout` on every drag/resize. On mobile breakpoints (`sm` and below), drag-and-resize is disabled — widgets stack in registry order.

**Widget `defaultSize` guidelines (in 12-column units):**

| **Widget type**       | **Suggested default** | **Min size** |
| --------------------- | --------------------- | ------------ |
| Simple info (VoS, TMS) | 3×3                  | 2×2          |
| Player stats snapshot  | 6×4                  | 4×3          |
| Chart / history        | 6×5                  | 4×4          |
| Wide table (market)    | 12×5                 | 6×4          |

## 4.5 Player Selector Pattern

Widgets that display data for a single player (Skill Snapshot, Activity Feed, Goal Tracker, XP Heatmap) follow a consistent pattern: default to `primaryRSN`, show a player selector dropdown if `trackedRSNs.length > 1`, store selection in local `useState` (not persisted). On reload, widgets reset to `primaryRSN` — this is intentional to prevent stale selections going unnoticed.

## 4.6 Manual Refresh Flow

1. User clicks refresh in WidgetShell title bar.
2. WidgetShell calls `queryClient.invalidateQueries()` for each key in `refreshKeys`.
3. TanStack Query marks queries stale and triggers background refetch.
4. Widget continues showing current data (stale-while-revalidate) — no loading spinner interruption.
5. On refetch completion, widget updates with fresh data.
6. On refetch failure, stale data remains with an amber "Data may be outdated" banner.

## 4.7 Settings Drawer Specification

The `SettingsDrawer` is a slide-over panel accessible from the top bar. It handles all user configuration:

**RSN Management:**
- Add RSN input field with an "Add" button.
- On add: fires `fetchPlayerProfile` immediately to verify the RSN exists before storing.
  - Loading: shows a spinner in the input — does not block the rest of the UI.
  - Found: stores the RSN in `playerStore`, sets `profileStatus = 'ok'`.
  - Private: stores the RSN, sets `profileStatus = 'private'`, shows a lock icon in the RSN list with a tooltip "Profile is private — stat widgets will be limited."
  - Not found: shows inline error "Player not found — check the RSN spelling." Does not store.
  - Timeout (5s): shows inline error "Could not verify RSN — check your connection." Does not store.
- RSN list shows all tracked RSNs with `profileStatus` indicator icons.
- Remove button per RSN. Removing `primaryRSN` promotes the next RSN in the list, or clears `primaryRSN` if the list becomes empty.
- "Set as primary" button for any tracked RSN that isn't already primary.
- Cap: `addRSN` is a no-op if `trackedRSNs.length >= 10`, with an inline message "Maximum 10 players tracked."

**Appearance:**
- Dark/light mode toggle — updates `layoutStore.theme` and toggles the `dark` class on `<html>`.

**Layout:**
- "Reset layout" button — clears all widget positions (calls `layoutStore.resetLayout()`). Requires a confirmation dialog.

---

# 5. Error Handling Strategy

Errors are classified at the API client layer and surfaced appropriately. Partial stale data is always preferred over blank states.

| **Error Type**            | **Detection**                  | **Widget Behavior**                                                    | **User Message**                                      |
| ------------------------- | ------------------------------ | ---------------------------------------------------------------------- | ----------------------------------------------------- |
| **Profile is private**    | RuneMetrics error response     | Show lock icon. Store `profileStatus='private'` to skip future fetches. | "This profile is set to private in RuneMetrics."     |
| **Player not found**      | RuneMetrics 404 or error       | Show not-found state. Store `profileStatus='notfound'`.                | "Player not found. Check the RSN in Settings."        |
| **API temporarily down**  | Non-200 after 2 retries        | Show stale cached data + amber banner.                                 | "Live data unavailable — showing last known data."    |
| **Proxy down**            | Connection refused             | Show error state. No stale data possible.                              | "Connection error. Check that the proxy is running."  |
| **Widget JS error**       | React ErrorBoundary            | Show error card for that widget only.                                  | "Something went wrong in this widget."                |

---

# 6. Core TypeScript Data Types

All API response shapes are typed. These interfaces are the contract between the API client layer and the rest of the app. Mock data files must match these shapes exactly.

## 6.1 Player Types

```ts
interface SkillData { id: number; name: string; level: number; xp: number; rank: number }
interface ActivityEntry { text: string; details: string; date: string }
interface PlayerProfile {
  rsn: string; totalXP: number; totalLevel: number; combatLevel: number
  skills: SkillData[]; activities: ActivityEntry[]
}
interface MonthlyXP { year: number; month: number; xpGained: number }
interface XPMonthlyData { skill: number; months: MonthlyXP[] }
```

## 6.2 Grand Exchange Types

```ts
// Normalized GEItem — sourced entirely from rs_dump.json (no supplementary file needed)
interface GEItem {
  id:       number
  name:     string
  icon:     string    // filename from dump (e.g. "'Ancient gizmos' blueprint.png")
  buyLimit: number    // mapped from dump's "limit" field
  price:    number    // current guide price
  last:     number    // last traded price
  volume:   number    // daily trade volume
}

interface GESignals {
  zScore:     number            // std deviations from 30d mean (derived from GE history)
  percentile: number            // 0–100, position in 30d price range (derived from GE history)
  streak:     number            // positive = consecutive up days, negative = consecutive down days
  volumeTier: 'high' | 'medium' | 'low'  // high: >10k/day, medium: 1k–10k/day, low: <1k/day
}

interface PricePoint { date: number; price: number }  // for GE history charts
```

_Note: `zScore`, `percentile`, and `streak` are computed from `useGEHistory()` data in `geSignals.ts`. They are not in the dump. `useGESignals()` composes `useGEDump()` and `useGEHistory()` internally._

## 6.3 Game State Types

```ts
interface VoSData { districts: [string, string]; nextRotation: Date }
interface TMSItem { name: string; wikiUrl: string; isHighValue: boolean }
interface TMSData { today: TMSItem[]; tomorrow: TMSItem[]; resetTime: Date }
interface NewsItem { title: string; date: string; category: string; url: string }
```

---

# 7. Environment & Configuration

| **Variable**          | **Dev Value**           | **Prod Value**                       | **Purpose**                                                               |
| --------------------- | ----------------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| **VITE_PROXY_URL**    | http://localhost:8787   | https://rs3-proxy.*.workers.dev      | CORS proxy base URL. Only used by `api/client.ts`.                        |
| **VITE_USE_MOCK_DATA** | true (optional)        | false                                | When true, all hooks return fixture data. Enables offline UI development. |
| **VITE_APP_VERSION**  | (from package.json)     | (from package.json)                  | Displayed in app footer.                                                  |

`src/config.ts` is the only file that reads `import.meta.env`. All other modules import from `config.ts`. This centralises validation and makes mocking easier in tests.

---

# 8. Date & Time Handling

All RS3 game resets occur at 00:00 UTC. VoS rotates at the top of every UTC hour. All time logic must be UTC-aware. The `rs3Time.ts` utility module centralises all calculations.

| **Function**                 | **Returns**                           | **Used By**                                    |
| ---------------------------- | ------------------------------------- | ---------------------------------------------- |
| **getDailyResetMs()**        | ms until next 00:00 UTC               | `useTMS` refetchInterval                       |
| **getHourlyResetMs()**       | ms until next :00 UTC                 | `useVoS` refetchInterval; VoS widget countdown |
| **formatCountdown(ms)**      | Human-readable string e.g. "2h 34m"  | VoS, TMS widgets                               |
| **getUTCDateString()**       | YYYY-MM-DD in UTC                     | (reserved for future use)                      |
| **formatRS3Timestamp(date)** | Localised display string              | Activity Feed widget                           |

_Never use `new Date()` for reset calculations without UTC conversion. JavaScript Date defaults to local timezone. All RS3 reset logic must use UTC methods explicitly — `getDailyResetMs()` handles this correctly._

---

# 9. Project Structure

```
rs3-dashboard/
├── proxy.js                     # Local dev CORS proxy (Express, single file)
├── worker/index.ts              # Cloudflare Worker (production proxy)
├── src/
│   ├── api/                     # API CLIENT LAYER
│   │   ├── client.ts            # proxyUrl() helper, base fetcher with error typing
│   │   ├── players.ts           # fetchPlayerProfile, fetchXPMonthly
│   │   ├── ge.ts                # fetchGEDump, fetchGEHistory
│   │   ├── gameState.ts         # fetchVoS, fetchTMS, fetchNews, fetchHiscores
│   │   ├── types.ts             # All TypeScript interfaces for API responses
│   │   └── mocks/               # Fixture data mirroring types.ts shapes
│   ├── hooks/                   # HOOK LAYER (TanStack Query wrappers)
│   │   ├── usePlayerProfile.ts
│   │   ├── useXPMonthly.ts
│   │   ├── useAllTrackedProfiles.ts
│   │   ├── useGEDump.ts
│   │   ├── useGEItem.ts
│   │   ├── useGEHistory.ts
│   │   ├── useGESignals.ts
│   │   ├── useVoS.ts
│   │   ├── useVoSHistory.ts
│   │   ├── useTMS.ts
│   │   ├── useRS3News.ts
│   │   └── useHiscores.ts
│   ├── stores/                  # ZUSTAND STORES (user config + localStorage)
│   │   ├── usePlayerStore.ts
│   │   ├── useMarketStore.ts
│   │   └── useLayoutStore.ts
│   ├── widgets/                 # WIDGET COMPONENTS
│   │   ├── registry.ts          # All WidgetDefinition entries
│   │   ├── VoiceOfSeren/
│   │   ├── TravellingMerchant/
│   │   ├── RS3News/
│   │   ├── PlayerSkillSnapshot/
│   │   ├── ActivityFeed/
│   │   ├── SkillGoalTracker/
│   │   ├── XPHeatmap/
│   │   ├── FriendComparison/
│   │   ├── ClanLeaderboard/
│   │   ├── MarketWatchlist/
│   │   ├── MarketMovers/
│   │   └── BossDropSimulator/
│   ├── components/              # SHARED UI PRIMITIVES
│   │   ├── WidgetShell.tsx
│   │   ├── WidgetSkeleton.tsx
│   │   ├── WidgetError.tsx
│   │   ├── HydrationGate.tsx    # Blocks render until all stores hydrated
│   │   └── SettingsDrawer.tsx   # RSN management, theme toggle, layout reset
│   ├── utils/
│   │   ├── rs3Time.ts           # All UTC time helpers
│   │   └── geSignals.ts         # Z-score, percentile, streak calculations
│   ├── assets/
│   │   └── skills/              # 29 skill SVG icons (bundled at build time)
│   ├── config.ts                # Typed env var access — only env reader
│   ├── queryClient.ts           # QueryClient with configured global defaults
│   ├── App.tsx
│   └── main.tsx
└── tests/
    ├── api/                     # API client function unit tests
    ├── utils/                   # geSignals and rs3Time tests
    └── stores/                  # Zustand store action tests
```

---

# 10. Testing Strategy

| **Target**                                      | **Test?** | **Rationale**                                                                                               |
| ----------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------- |
| **API client functions**                        | Yes       | Pure functions. Test URL construction and response parsing against TypeScript shapes. Mock fetch globally.  |
| **geSignals.ts (Z-score, percentile, streak)**  | Yes       | Pure functions with clear numerical outputs. Testable with static price arrays.                             |
| **rs3Time.ts**                                  | Yes       | UTC time arithmetic is subtle and easy to get wrong. Test with mocked `Date.now()`.                         |
| **Zustand store actions**                       | Yes       | Test `addRSN`, `removeRSN`, `toggleWidget`, `setTheme`. Pure state transitions.                             |
| **React hooks**                                 | No        | Covered by API client tests. Hook tests add overhead with low additional confidence.                        |
| **Widget components**                           | No        | High churn, low ROI for a hobby project. Visual QA is sufficient.                                           |

---

# 11. Build Order

Phases are sequenced to complete the service layer before widget development begins. Phase 2 intentionally uses only Weird Gloop endpoints so the first working widgets can ship without the CORS proxy being needed.

| **Phase**                      | **Deliverable**                                                                                                                                                                                                                                               | **Gate / Notes**                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 1 — Foundation**       | Vite + React + TS scaffold, Tailwind (dark mode configured), QueryClient with global defaults, all three Zustand stores with persist + version, HydrationGate, WidgetShell / Skeleton / Error components, widget registry, react-grid-layout responsive shell, SettingsDrawer (RSN management + theme toggle), config.ts, rs3Time.ts, ALL API client functions and hooks (returning mock data if stubs) | Build the entire service layer before any widget. Hooks return mock data via `VITE_USE_MOCK_DATA`. Widget developers can immediately start Phase 2 without waiting on API plumbing. |
| **Phase 1b — Proxy (parallel)** | `proxy.js` (local Express), Cloudflare Worker with allowlist, `VITE_PROXY_URL` wiring, smoke tests against all proxied endpoints | Can run in parallel with Phase 1. Required before Phase 3.                                                                                              |
| **Phase 2 — Live Game**        | VoiceOfSeren, TravellingMerchant, RS3News                                                                                                                                                                                                                     | All Weird Gloop — no proxy needed. First end-to-end proof the widget system works.                                                                      |
| **Phase 3 — Player**           | PlayerSkillSnapshot, ActivityFeed, SkillGoalTracker                                                                                                                                                                                                           | Requires Phase 1b proxy. Requires `usePlayerProfile`.                                                                                                  |
| **Phase 4 — Social**           | XPHeatmap, FriendComparison, ClanLeaderboard                                                                                                                                                                                                                  | Requires `useXPMonthly` and `useAllTrackedProfiles` staggered prefetch.                                                                                 |
| **Phase 5 — Market**           | MarketMovers, MarketWatchlist with GE signals                                                                                                                                                                                                                 | No scrape script needed — rs_dump.json contains all required item metadata. `useGEDump()` + `useGEHistory()` provide all signal inputs.                  |
| **Phase 6 — Fun**              | BossDropSimulator, SupplyRunCalculator                                                                                                                                                                                                                        | BossDropSim is pure frontend (drop table data source TBD — RS Wiki API or bundled JSON). SupplyRunCalculator is highest maintenance burden.             |
| **Phase 7 — LLM**              | _(Out of scope for v2.x)_                                                                                                                                                                                                                                     | Patch Note Analyzer + Ollama integration deferred. Depends on separate home server infrastructure. Revisit as a standalone future project.               |

---

_RS3 Dashboard · Architecture Spec v2.1 · Strongpoint Labs_
