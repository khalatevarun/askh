import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ChatItem =
  | { type: 'user'; content: string }
  | { type: 'assistant'; content: string }
  | { type: 'checkpoint'; checkpointId: string };

export interface ChatState {
  items: ChatItem[];
}

const initialState: ChatState = {
  items: [],
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    appendChatItems(
      state,
      action: PayloadAction<{
        messages: Array<{ role: 'user' | 'assistant'; content: string }>;
        checkpointId: string;
      }>
    ) {
      for (const m of action.payload.messages) {
        state.items.push({
          type: m.role,
          content: m.content,
        });
      }
      state.items.push({ type: 'checkpoint', checkpointId: action.payload.checkpointId });
    },
    clearChat(state) {
      state.items = [];
    },
    truncateChatAfterCheckpoint(state, action: PayloadAction<string>) {
      const idx = state.items.findLastIndex(
        item => item.type === 'checkpoint' && item.checkpointId === action.payload
      );
      if (idx !== -1) {
        state.items = state.items.slice(0, idx + 1);
      }
    },
  },
});

export const { appendChatItems, clearChat, truncateChatAfterCheckpoint } = chatSlice.actions;

export default chatSlice.reducer;
