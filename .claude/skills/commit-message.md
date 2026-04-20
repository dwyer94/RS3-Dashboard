# Skill: Commit Messages

**Trigger:** When asked to write or suggest a git commit message.

## Format (Conventional Commits)

```
<type>(<scope>): <short description>

[optional body — what changed and why, not how]

[optional footer — breaking changes, issue refs]
```

## Types
- `feat` — new feature
- `fix` — bug fix
- `refactor` — code change with no behavior change
- `test` — adding or updating tests
- `docs` — documentation only
- `chore` — build, deps, config changes
- `perf` — performance improvement

## Rules
- Subject line: max 72 chars, imperative mood ("Add X" not "Added X")
- No period at end of subject
- Body: explain *why*, not *what* (the diff shows what)
- Reference issues: `Closes #123` in footer

## Examples
```
feat(auth): add Google OAuth login

Replaces the username/password-only flow with Google OAuth.
Users can still use email if preferred.

Closes #45
```

```
fix(api): prevent duplicate invoice creation on retry

Added idempotency key check before INSERT to handle
network retry scenarios that caused double-billing.
```
