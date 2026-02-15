import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { FileItem, Step, Framework } from '../types';
import type { CheckpointState } from './checkpointSlice';
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
  steps: Step[];
  selectedFile: { name: string; content: string; path?: string } | null;
  userPrompt: string;
  initialPrompt: string;
  framework: Framework;
  isEnhancingPrompt: boolean;
}

const DEFAULT_FRAMEWORK: Framework = { webapp: 'react', service: '' };

const initialState: WorkspaceState = {
  phase: 'idle',
  files: [],
  steps: [],
  selectedFile: null,
  userPrompt: '',
  initialPrompt: '',
  framework: DEFAULT_FRAMEWORK,
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
  { filesAtLastLlmRef: Array<{ path: string; content: string }> | null },
  { state: { workspace: WorkspaceState; checkpoint: CheckpointState } }
>(
  'workspace/followUp',
  async ({ filesAtLastLlmRef }, { getState }) => {
    const { workspace, checkpoint } = getState();
    const currentFlat = flattenFiles(workspace.files);
    let content = workspace.userPrompt;
    if (filesAtLastLlmRef != null) {
      const block = buildModificationsBlock(filesAtLastLlmRef, currentFlat);
      if (block) content = `${block}\n\n${workspace.userPrompt}`;
    }
    const newMessage = { role: 'user' as const, content };
    const lastCp = checkpoint.checkpoints[checkpoint.checkpoints.length - 1];
    const prevMessages = lastCp?.llmMessages ?? [];
    const allMessages = [...prevMessages, newMessage];

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
    setWorkspaceParams(state, action: PayloadAction<{ prompt: string; framework: Framework }>) {
      state.initialPrompt = action.payload.prompt;
      state.framework = action.payload.framework;
    },
    templateLoaded(state, action: PayloadAction<{ xml: string }>) {
      const newSteps = parseXml(action.payload.xml);
      const { files } = applyStepsToFiles(state.files, newSteps);
      state.files = files;
      state.steps = [
        ...state.steps,
        ...newSteps.map(s => ({ ...s, status: 'completed' as const })),
      ];
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
      steps: Step[];
    }>) {
      state.files = action.payload.files;
      state.steps = action.payload.steps;
      state.phase = 'ready';
      state.selectedFile = null;
    },
    setIsEnhancingPrompt(state, action: PayloadAction<boolean>) {
      state.isEnhancingPrompt = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initWorkspace.pending, (state) => {
        state.phase = 'building';
      })
      .addCase(initWorkspace.fulfilled, (state, action) => {
        const newSteps = parseXml(action.payload.chatXml);
        const { files } = applyStepsToFiles(state.files, newSteps);
        state.files = files;
        state.steps = [
          ...state.steps,
          ...newSteps.map(s => ({ ...s, status: 'completed' as const })),
        ];
        state.phase = 'ready';
      })
      .addCase(initWorkspace.rejected, (state) => {
        state.phase = 'ready';
      })
      .addCase(submitFollowUp.pending, (state) => {
        state.phase = 'building';
      })
      .addCase(submitFollowUp.fulfilled, (state, action) => {
        const newSteps = parseXml(action.payload.xml);
        const { files } = applyStepsToFiles(state.files, newSteps);
        state.files = files;
        state.steps = [
          ...state.steps,
          ...newSteps.map(s => ({ ...s, status: 'completed' as const })),
        ];
        state.phase = 'ready';
        state.userPrompt = '';
      })
      .addCase(submitFollowUp.rejected, (state) => {
        state.phase = 'ready';
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
  setIsEnhancingPrompt,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;
