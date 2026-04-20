# Codex Workflows (Ported From Claude Hooks)

These scripts replace the Claude `PostToolUse`/`Stop` hook behavior with explicit Codex-friendly commands.

## 1) Check one edited file

```powershell
powershell -ExecutionPolicy Bypass -File .codex/scripts/check-file.ps1 -FilePath backend/routers/chat.py
```

Behavior:
- `.py`: runs `black` then `ruff check`
- `.js/.jsx/.ts/.tsx`: runs Prettier `--write` then ESLint (from `frontend/node_modules/.bin`)

## 2) Check all changed files

```powershell
powershell -ExecutionPolicy Bypass -File .codex/scripts/run-changed-checks.ps1
```

Staged-only variant:

```powershell
powershell -ExecutionPolicy Bypass -File .codex/scripts/run-changed-checks.ps1 -Staged
```

## 3) Service preflight reminder

```powershell
powershell -ExecutionPolicy Bypass -File .codex/scripts/preflight-services.ps1
```

Uses `127.0.0.1` endpoints:
- FastAPI: `:8000/health`
- Ollama: `:11434/api/tags`
- ComfyUI: `:8188/queue` (optional unless testing image gen)

## Notes

- Your original Claude files remain unchanged in `.claude/`.
- `.codex/settings.json` is still a Claude-format reference file; Codex does not execute those hook blocks directly.
