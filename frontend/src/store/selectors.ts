import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';
import { flattenFiles } from '../utility/file-tree';

export const selectPhase = (state: RootState) => state.workspace.phase;
export const selectFiles = (state: RootState) => state.workspace.files;
export const selectSelectedFile = (state: RootState) => state.workspace.selectedFile;
export const selectUserPrompt = (state: RootState) => state.workspace.userPrompt;
export const selectIsEnhancingPrompt = (state: RootState) => state.workspace.isEnhancingPrompt;
export const selectCheckpoints = (state: RootState) => state.checkpoint.checkpoints;
export const selectChatItems = (state: RootState) => state.chat.items;
export const selectPreviewState = (state: RootState) => state.preview;

export const selectFlatFiles = createSelector(
  selectFiles,
  (files) => flattenFiles(files)
);

export const selectIsBuildingApp = createSelector(
  selectPhase,
  (phase) => phase !== 'ready'
);

export const selectIsFollowUpDisabled = createSelector(
  [selectIsBuildingApp, selectIsEnhancingPrompt],
  (building, enhancing) => building || enhancing
);
