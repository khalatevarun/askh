import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { FileItem, Framework } from '../types';
import { parseXml } from '../steps';
import {
  applyStepsToFiles,
  updateFileByPath,
  flattenFiles,
} from '../utility/file-tree';
import { buildModificationsBlock } from '../utility/bolt-modifications';
import { getChatResponse, getTemplate } from '../utility/api';

export type WorkspacePhase = 'idle' | 'building' | 'ready';

export interface WorkspaceState {
  phase: WorkspacePhase;
  files: FileItem[];
  llmMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  selectedFile: { name: string; content: string; path?: string } | null;
  userPrompt: string;

  framework: Framework;
  activeOperations: Record<string, { id: string; message: string }>;
  globalError: string | null;
  isEnhancingPrompt: boolean;
}

const DEFAULT_FRAMEWORK: Framework = { webapp: 'react', service: '' };

const initialState: WorkspaceState = {
  phase: 'idle',
  files: [],
  llmMessages: [],
  selectedFile: null,
  userPrompt: '',

  framework: DEFAULT_FRAMEWORK,
  activeOperations: {},
  globalError: null,
  isEnhancingPrompt: false,
};

// ---------------------------------------------------------------------------
// Async thunks
// ---------------------------------------------------------------------------

interface InitWorkspaceResult {
  uiXml: string;
  chatXml: string;
  allMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export const initWorkspace = createAsyncThunk<
  InitWorkspaceResult,
  { prompt: string; framework: Framework }
>(
  'workspace/init',
  async ({ prompt, framework }, { dispatch }) => {
    const response = await getTemplate(prompt, framework);
    const { prompts, uiPrompts } = response.data;

    dispatch(templateLoaded({ xml: uiPrompts[0] }));

    const messagesPayload = [...prompts, prompt].map((content: string) => ({
      role: 'user' as const,
      content,
    }));

    const stepsResponse = await getChatResponse(messagesPayload);
    const chatXml = stepsResponse.data.response;
    const allMessages = [
      ...messagesPayload,
      { role: 'assistant' as const, content: chatXml },
    ];

    return { uiXml: uiPrompts[0], chatXml, allMessages };
  }
);

interface FollowUpResult {
  xml: string;
  allMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export const submitFollowUp = createAsyncThunk<
  FollowUpResult,
  { filesAtLastLlmRef: Array<{ path: string; content: string }> | null; userPrompt: string },
  { state: { workspace: WorkspaceState } }
>(
  'workspace/followUp',
  async ({ filesAtLastLlmRef, userPrompt }, { getState }) => {
    const { workspace } = getState();
    const currentFlat = flattenFiles(workspace.files);
    let content = userPrompt;
    if (filesAtLastLlmRef != null) {
      const block = buildModificationsBlock(filesAtLastLlmRef, currentFlat);
      if (block) content = `${block}\n\n${userPrompt}`;
    }
    const newMessage = { role: 'user' as const, content };
    const allMessages = [...workspace.llmMessages, newMessage];

    const response = await getChatResponse(allMessages);
    const xml = response.data.response;
    const fullMessages = [
      ...allMessages,
      { role: 'assistant' as const, content: xml },
    ];

    return { xml, allMessages: fullMessages };
  }
);

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setWorkspaceParams(state, action: PayloadAction<{ framework: Framework }>) {
      state.framework = action.payload.framework;
    },
    templateLoaded(state, action: PayloadAction<{ xml: string }>) {
      const newSteps = parseXml(action.payload.xml);
      const { files } = applyStepsToFiles(state.files, newSteps);
      state.files = files;
      state.phase = 'building';
    },
    editFile(state, action: PayloadAction<{ path: string; content: string }>) {
      // Normalize path to match tree (leading slash, no trailing slash) so updateFileByPath finds the node
      const raw = action.payload.path.trim().replace(/\/+$/, '') || '/';
      const normalizedPath = raw.startsWith('/') ? raw : `/${raw}`;
      state.files = updateFileByPath(state.files, normalizedPath, action.payload.content);
      const selectedPath = state.selectedFile?.path;
      const normalizedSelected = selectedPath ? (selectedPath.startsWith('/') ? selectedPath : `/${selectedPath}`) : '';
      if (state.selectedFile && normalizedPath === normalizedSelected) {
        state.selectedFile = { ...state.selectedFile, content: action.payload.content, path: normalizedPath };
      }
    },
    setSelectedFile(state, action: PayloadAction<{ name: string; content: string; path?: string } | null>) {
      state.selectedFile = action.payload;
    },
    setUserPrompt(state, action: PayloadAction<string>) {
      state.userPrompt = action.payload;
    },
    restoreCheckpoint(state, action: PayloadAction<{
      files: FileItem[];
      llmMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
    }>) {
      state.files = action.payload.files;
      state.llmMessages = action.payload.llmMessages;
      state.phase = 'ready';
      state.selectedFile = null;
    },
    startOperation(state, action: PayloadAction<{ id: string; message: string }>) {
      state.activeOperations[action.payload.id] = action.payload;
    },
    updateOperationMessage(state, action: PayloadAction<{ id: string; message: string }>) {
      if (state.activeOperations[action.payload.id]) {
        state.activeOperations[action.payload.id].message = action.payload.message;
      }
    },
    finishOperation(state, action: PayloadAction<string>) {
      delete state.activeOperations[action.payload];
    },
    setGlobalError(state, action: PayloadAction<string | null>) {
      state.globalError = action.payload;
    },
    setIsEnhancingPrompt(state, action: PayloadAction<boolean>) {
      state.isEnhancingPrompt = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initWorkspace.pending, (state) => {
        state.activeOperations['workspace:init'] = { id: 'workspace:init', message: 'Building your app...' };
        state.globalError = null;
      })
      .addCase(initWorkspace.fulfilled, (state, action) => {
        const newSteps = parseXml(action.payload.chatXml);
        const { files } = applyStepsToFiles(state.files, newSteps);
        state.files = files;
        state.llmMessages = action.payload.allMessages;
        state.phase = 'ready';
        delete state.activeOperations['workspace:init'];
      })
      .addCase(initWorkspace.rejected, (state, action) => {
        state.globalError = action.error.message ?? 'Failed to initialize workspace';
        delete state.activeOperations['workspace:init'];
      })
      .addCase(submitFollowUp.pending, (state) => {
        state.phase = 'building';
        state.activeOperations['workspace:followUp'] = { id: 'workspace:followUp', message: 'Processing follow-up...' };
        state.globalError = null;
      })
      .addCase(submitFollowUp.fulfilled, (state, action) => {
        const newSteps = parseXml(action.payload.xml);
        const { files } = applyStepsToFiles(state.files, newSteps);
        state.files = files;
        state.llmMessages = action.payload.allMessages;
        state.phase = 'ready';
        delete state.activeOperations['workspace:followUp'];
      })
      .addCase(submitFollowUp.rejected, (state, action) => {
        state.globalError = action.error.message ?? 'Follow-up failed';
        state.phase = 'ready';
        delete state.activeOperations['workspace:followUp'];
      });
  },
});

export const {
  setWorkspaceParams,
  templateLoaded,
  editFile,
  setSelectedFile,
  setUserPrompt,

  restoreCheckpoint,
  startOperation,
  updateOperationMessage,
  finishOperation,
  setGlobalError,
  setIsEnhancingPrompt,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;
