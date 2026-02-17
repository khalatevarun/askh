import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';

const selectWorkspace = (state: RootState) => state.workspace;
const selectPreview = (state: RootState) => state.preview;

export const selectPhase = (state: RootState) => state.workspace.phase;
export const selectFiles = (state: RootState) => state.workspace.files;
export const selectLlmMessages = (state: RootState) => state.workspace.llmMessages;
export const selectSelectedFile = (state: RootState) => state.workspace.selectedFile;
export const selectUserPrompt = (state: RootState) => state.workspace.userPrompt;

export const selectActiveOperations = (state: RootState) => state.workspace.activeOperations;
export const selectGlobalError = (state: RootState) => state.workspace.globalError;
export const selectIsEnhancingPrompt = (state: RootState) => state.workspace.isEnhancingPrompt;
export const selectCheckpoints = (state: RootState) => state.checkpoint.checkpoints;
export const selectChatItems = (state: RootState) => state.chat.items;
export const selectPreviewState = (state: RootState) => state.preview;

export const selectIsBuildingApp = createSelector(
  selectPhase,
  (phase) => phase !== 'ready'
);

export const selectIsAppBusy = createSelector(
  selectActiveOperations,
  (ops) => Object.keys(ops).length > 0
);

export const selectIsWorkspaceBusy = createSelector(
  selectActiveOperations,
  (ops) => 'workspace:init' in ops || 'workspace:followUp' in ops
);

export const selectPrimaryStatusMessage = createSelector(
  [selectWorkspace, selectPreview],
  (workspace, preview) => {
    if (workspace.activeOperations['workspace:init']) {
      return workspace.activeOperations['workspace:init'].message;
    }
    if (workspace.activeOperations['workspace:followUp']) {
      return workspace.activeOperations['workspace:followUp'].message;
    }
    if (workspace.isEnhancingPrompt) {
      return 'Enhancing prompt...';
    }
    if (preview.status !== 'idle' && preview.status !== 'running') {
      const labels: Record<string, string> = {
        building: 'Building your app...',
        mounting: 'Setting up project...',
        installing: 'Installing dependencies...',
        starting: 'Starting dev server...',
        error: 'Something went wrong',
      };
      return labels[preview.status] ?? '';
    }
    return '';
  }
);

export const selectIsFollowUpDisabled = createSelector(
  [selectIsBuildingApp, selectIsEnhancingPrompt, selectIsAppBusy],
  (building, enhancing, busy) => building || enhancing || busy
);

export const selectIsSubmitDisabled = createSelector(
  [selectIsFollowUpDisabled, selectUserPrompt],
  (followUpDisabled, prompt) => followUpDisabled || !prompt.trim()
);

export const selectCurrentError = (state: RootState) => state.error.current;

export const selectHasPreviewError = createSelector(
  selectCurrentError,
  (error) => error !== null
);
