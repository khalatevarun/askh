# ASKH Frontend

React app for the ASKH IDE: prompt-driven code generation with live WebContainer preview.

## Tech Stack

React, Vite, TypeScript, Tailwind CSS, Radix UI, Monaco Editor, WebContainer API, Redux Toolkit, Axios.

## Data Flow & Architecture

```mermaid
flowchart TB
    subgraph ui [User Interface]
        Home["Home: prompt input, framework select, enhance"]
        Workspace["Workspace: chat, prompt form, content area"]
        FileExplorer["FileExplorer: file tree"]
        CodeEditor["CodeEditor: Monaco"]
        CheckpointList["CheckpointList: restore snapshots"]
        Preview["Preview: WebContainer iframe"]
    end

    subgraph redux [Redux Store]
        subgraph workspace [workspace slice]
            W_Files["files"]
            W_Steps["steps"]
            W_LlmMessages["llmMessages"]
            W_SelectedFile["selectedFile"]
            W_UserPrompt["userPrompt"]
            W_Phase["phase: idle | building | ready"]
            W_ActiveOps["activeOperations"]
        end
        subgraph chat [chat slice]
            C_Items["items: user / assistant / checkpoint"]
        end
        subgraph preview [preview slice]
            P_Url["url"]
            P_Status["status: mounting | installing | running"]
        end
        subgraph checkpoint [checkpoint slice]
            CP_List["checkpoints"]
        end
    end

    subgraph api [API Layer]
        getTemplate["POST /template"]
        getChatResponse["POST /chat"]
        enhancePrompt["POST /enhance-prompt (SSE)"]
    end

    subgraph hooks [Hooks - Side Effects]
        usePreviewManager["usePreviewManager: sync files to WebContainer"]
        useBlobStore["useBlobStore: content-addressable checkpoint storage"]
    end

    Home -->|"dispatch(setIsEnhancingPrompt)"| workspace
    Home -->|"navigate(state)"| Workspace
    Home -->|"fetch + stream"| enhancePrompt
    enhancePrompt -->|"dispatch(setUserPrompt)"| workspace

    Workspace -->|"dispatch"| initWorkspace_Thunk["initWorkspace thunk"]
    Workspace -->|"dispatch"| submitFollowUp_Thunk["submitFollowUp thunk"]
    Workspace -->|"dispatch(setUserPrompt)"| workspace
    initWorkspace_Thunk --> getTemplate
    initWorkspace_Thunk --> getChatResponse
    submitFollowUp_Thunk --> getChatResponse
    getTemplate -->|"templateLoaded"| workspace
    getChatResponse -->|"fulfilled"| workspace

    Workspace -->|"appendChatItems, clearChat"| chat
    Workspace -->|"createCheckpoint on init/followUp success"| useBlobStore

    FileExplorer -->|"dispatch(setSelectedFile)"| workspace
    FileExplorer -->|"useSelector(selectFiles)"| W_Files
    CodeEditor -->|"useFileEdit"| useFileEdit["useFileEdit: debounced 500ms"]
    useFileEdit -->|"dispatch(editFile)"| workspace
    CodeEditor -->|"useSelector(selectSelectedFile)"| W_SelectedFile

    CheckpointList -->|"onRestore"| useBlobStore
    useBlobStore -->|"restoreCheckpoint"| workspace
    useBlobStore -->|"addCheckpoint"| checkpoint

    W_Files -->|"selectFiles"| usePreviewManager
    usePreviewManager -->|"setPreviewStatus, setPreviewRunning"| preview
    usePreviewManager -->|"mount, sync, run dev"| Preview
    P_Url --> Preview

    workspace -->|"selectors: selectIsFollowUpDisabled, selectIsBuildingApp, etc."| Workspace
    preview -->|"selectPreviewState"| Workspace
    checkpoint -->|"selectCheckpoints"| CheckpointList
```

### Flow Summary

| User Action | Dispatch / API | State Update |
|-------------|----------------|--------------|
| Submit prompt (Home) | `navigate` with prompt + framework | Workspace mounts |
| Workspace mount | `initWorkspace` → `getTemplate` + `getChatResponse` | `files`, `steps`, `llmMessages`, `phase: ready` |
| Enhance prompt | `fetch /enhance-prompt` (SSE) | `userPrompt` streamed, `isEnhancingPrompt` |
| Submit follow-up | `submitFollowUp` → `getChatResponse` | `files`, `steps`, `llmMessages`, `userPrompt` cleared |
| Select file | `setSelectedFile` | `selectedFile` |
| Edit file (Monaco) | `editFile` (debounced 500ms) | `files`, `selectedFile.content` |
| Restore checkpoint | `restoreCheckpoint` | `files`, `steps`, `llmMessages`, `phase: ready` |
| Files change | `usePreviewManager` | `syncChangedFiles` or restart; `preview.status`, `preview.url` |

### Selectors (Derived State)

`selectIsFollowUpDisabled`, `selectIsBuildingApp`, `selectIsAppBusy`, `selectPrimaryStatusMessage`, `selectIsSubmitDisabled` — computed from `phase`, `activeOperations`, `isEnhancingPrompt`, `preview.status`.

## Scripts

```bash
npm run dev     # Vite dev server
npm run build   # Production build
npm run lint    # ESLint
```

## Environment

`VITE_BACKEND_URL` – backend API base URL (e.g. `http://localhost:3000`).
