# CLAUDE.md — ChatUnbound

> This file is loaded every session. Keep it short. Every line should answer:
> "Would Claude make mistakes without this?" If not, cut it.

---

## Project Overview

**What this project is:** A fully offline desktop chat app where users create AI characters, chat with them, and receive context-aware generated images. Personal hobby project.

**Primary language/framework:** Python (FastAPI) backend + React (Vite) + Electron desktop shell

**My role / how I work:** Solo developer, hobby project. Prefer explanations before edits on complex changes.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron |
| Frontend | React 18 / Vite (port 5174 in dev) |
| Styling | Tailwind with a Warm Obsidian Luxury design system |
| Backend | Python / FastAPI (port 8000) |
| Database | SQLite (`sqlite3` stdlib only — no ORM) |
| LLM | Ollama — `qwen2.5:7b-instruct` (localhost:11434) -- with 3080 when ComfyUI also running; `qwen2.5:14b-instruct` when ComfyUI is off; `qwen2.5:32b-instruct` after upgrade to 5080 |
| Image generation | ComfyUI (localhost:8188) — Phase 2+ only |

---

## Key Commands

```bash
# Backend
cd backend && uvicorn main:app --reload --port 8000

# Frontend (Vite dev server)
cd frontend && npm run dev

# Electron (dev)
cd electron && npm run dev
```

**In dev, start all three manually.** Electron does NOT spawn FastAPI in dev — only in production.

External services (start manually):
- **Ollama:** auto-starts as Windows service after install. Validate: `ollama list`
- **ComfyUI:** run via its launcher, port 8188 — required from Phase 2 only

---

## Project Structure

```
backend/
  main.py
  config.py         # ALL env var loading/path resolution — load_dotenv() only here
  routers/          # characters, conversations, chat, images
  services/         # llm.py, image_gen.py (Phase 2+), memory.py (Phase 3+)
  models/           # SQLite schema
  workflows/        # ComfyUI JSON workflow templates (Phase 2+)
frontend/
  src/
    components/
    pages/          # CharacterScreen, ChatScreen, Gallery
    api/            # API client — fetch() to localhost:8000, never IPC
electron/
  main.js           # Spawns FastAPI in production only
  preload.js        # Intentionally empty Phase 1. contextIsolation:true, nodeIntegration:false
data/               # chatunbound.db auto-created here on first run
images/             # characters/{id}/ and conversations/{id}/
.claude/
  memory/           # Claude memory lives HERE — not in ~/.claude/
```

**Two separate `package.json` files:** `frontend/` and `electron/`. Separate `npm install` calls. No root package.json.

---

## config.py Pattern

All env vars and path resolution live in `backend/config.py`. `ROOT = Path(__file__).parent.parent` anchors to the project root. `load_dotenv()` is called **only here**.

```python
DB_PATH   = ROOT / os.getenv("DB_PATH",   "data/chatunbound.db")
IMAGE_DIR = ROOT / os.getenv("IMAGE_DIR", "images")
```

If an env var is set to an absolute path, pathlib correctly ignores ROOT.

---

## LLM Integration

- Endpoint: `POST http://localhost:11434/v1/chat/completions`
- Required JSON response: `{ "message": "...", "send_image": bool, "image_prompt": "..." }`
- Enforce via system prompt instructions — not an API parameter
- **Always** wrap `json.loads()` in `try/except` — fall back to `{"message": raw_text, "send_image": False, "image_prompt": ""}` on failure

---

## ComfyUI Integration (Phase 2+)

- Queue: `POST /prompt` → poll `GET /history/{prompt_id}` every 2s, 120s timeout
- Retrieve image via `GET /view?filename=...` — never read from ComfyUI output directory on disk
- Text-only fallback on timeout
- `backend/workflows/` must exist and be populated before Phase 2 begins

### VRAM Config Flags

| Env var | Default | Purpose |
|---|---|---|
| `CONVERSATION_IMAGES_ENABLED` | `false` | Enable scene images during chat (requires spare VRAM alongside LLM) |

Character portrait generation always runs (single isolated job, no LLM contention). Conversation images are off by default until hardware supports both SD + LLM simultaneously (target: RTX 5080 + offload LLM to 3080 over network).

---

## API Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{"status":"ok"}` — polled by Electron before window loads |
| POST | `/characters` | `{name, description, appearance{}, personality{}}` |
| GET | `/characters` | List all |
| GET | `/characters/{id}` | Fetch single |
| POST | `/conversations` | `{character_id, scenario}` |
| GET | `/conversations` | List all. Supports `?character_id=` filter. Includes `character_name`. |
| GET | `/conversations/{id}` | Fetch single |
| POST | `/chat` | `{conversation_id, message}` → `{message, image_url}` |
| GET | `/images/{path}` | Serve images — validate path stays within IMAGE_DIR |

*`GET /characters/{id}` and `GET /conversations/{id}` are additions beyond the original spec.*

---

## Database Schema (Phase 1)

```sql
-- UUIDs via uuid.uuid4(), all timestamps ISO 8601 UTC e.g. "2026-03-27T12:00:00+00:00"
CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
    hair_color TEXT, eye_color TEXT, style TEXT, body_type TEXT,
    archetype TEXT, traits TEXT,  -- traits: JSON array as string
    speech_style TEXT, base_image_path TEXT,  -- NULL in Phase 1
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL REFERENCES characters(id),
    scenario TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    role TEXT NOT NULL CHECK(role IN ('user','assistant')),
    content TEXT NOT NULL, image_path TEXT, timestamp TEXT NOT NULL
);
```

Phase 3 adds `character_memory` table.

---

## Constraints & Gotchas

- **CORS:** `allow_origins=["*"]` in `CORSMiddleware` — local-only app, covers Vite dev + Electron `file://`
- **Electron health poll:** 500ms interval, 20 attempts (10s total), then show error screen with Retry button
- **SQLite:** stdlib `sqlite3` only. No ORM. UUIDs via `uuid.uuid4()`. Timestamps ISO 8601 UTC.
- **Tailwind config must be `.cjs`, not `.js`**, when `"type": "module"` is in `frontend/package.json`. Tailwind v3 can't load ESM config. File must use `module.exports = { ... }` syntax.
- **Phase 1 characters:** `base_image_path` is null — use placeholder avatar
- **`GET /images/{path}`:** validate `(IMAGE_DIR / path).resolve()` is inside `IMAGE_DIR.resolve()`
- **ESLint pinned to v8** (`"eslint": "^8"`) — v9 changed config format incompatibly
- **Memory:** `.claude/memory/` in project root — never `~/.claude/`
- **`POST /chat`:** backend retrieves scenario + personality from DB server-side — frontend never sends them per-message

---

## Development Phases

| Phase | Scope |
|---|---|
| 1 | Text chat + character creation (no images, plain CSS) |
| 2 | CSS framework (Tailwind) + UI redesign ✓ · Image generation + ComfyUI |
| 3 | Memory system |
| 4 | UI polish + gallery |

---

## Lessons Learned — Phase 1

> Keep only lessons that would cause Claude to make a mistake if forgotten.

- **Always use `127.0.0.1`, never `localhost`, for all local service URLs on Windows.** Both Node.js (Electron main process) and Chromium resolve `localhost` to `::1` (IPv6). Uvicorn and most Python servers bind IPv4 only (`0.0.0.0`). Result: Node.js `fetch()` fails silently (health poll never succeeds); Chromium `GET` requests also fail silently. Apply this to `HEALTH_URL` in `electron/main.js` and `BASE` in every frontend API module.

- **POST requests trigger a CORS preflight; GET requests do not.** A `POST` with `Content-Type: application/json` sends an OPTIONS preflight first. If OPTIONS goes to `::1` and gets connection refused, Chromium reports it as a CORS error — even though `allow_origins=["*"]` is correctly configured. This can mask the IPv6 root cause: GETs work, POSTs "fail with CORS". Diagnose with `curl http://[::1]:8000/health` (expect failure) vs `curl http://127.0.0.1:8000/health` (expect success).

- **Centralize the API base URL in a single `base.js`.** Repeating `"http://127.0.0.1:8000"` in each API module means one wrong copy survives any future host/port change. One import fixes all callers at once.

- **Electron Retry button requires IPC, not `location.reload()`.** A `data:` HTML page reloaded via `location.reload()` just reloads itself — it never re-triggers `waitForBackend()` in the main process. Pattern: load a real `error.html` file, expose `window.electronAPI.retryConnection()` via `contextBridge`, and handle it with `ipcMain.handle("retry-connection", ...)` in `main.js`.

- **`ORDER BY timestamp, rowid` for message ordering.** User and assistant messages written in the same `chat.py` transaction share the same timestamp. Sorting by timestamp alone is non-deterministic. `rowid` is a stable, auto-incrementing tie-breaker that costs nothing.

- **Use `crypto.randomUUID()` for client-side message IDs, not `Date.now()`.** Two messages created in the same millisecond (user send + optimistic render) will collide with `Date.now()`. `crypto.randomUUID()` is available in Chromium and Node 19+ with no import needed.

- **Router prefix collision: write paths relative to the prefix.** If a router has `prefix="/conversations"`, adding `@router.get("/conversations/{id}/messages")` resolves to `/conversations/conversations/{id}/messages`. Use `@router.get("/{id}/messages")` — the prefix is prepended automatically.

## Lessons Learned — Phase 2 (CSS/UI — complete)

> Keep only lessons that would cause Claude to make a mistake if forgotten.

- **`tailwind.config.cjs` required, not `.js`.** `frontend/package.json` has `"type": "module"`, so `.js` files are treated as ESM. Tailwind v3 cannot load ESM config — it silently falls back to defaults, generating no custom classes. Fix: use `tailwind.config.cjs` with `module.exports = { ... }`. Deleting the `.js` version is necessary or Tailwind may pick up the wrong one.

- **`@apply` with custom Tailwind classes fails in `@layer base`.** When Tailwind processes the CSS, custom classes (e.g. `bg-surface-1`) don't exist yet at `@layer base` processing time. Use plain CSS properties there instead: `background-color: var(--bg-1)` rather than `@apply bg-surface-1`. Standard utilities like `antialiased` or `flex` are fine with `@apply`.

- **`launch.json` frontend entry needs `"cwd"` set to `frontend/`.** Tailwind resolves its config relative to the Node process's working directory. Without `"cwd": "C:/Users/dwyer/PythonProjects/ChatUnbound/frontend"` in the frontend launch config, the node process runs from an unknown directory and `tailwind.config.cjs` is never found. Symptom: `warn - The 'content' option in your Tailwind CSS configuration is missing or empty`.

- **Runtime theming with Tailwind: define all colors as CSS variable references.** Map every Tailwind color token to a `var(--css-var)` in `tailwind.config.cjs`. `ThemeContext` swaps the CSS vars on `document.documentElement` at runtime. Opacity modifiers (`text-accent/50`) don't work with this pattern — define explicit CSS vars for each opacity variant instead (e.g. `--gold-dim`, `--gold-faint`).

- **Tailwind `content` paths must be absolute in `tailwind.config.cjs`.** Relative paths (`./src/**/*.{js,jsx}`) resolve against the process cwd, which is unpredictable when Vite is launched via script or the preview tool. Use `require("path").join(__dirname, "src/**/*.{js,jsx}")`. Symptom: CSS is ~14 KB (base reset only), zero utility classes generated. Also: `vite.config.js` must load PostCSS explicitly via `css.postcss.plugins` using `tailwindcss(require.resolve("./tailwind.config.cjs"))` — auto-discovered `postcss.config.cjs` is silently ignored when Vite's cwd differs from the frontend root.

- **Apply palette synchronously in `useState` initializer to avoid flash.** Calling `applyTheme()` inside the lazy initializer of `useState` (not in a `useEffect`) means CSS vars are set before the first React render. A `useEffect` fires after paint and causes a visible flash of the wrong theme.

- **ThemeContext shape:** `{ palette, setPalette, mode, setMode, palettes }`. Persists to `localStorage` keys `cu-palette` and `cu-mode`. Each palette stores `accentVars` (shared across modes) and `darkBg` separately; light mode uses a shared `LIGHT_BG` constant. Text vars (`--text-0/1/2`, `--error`) are also swapped per mode via `DARK_TEXT` / `LIGHT_TEXT` constants.

## Lessons Learned — Phase 3

*(fill in after Phase 3 is complete)*

## Lessons Learned — Phase 4

*(fill in after Phase 4 is complete)*
