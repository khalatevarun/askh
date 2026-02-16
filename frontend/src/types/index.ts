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
  
  export interface FileViewerProps {
    file: FileItem | null;
    onClose: () => void;
  }

export interface Framework {
  webapp: string;
  service: string;
}

export interface ChatMessage {
  role: string;
  content: string;
}

/** Checkpoint: snapshot of workspace state (tree = path → content). */
export interface Checkpoint {
  id: string;
  version: number;
  label: string;
  createdAt: number;
  /** path → file content. */
  tree: Record<string, string>;
  steps: Step[];
  llmMessages: { role: 'user' | 'assistant'; content: string }[];
}