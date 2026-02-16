import axios from "axios";
import type { ChatMessage, Framework } from "../types";

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export interface TemplateResponse {
  projectType: "webapp" | "service";
  prompts: string[];
  uiPrompts: string[];
}

export const getTemplate = (prompt: string, framework: Framework) => {
  return axios.post<TemplateResponse>(`${BACKEND_URL}/template`, {
    prompt,
    framework,
  });
};

export  const getChatResponse = (messages: ChatMessage[])  =>{
    return  axios.post(`${BACKEND_URL}/chat`, { messages });
}

/**
 * Read an SSE stream from a fetch Response, calling `onText` for each
 * `{ text }` chunk received.  Resolves when the stream ends or `[DONE]`
 * is received.
 */
export async function readSseStream(
  response: Response,
  onText: (text: string) => void,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No reader available');
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          if (parsed.text) onText(parsed.text);
        } catch {
          // ignore parse errors
        }
      }
    }
  }
}