export enum StepType {
    CreateFile,
    CreateFolder,
    EditFile,
    DeleteFile,
    RunScript
  }
  
  export interface Step {
    id: string;
    title: string;
    description: string;
    type: StepType;
    status: 'pending' | 'in-progress' | 'completed';
    code?: string;
    path?: string;
  }
  
  export interface Project {
    prompt: string;
    steps: Step[];
  }
  
  export interface FileItem {
    name: string;
    type: 'file' | 'folder';
    children?: FileItem[];
    content?: string;
    path: string;
  }
  
export interface Framework {
  webapp: string;
  service: string;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export interface Checkpoint {
  id: string;
  version: number;
  label: string;
  createdAt: number;
  files: FileItem[];
  steps: Step[];
  llmMessages: { role: 'user' | 'assistant'; content: string }[];
}