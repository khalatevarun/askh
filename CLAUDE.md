# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ASKH is an AI-powered web app builder. Users describe what they want, an LLM generates code as structured XML artifacts, and the result runs live in a WebContainer-based preview. It supports React, Vue, Svelte, Solid (webapps) and Node.js (services).

## Development Commands

### Backend (`backend/`)
```bash
cd backend && npm run dev       # Compile TS + run server (port 3000)
cd backend && npm run build     # TypeScript compile only
cd backend && npm start         # Run compiled dist/index.js
cd backend && npx tsc --noEmit  # Type check
```

### Frontend (`frontend/`)
```bash
cd frontend && npm run dev      # Vite dev server
cd frontend && npm run build    # Production build
cd frontend && npm run lint     # ESLint
cd frontend && npx tsc --noEmit # Type check
```

No test framework is configured yet.

## Architecture

### Backend (Express + TypeScript, CommonJS)
Single-file server at `backend/src/index.ts` with three endpoints:
- **POST `/template`** — Analyzes user prompt, returns framework template boilerplate + UI prompts
- **POST `/enhance-prompt`** — Streams an enhanced version of the user's prompt via SSE
- **POST `/chat`** — Main code generation endpoint; sends conversation to LLM, returns XML artifacts

LLM integration uses the OpenAI SDK pointed at OpenRouter (`OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`). System prompts live in `backend/src/prompts.ts`. Framework starter templates are in `backend/src/defaults/` (react.ts, vue.ts, svelte.ts, solid.ts, node.ts).

### Frontend (React + Vite + TypeScript, ES modules)

**Pages:**
- `Home.tsx` (`/`) — Prompt input, framework selection dialog, prompt enhancement
- `Workspace.tsx` (`/workspace`) — Three-panel IDE: checkpoints+steps+prompt (left), file explorer+code editor (center), live preview (right)

**Core hooks (in `frontend/src/hooks/`):**
- `useWorkspace` — Reducer-based state management for files, steps, checkpoints, and LLM messages. Implements content-addressable checkpoint storage with a blob store (Map<hash, content>) and checkpoint trees (Map<path, hash>) for deduplication.
- `useWebContainer` — Boots and manages the WebContainer instance
- `usePreview` — Syncs file changes to WebContainer; skips full restart for content-only changes, only restarts when `package.json` changes. Leverages Vite HMR.

**LLM response parsing (`frontend/src/steps.ts`):**
The LLM returns `<boltArtifact>` XML containing `<boltAction type="file" filePath="...">` elements. `parseXml()` converts these into Step objects (CreateFile, RunScript, etc.) which are applied to the file tree.

**File tree operations (`frontend/src/utility/file-tree.ts`):**
Immutable tree manipulation — `flattenFiles()`, `updateFileByPath()`, `buildFileTreeFromFlatList()`, `createMountStructure()`, `applyStepsToFiles()`.

**Follow-up prompts:**
User edits are tracked against `filesAtLastLlmRef`. On follow-up, `buildModificationsBlock()` (in `utility/bolt-modifications.ts`) generates an XML diff block so the LLM knows what the user changed.

### WebContainer Integration
The frontend uses `@webcontainer/api` to run generated projects in-browser. Vite config sets COEP/COOP headers for SharedArrayBuffer support. The preview iframe stays mounted (visibility toggled) to preserve in-iframe state across tab switches.

## Code Conventions

- 2-space indentation throughout
- TypeScript strict mode in both frontend and backend
- Import order: Node built-ins → external libraries (alphabetical) → internal modules
- File naming: kebab-case for utilities, PascalCase for React components
- Naming: camelCase variables/functions, PascalCase types/interfaces, UPPER_SNAKE_CASE exported constants
- Prefer interfaces over type aliases for object shapes
- Use enums for constants with semantic meaning (e.g., `StepType`)
- Functional React components with hooks; use `useCallback` for event handlers
- Axios for HTTP requests, not fetch

## Key Technical Details

- Backend model: `arcee-ai/trinity-large-preview:free` via OpenRouter, max 8000 tokens (chat), 600 tokens (enhancement)
- Frontend path alias: `@` → `src/` (configured in vite.config.ts and tsconfig)
- UI: Tailwind CSS (dark mode via class), Radix UI primitives with shadcn wrappers, Framer Motion for animations
- Code editor: Monaco Editor (`@monaco-editor/react`)
- Project export: ZIP download via `utility/helper.ts`
