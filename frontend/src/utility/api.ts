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