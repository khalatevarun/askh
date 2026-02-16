import { useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { FileItem, Checkpoint } from '../types';
import {
  flattenFiles,
  buildFileTreeFromFlatList,
} from '../utility/file-tree';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCheckpoints } from '../store/selectors';
import { addCheckpoint, revertToCheckpoint as revertCheckpointAction } from '../store/checkpointSlice';
import { truncateChatAfterCheckpoint } from '../store/chatSlice';
import { restoreCheckpoint, setSelectedFile } from '../store/workspaceSlice';

export function useCheckpoint() {
  const dispatch = useAppDispatch();
  const checkpoints = useAppSelector(selectCheckpoints);

  const filesAtLastLlmRef = useRef<Array<{ path: string; content: string }> | null>(null);

  const createCheckpoint = useCallback(
    (
      files: FileItem[],
      llmMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
      label: string,
      version: number
    ): Checkpoint => {
      const flat = flattenFiles(files);
      const tree: Record<string, string> = {};
      for (const { path, content } of flat) {
        tree[path] = content;
      }
      const cp: Checkpoint = {
        id: uuidv4(),
        version,
        label,
        createdAt: Date.now(),
        tree,
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
      const flat = Object.entries(cp.tree).map(([path, content]) => ({
        path,
        content,
      }));
      const files = buildFileTreeFromFlatList(flat);
      dispatch(restoreCheckpoint({
        files,
        llmMessages: cp.llmMessages,
      }));
      dispatch(setSelectedFile(null));
      filesAtLastLlmRef.current = flat;
    },
    [checkpoints, dispatch]
  );

  const revertFromCheckpoint = useCallback(
    (id: string) => {
      const cp = checkpoints.find(c => c.id === id);
      if (!cp) return;
      const flat = Object.entries(cp.tree).map(([path, content]) => ({
        path,
        content,
      }));
      const files = buildFileTreeFromFlatList(flat);
      dispatch(restoreCheckpoint({
        files,
        llmMessages: cp.llmMessages,
      }));
      dispatch(setSelectedFile(null));
      dispatch(revertCheckpointAction(id));
      dispatch(truncateChatAfterCheckpoint(id));
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
    filesAtLastLlmRef,
    createCheckpoint,
    restoreFromCheckpoint,
    revertFromCheckpoint,
    updateFilesAtLastLlmRef,
  };
}
