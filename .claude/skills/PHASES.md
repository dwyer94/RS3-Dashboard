Based on your architecture specification and current progress, here is the `PHASES.md` skill file. This document tracks your project's evolution and provides the logical roadmap for development.

---

# RS3 Dashboard — Project Phases

## 🎯 Current Status
**Current Phase:** Phase 3 (Live Game Integration)
**Blockers:** None
**Next Up:** Voice of Seren Widget

---

## ✅ Phase 1 & 1b: Foundation (Complete)
*Objective: Establish the "laws" of the application and the service layer infrastructure.*

- [x] **Core Scaffold:** Vite, React 19, Tailwind v4, and Vitest.
- [x] **Service Layer:** API client, hooks, and Zustand stores with hydration gates.
- [x] **UI Primitives:** `WidgetShell`, `WidgetSkeleton`, and `SettingsDrawer`.
- [x] **Proxy Layer:** Local Express proxy and Cloudflare Worker with domain allowlist.

---

## 🛠 Phase 2: Live Game (In Progress)
*Objective: Implement "Global" widgets that use CORS-safe endpoints and do not require user-specific stats.*

- [x] **VoiceOfSeren (VoS):**
  - Hook: `useVoS` (polling 1h UTC).
  - UI: Display active districts and next rotation countdown.
- [x] **TravellingMerchant (TMS):**
  - Logic: Filter stock from `merch_rotation.json` based on UTC reset.
  - Hook: `useTMS` (refetchInterval set to ms until 00:00 UTC).
- [x] **RS3News:**
  - Hook: `useRS3News` fetching from Reddit.

---

## 🛠 Phase 3: Player Analytics (Planned)
*Objective: Integrate user-specific data requiring the CORS proxy.*

- [x] **Player Skill Snapshot:** Fetch levels and XP from RuneMetrics.
- [x] **Activity Feed:** Vertical list of recent player achievements with UTC formatting.
- [x] **Skill Goal Tracker:** Allow users to set and track XP targets in `marketStore`.
- [x] **Error Handling:** Implement profile-status caching (Private/Not Found) in `playerStore`.

---

## 🛠 Phase 4 & 5: Social & Market (Planned)
*Objective: Implement complex data visualizations and market signal logic.*

- [x] **Social (Phase 4):** XP Heatmaps and friend comparison using staggered prefetching (200ms delay).
- [x] **Market (Phase 5):** `MarketWatchlist` and `MarketMovers` using normalized GE dump data.
- [x] **GE Signals:** Pure utility functions for Z-score, percentile, and price streaks.

---

## 💤 Phase 6 & 7: Fun & Experimental (Future)
*Objective: Advanced calculators and LLM integrations.*

- [ ] **Phase 6:** Boss Drop Simulator (pure frontend) and Supply Run Calculator.
- [ ] **Phase 7 (Deferred):** Patch Note Analyzer with Ollama integration.

---

## Project Context
- **Rules Layer:** Refer to `CLAUDE.md` for architecture laws and dev commands.
- **Full Specification:** Refer to `RS3-Dashboard-Architecture-Spec.md` for deep technical rationale.
- **On phase complete:** Stage/commit with a detailed commit message.
- **Tasks:** Refer to `TODO.md` for granular bug fixes and minor chores.