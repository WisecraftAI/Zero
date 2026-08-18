# Script builders — coding prompt

**Workspace:** Script builders  
**Folder:** `packages/builders/`  
**npm package:** `@zero/builders`  
**Cursor skill:** `/zero-builders`

## Purpose

Emit Playwright spec + Java/Selenium/JUnit class as **text**. Same input, same output.

## Design patterns

- Builder / template method
- Pure functions — no globals, no I/O at import
- Snapshot tests (V3)

## You may change

- Emitter text, locator interpolation, file headers

## You must not

- Launch a browser to “verify” output
- Import Express or vendor SDKs
- Write files except when a caller asks

## Honour

- Input is the merged locator set + test cases
- Output is portable scaffolding, not a claim of green E2E
