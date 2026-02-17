import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { editFile, initWorkspace, submitFollowUp } from './workspaceSlice';

export type ErrorSource = 'npm-install' | 'vite-compilation' | 'runtime' | 'dev-server-crash';

export interface AppError {
  id: string;
  source: ErrorSource;
  summary: string;
  detail: string;
  filePath?: string;
  dedupKey: string;
  isLlmCaused: boolean;
}

export interface ErrorState {
  current: AppError | null;
  lastUserEditTimestamp: number | null;
  lastLlmCompleteTimestamp: number | null;
}

const initialState: ErrorState = {
  current: null,
  lastUserEditTimestamp: null,
  lastLlmCompleteTimestamp: null,
};

function computeIsLlmCaused(
  lastLlmCompleteTimestamp: number | null,
  lastUserEditTimestamp: number | null
): boolean {
  if (lastLlmCompleteTimestamp === null) return false;
  if (lastUserEditTimestamp === null) return true;
  return lastLlmCompleteTimestamp > lastUserEditTimestamp;
}

const errorSlice = createSlice({
  name: 'error',
  initialState,
  reducers: {
    setAppError(
      state,
      action: PayloadAction<Omit<AppError, 'isLlmCaused'>>
    ) {
      const payload = action.payload;
      if (state.current && state.current.dedupKey === payload.dedupKey) {
        return;
      }
      const isLlmCaused = computeIsLlmCaused(
        state.lastLlmCompleteTimestamp,
        state.lastUserEditTimestamp
      );
      state.current = {
        ...payload,
        isLlmCaused,
      };
    },
    clearAppError(state) {
      state.current = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(editFile, (state) => {
      state.lastUserEditTimestamp = Date.now();
      state.current = null;
    });
    builder.addCase(initWorkspace.fulfilled, (state) => {
      state.lastLlmCompleteTimestamp = Date.now();
      state.current = null;
    });
    builder.addCase(submitFollowUp.fulfilled, (state) => {
      state.lastLlmCompleteTimestamp = Date.now();
    });
  },
});

export const { setAppError, clearAppError } = errorSlice.actions;

export default errorSlice.reducer;
