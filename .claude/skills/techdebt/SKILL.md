---
name: techdebt
description: Find and fix duplicated code and unused dead code in the codebase. Extracts shared logic into reusable modules and removes code that is not referenced anywhere.
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Edit, Write
argument-hint: "[file-or-directory]"
---

# Tech Debt Cleaner

Clean up the codebase by removing duplication and dead code. If `$ARGUMENTS` is provided, focus on that file or directory. Otherwise, analyze the entire project.

## Step 1: Find and fix duplicated code

Search for repeated logic across files — similar function bodies, copy-pasted blocks, repeated inline values, and duplicated patterns. For each instance:

- Extract the shared logic into a reusable function or module in an appropriate location
- Replace all occurrences with imports of the shared code
- Preserve existing behavior exactly — no functional changes

## Step 2: Find and remove dead code

Identify code that is not imported, called, or referenced anywhere:

- Unused exports (functions, constants, types, interfaces)
- Unused local variables and parameters
- Unused files (not imported by any other file)
- Unreachable code paths

Remove dead code entirely. Do not comment it out.

## Rules

- Make one focused change at a time — do not combine unrelated cleanups in a single edit
- Verify each removal by searching for all references before deleting
- Do not change any public API or behavior
- Run type checking after changes if TypeScript is configured
