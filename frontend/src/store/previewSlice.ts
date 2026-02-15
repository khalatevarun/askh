import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type PreviewStatus = 'idle' | 'building' | 'mounting' | 'installing' | 'starting' | 'running' | 'error';

export interface PreviewState {
  url: string;
  status: PreviewStatus;
  error: string | undefined;
}

const initialState: PreviewState = {
  url: '',
  status: 'idle',
  error: undefined,
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
    setPreviewRunning(state, action: PayloadAction<string>) {
      state.url = action.payload;
      state.status = 'running';
      state.error = undefined;
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
  setPreviewRunning,
  resetPreview,
} = previewSlice.actions;

export default previewSlice.reducer;
