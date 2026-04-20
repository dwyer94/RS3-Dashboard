# Skill: Debugging

**Trigger:** When diagnosing errors, unexpected behavior, or failing tests.

## Process

1. **Reproduce first** — Confirm the error is consistent before theorizing
2. **Read the full stack trace** — Don't skim; the real cause is often 3-4 lines down
3. **Isolate** — Narrow to smallest failing case before changing code
4. **Hypothesize → Test → Confirm** — One change at a time

## Before Writing Code

Always ask:
- What is the *expected* behavior?
- What is the *actual* behavior?
- When did this last work? What changed?
- Is there a relevant error message, log line, or stack trace?

## Output Format

```
## Root Cause
[Clear statement of what's actually wrong]

## Why It Happened  
[Brief explanation of the mechanism]

## Fix
[Code change or steps]

## How to Verify
[Command or check to confirm it's resolved]
```

## Principles
- Don't "fix" symptoms — find the cause
- Prefer adding logging/assertions to confirm theories before changing logic
- If unsure, say so and list top 2-3 hypotheses to test
