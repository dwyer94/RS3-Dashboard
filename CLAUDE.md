# RS3 Dashboard — CLAUDE.md

## Stack & Commands
- **React 19 / Vite / TS / Tailwind v4**
- **Data:** TanStack Query v5 + Zustand v5 (persist)
- **Proxy:** Local on `:8787` (required for Jagex APIs)
- `npm run dev` / `npm run proxy` (run in parallel)
- `npm run test` (Vitest) | `npm run build` (Static + Worker)

## Architecture Laws (One-Way Data Flow)
**API Client (`/api`) → Hooks (`/hooks`) → Widgets**
- **API:** Pure async. No state. Use `src/config.ts` for env vars.
- **Hooks:** TanStack Query wrappers only. Handle mock data gates here.
- **Stores (`/stores`)**: **Strictly for UI state.** Never store server/API data in Zustand; TanStack Query owns all fetched data.
- **Widgets:** Zero required props. Read identity from `usePlayerStore`.

## Testing & TDD
- **TDD Enforcement:** Always write a failing test in `tests/` before implementing new logic in `api/`, `utils/`, or `stores/`.
- **Test Focus:** Test pure utility functions and store state transitions. 
- **Component Strategy:**  Reasonable to skip snapshot tests and pure render tests, but widget behavior tests (loading states, conditional sections like TMS "tomorrow" only showing when data exists, countdown ticking) have real value. The hooks are similarly worth testing at the integration level with a real QueryClient rather than mocking everything.
- **Mocking:** Mock `Date.now()` for all UTC/reset tests.

## Critical Constraints
- **Polling:** `refetchOnWindowFocus: false` is global. **Do not override.**
- **Time:** RS3 is UTC-only. Use `src/utils/rs3Time.ts`. Never use `new Date()` for reset logic.
- **Proxy:** All Jagex domains must use `proxyUrl()` from `client.ts`. Wiki/Gloop are direct.
- **Env:** Only `src/config.ts` reads `import.meta.env`.

## Widget Developer Contract
- **Must:** Use `WidgetShell` for all chrome (titles, loading, errors).
- **Must:** Declare `refreshKeys` on `WidgetShell`.
- **Must Not:** Call `fetch()` directly or import from other widget folders.
- **Must Not:** Catch errors from hooks (let the `ErrorBoundary` in Shell handle it).
- **Registration:** Add entry to `src/widgets/registry.ts`.

## Error Handling
- **Private Profiles:** Handle via RuneMetrics response.
- **404s:** Cache `profileStatus` in `playerStore` to stop re-fetching known-bad RSNs.
- **Proxy Down:** Throw "Connection error" if proxy is unreachable.

## Project Context
- **Roadmap:** Refer to `PHASES.md` for current build status and upcoming features.
- **Tasks:** Refer to `TODO.md` for granular bug fixes and minor chores.

## Lessons Learned
- Adding a new proxy domain requires two edits — src/api/client.ts (PROXY_DOMAINS) and proxy.js + worker/index.ts (ALLOWED_DOMAINS). Easy to miss one and get a 403 that looks like a CORS error.