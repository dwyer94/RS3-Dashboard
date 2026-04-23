# RS3 Dashboard

A real-time player analytics dashboard for RuneScape 3. Aggregates live game data — skill stats, Grand Exchange prices, Voice of Seren rotations, XP heatmaps, clan leaderboards, and DXP weekend intelligence — into a single drag-and-drop interface.

![Stack](https://img.shields.io/badge/React-19-61DAFB?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript) ![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite) ![TailwindCSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss) ![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)

---

## Features

| Widget | Description |
|--------|-------------|
| **Voice of Seren** | Live VoS district rotation with hourly countdown |
| **RS3 News** | Latest patch notes and game updates |
| **Skill Snapshot** | All 30 skill levels and XP for any tracked player |
| **Activity Feed** | Recent in-game activities for a tracked player |
| **Skill Goal Tracker** | XP progress toward a target level |
| **XP Heatmap** | 12-month XP gain calendar heatmap |
| **Friend Comparison** | Side-by-side skill comparison across players |
| **Player Leaderboard** | Skill-based leaderboard for your tracked players |
| **Market Watchlist** | GE prices and statistical signals for watched items |
| **Market Movers** | Top GE items by price movement and trade volume |
| **DXP Intelligence** | DXP weekend countdown with pre/during/post price movers |

Widgets are arranged in a responsive drag-and-drop grid. Layout is persisted to `localStorage`.

---

## Tech Stack

| Layer | Library |
|-------|---------|
| UI | React 19, TypeScript, Tailwind CSS v4 |
| State — server | TanStack Query v5 |
| State — UI | Zustand v5 (persisted) |
| Grid | react-grid-layout |
| Build | Vite 8 |
| Proxy — dev | Express (`:8787`) |
| Proxy — prod | Cloudflare Workers |
| Tests | Vitest, Testing Library, jsdom |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Ports `5173` (Vite) and `8787` (proxy) available

### Install & Run

```bash
npm install
npm run dev
```

This runs both the Vite dev server and the local CORS proxy concurrently. Open [http://localhost:5173](http://localhost:5173).

To run the proxy standalone:

```bash
npm run proxy
```

### Environment Variables

Create `.env.local` (not committed):

```env
VITE_PROXY_URL=http://localhost:8787
VITE_USE_MOCK_DATA=false
VITE_APP_VERSION=0.1.0
VITE_DXP_SCORES_URL=https://dwyer94.github.io/RS3-Dashboard/data/dxp_scores.json
```

Only `src/config.ts` reads `import.meta.env` — never import env vars elsewhere.

---

## Project Structure

```
src/
├── api/          # Pure async API clients — no state, no side effects
├── hooks/        # TanStack Query wrappers with mock data gates
├── stores/       # Zustand stores for UI state only (layout, RSNs, watchlist)
├── widgets/      # One folder per widget; registry.ts is the source of truth
├── components/   # Shared UI: WidgetShell, SettingsDrawer, PerfOverlay
└── utils/        # rs3Time.ts, geSignals.ts, xpCalc.ts

worker/           # Cloudflare Worker (production CORS proxy)
proxy.js          # Local Express proxy (mirrors worker behavior)
tests/            # Vitest suite — api, stores, utils, widgets
```

**Data flow is strictly one-directional:** `api/` → `hooks/` → `widgets/`. No layer reaches backward.

---

## Architecture

### One-Way Data Flow

```
Jagex APIs / GE / RuneMetrics
    │  (via proxyUrl)
    ▼
src/api/       Pure async fetchers. No state. No fetch() calls elsewhere.
    │
    ▼
src/hooks/     TanStack Query wrappers. Own all cached server data.
    │
    ▼
src/widgets/   Zero required props. Read identity from usePlayerStore.
               Wrapped in WidgetShell for title, refresh, error handling.
```

### State Ownership

- **Server data** → TanStack Query (caching, refetching, staleness)
- **UI state** → Zustand (`usePlayerStore`, `useLayoutStore`, `useMarketStore`)
- **Never** store fetched data in Zustand

### CORS Proxy

All Jagex domains require the proxy. In development, `proxy.js` on `:8787` handles this. In production, a Cloudflare Worker serves as the proxy. Both enforce the same `ALLOWED_DOMAINS` allowlist.

> **Note:** Adding a new Jagex domain requires edits in three places: `src/api/client.ts` (PROXY_DOMAINS), `proxy.js`, and `worker/index.ts` (ALLOWED_DOMAINS). Missing one produces a 403 that looks like a CORS error.

---

## Testing

```bash
npm run test          # Single run (CI)
npm run test:ui       # Interactive UI with coverage
npm run test:watch    # Watch mode
```

Follow TDD: write a failing test in `tests/` before implementing new logic in `api/`, `utils/`, or `stores/`. Mock `Date.now()` for all UTC/reset tests — RS3 time is always UTC; use `src/utils/rs3Time.ts`, never `new Date()`.

---

## Building for Production

```bash
npm run build
```

Outputs:
- `dist/` — Static SPA, deployable to any static host (Cloudflare Pages, Vercel, Netlify)
- `dist/worker.js` — Cloudflare Worker bundle

### Deploy the Worker

```bash
wrangler deploy
```

Update `.env.production` with your worker URL:

```env
VITE_PROXY_URL=https://rs3-proxy.<your-subdomain>.workers.dev
```

---

## Adding a Widget

1. Create `src/widgets/MyWidget.tsx` — wrap content in `<WidgetShell>` with `refreshKeys` declared.
2. Register it in `src/widgets/registry.ts`.
3. Do not call `fetch()` directly; use a hook from `src/hooks/`.
4. Do not catch errors from hooks — let `WidgetShell`'s `ErrorBoundary` handle them.

---

## License

MIT
