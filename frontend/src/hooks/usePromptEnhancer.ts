import { useCallback } from 'react';
import { BACKEND_URL } from '@/utility/api';
import { useAppDispatch } from '@/store/hooks';
import { setIsEnhancingPrompt } from '@/store/workspaceSlice';

export function usePromptEnhancer() {
  const dispatch = useAppDispatch();

  const enhance = useCallback(async (
    message: string,
    onUpdate: (text: string) => void,
  ) => {
    if (!message.trim()) return;
    try {
      dispatch(setIsEnhancingPrompt(true));
      onUpdate('');
      const response = await fetch(`${BACKEND_URL}/enhance-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');
      const decoder = new TextDecoder();
      let enhanced = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(5);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                enhanced += parsed.text;
                onUpdate(enhanced);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Error enhancing prompt:', error);
    } finally {
      dispatch(setIsEnhancingPrompt(false));
    }
  }, [dispatch]);

  return enhance;
}
