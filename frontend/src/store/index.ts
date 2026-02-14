import { configureStore } from '@reduxjs/toolkit';
import workspaceReducer from './workspaceSlice';
import checkpointReducer from './checkpointSlice';
import previewReducer from './previewSlice';

export const store = configureStore({
  reducer: {
    workspace: workspaceReducer,
    checkpoint: checkpointReducer,
    preview: previewReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
