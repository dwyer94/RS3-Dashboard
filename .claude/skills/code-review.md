# Skill: Code Review

**Trigger:** When asked to review code, a PR, or a file for quality.

## What to Check

1. **Correctness** — Does the logic match the intent? Edge cases handled?
2. **Consistency** — Does it match conventions in CLAUDE.md and surrounding code?
3. **Security** — Any exposed secrets, unsanitized inputs, or unsafe operations?
4. **Performance** — Any obvious N+1 queries, missing indexes, or unnecessary re-renders?
5. **Readability** — Would a new team member understand this in 60 seconds?

## Output Format

Structure your review as:

```
## Summary
[1-2 sentence overall assessment]

## Must Fix
- [Issue]: [Why it matters] → [Suggested fix]

## Suggestions
- [Nice-to-have improvement]

## Looks Good
- [What was done well — always include at least one]
```

## Tone
Be direct but constructive. Explain *why* something matters, not just what to change.
