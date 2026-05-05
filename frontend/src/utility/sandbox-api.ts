import axios from 'axios';
import { BACKEND_URL } from './api';
import { flattenFiles } from './file-tree';
import type { FileItem } from '../types';

export interface SandboxInfo {
  sandboxId: string;
  url: string;
}

/** Convert the Redux FileItem tree to the flat { path, content } list the backend expects. */
function toFileEntries(files: FileItem[]) {
  return flattenFiles(files).map(({ path, content }) => ({ path, content }));
}

export async function createSandbox(files: FileItem[], framework: string): Promise<SandboxInfo> {
  const resp = await axios.post(`${BACKEND_URL}/sandbox/create`, {
    files: toFileEntries(files),
    framework,
  });
  return resp.data as SandboxInfo;
}

export async function syncFiles(
  sandboxId: string,
  changedFiles: Array<{ path: string; content: string }>
): Promise<void> {
  await axios.post(`${BACKEND_URL}/sandbox/${sandboxId}/sync`, { files: changedFiles });
}

export async function restartSandbox(
  sandboxId: string,
  changedFiles: Array<{ path: string; content: string }>
): Promise<{ url?: string }> {
  const resp = await axios.post(`${BACKEND_URL}/sandbox/${sandboxId}/restart`, {
    files: changedFiles,
  });
  return resp.data;
}

export async function terminateSandbox(sandboxId: string): Promise<void> {
  await axios.delete(`${BACKEND_URL}/sandbox/${sandboxId}`);
}
