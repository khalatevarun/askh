import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Checkpoint } from '../types';

export interface CheckpointState {
  checkpoints: Checkpoint[];
}

const initialState: CheckpointState = {
  checkpoints: [],
};

const checkpointSlice = createSlice({
  name: 'checkpoint',
  initialState,
  reducers: {
    addCheckpoint(state, action: PayloadAction<Checkpoint>) {
      state.checkpoints.push(action.payload);
    },
    clearCheckpoints(state) {
      state.checkpoints = [];
    },
    revertToCheckpoint(state, action: PayloadAction<string>) {
      const idx = state.checkpoints.findIndex(c => c.id === action.payload);
      if (idx !== -1) {
        state.checkpoints = state.checkpoints.slice(0, idx + 1);
      }
    },
  },
});

export const { addCheckpoint, clearCheckpoints, revertToCheckpoint } = checkpointSlice.actions;

export default checkpointSlice.reducer;
