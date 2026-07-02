---
description: Run TypeScript type check and Vite build validation on a React/TypeScript project. Use after code edits to verify no type errors or build failures.
---

# TypeScript Quality Gate

Run the following commands in sequence to validate your TypeScript/React project:

## 1. Type check

```bash
cd "$1" && npx tsc --noEmit 2>&1
```

- If there are errors, read the full output and fix them before proceeding
- Use `npx tsc --noEmit 2>&1 | head -100` for initial scan
- Use `npx tsc --noEmit 2>&1 | tail -80` to see the summary

## 2. Build validation

```bash
cd "$1" && npx vite build 2>&1 | tail -20
```

- Must complete with no errors
- Check for warnings about unused imports or missing dependencies

## 3. If errors found

- Fix the TypeScript errors first (they often cause build failures too)
- Re-run both commands until clean
- Do not claim success until both commands pass with no errors
