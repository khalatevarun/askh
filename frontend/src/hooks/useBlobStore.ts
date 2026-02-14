import { useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { FileItem, Step, Checkpoint } from '../types';
import {
  flattenFiles,
  contentHash,
  buildFileTreeFromFlatList,
} from '../utility/file-tree';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCheckpoints } from '../store/selectors';
import { addCheckpoint } from '../store/checkpointSlice';
import { restoreCheckpoint, setSelectedFile } from '../store/workspaceSlice';

export function useBlobStore() {
  const dispatch = useAppDispatch();
  const checkpoints = useAppSelector(selectCheckpoints);

  const blobStoreRef = useRef(new Map<string, string>());
  const filesAtLastLlmRef = useRef<Array<{ path: string; content: string }> | null>(null);

  const createCheckpoint = useCallback(
    (
      files: FileItem[],
      steps: Step[],
      llmMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
      label: string,
      version: number
    ): Checkpoint => {
      const flat = flattenFiles(files);
      const tree: Record<string, string> = {};
      const blob = blobStoreRef.current;
      for (const { path, content } of flat) {
        const hash = contentHash(content);
        if (!blob.has(hash)) blob.set(hash, content);
        tree[path] = hash;
      }
      const cp: Checkpoint = {
        id: uuidv4(),
        version,
        label,
        createdAt: Date.now(),
        tree,
        steps: [...steps],
        llmMessages: [...llmMessages],
      };
      dispatch(addCheckpoint(cp));
      return cp;
    },
    [dispatch]
  );

  const restoreFromCheckpoint = useCallback(
    (id: string) => {
      const cp = checkpoints.find(c => c.id === id);
      if (!cp) return;
      const blob = blobStoreRef.current;
      const flat = Object.entries(cp.tree).map(([path, hash]) => {
        const content = blob.get(hash);
        if (content === undefined) throw new Error(`Missing blob for hash ${hash}`);
        return { path, content };
      });
      const files = buildFileTreeFromFlatList(flat);
      dispatch(restoreCheckpoint({
        files,
        steps: cp.steps,
        llmMessages: cp.llmMessages,
      }));
      dispatch(setSelectedFile(null));
      filesAtLastLlmRef.current = flat;
    },
    [checkpoints, dispatch]
  );

  const updateFilesAtLastLlmRef = useCallback(
    (files: FileItem[]) => {
      filesAtLastLlmRef.current = flattenFiles(files);
    },
    []
  );

  return {
    blobStoreRef,
    filesAtLastLlmRef,
    createCheckpoint,
    restoreFromCheckpoint,
    updateFilesAtLastLlmRef,
  };
}
