import { configureStore } from '@reduxjs/toolkit';
import workspaceReducer from './workspaceSlice';
import checkpointReducer from './checkpointSlice';
import previewReducer from './previewSlice';
import chatReducer from './chatSlice';

export const store = configureStore({
  reducer: {
    workspace: workspaceReducer,
    checkpoint: checkpointReducer,
    preview: previewReducer,
    chat: chatReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
