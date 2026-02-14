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
  },
});

export const { addCheckpoint, clearCheckpoints } = checkpointSlice.actions;

export default checkpointSlice.reducer;
