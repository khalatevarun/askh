export enum ErrorCategory {
  Compilation = 'compilation',
  Runtime = 'runtime',
  Install = 'install',
}

export enum ErrorSource {
  DevServer = 'dev-server',
  PreviewMessage = 'preview-message',
  NpmInstall = 'npm-install',
}

export interface AppError {
  id: string;
  summary: string;
  detail: string;
  category: ErrorCategory;
  source: ErrorSource;
  timestamp: string;
}
