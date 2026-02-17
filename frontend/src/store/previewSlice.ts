import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppError } from '../types/errors';

export type PreviewStatus = 'idle' | 'building' | 'mounting' | 'installing' | 'starting' | 'running' | 'error';

export interface PreviewState {
  url: string;
  status: PreviewStatus;
  error: string | undefined;
  errors: AppError[];
}

const initialState: PreviewState = {
  url: '',
  status: 'idle',
  error: undefined,
  errors: [],
};

const previewSlice = createSlice({
  name: 'preview',
  initialState,
  reducers: {
    setPreviewStatus(state, action: PayloadAction<PreviewStatus>) {
      state.status = action.payload;
    },
    setPreviewError(state, action: PayloadAction<string | undefined>) {
      state.error = action.payload;
      if (action.payload) {
        state.status = 'error';
      }
    },
    addError(state, action: PayloadAction<AppError>) {
      if (!state.errors.some(e => e.id === action.payload.id)) {
        state.errors.push(action.payload);
      }
    },
    clearErrors(state) {
      state.errors = [];
    },
    setPreviewRunning(state, action: PayloadAction<string>) {
      state.url = action.payload;
      state.status = 'running';
      state.error = undefined;
      state.errors = [];
    },
    resetPreview(state) {
      state.url = '';
      state.status = 'idle';
      state.error = undefined;
    },
  },
});

export const {
  setPreviewStatus,
  setPreviewError,
  addError,
  clearErrors,
  setPreviewRunning,
  resetPreview,
} = previewSlice.actions;

export default previewSlice.reducer;
