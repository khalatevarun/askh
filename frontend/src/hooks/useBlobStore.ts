import { useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { FileItem, Step, Checkpoint } from '../types';
import { flattenFiles } from '../utility/file-tree';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCheckpoints } from '../store/selectors';
import { addCheckpoint } from '../store/checkpointSlice';
import { restoreCheckpoint, setSelectedFile } from '../store/workspaceSlice';

export function useBlobStore() {
  const dispatch = useAppDispatch();
  const checkpoints = useAppSelector(selectCheckpoints);

  const filesAtLastLlmRef = useRef<Array<{ path: string; content: string }> | null>(null);

  const createCheckpoint = useCallback(
    (
      files: FileItem[],
      steps: Step[],
      llmMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
      label: string,
      version: number
    ): Checkpoint => {
      const cp: Checkpoint = {
        id: uuidv4(),
        version,
        label,
        createdAt: Date.now(),
        files,
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
      dispatch(restoreCheckpoint({
        files: cp.files,
        steps: cp.steps,
      }));
      dispatch(setSelectedFile(null));
      filesAtLastLlmRef.current = flattenFiles(cp.files);
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
    updateFilesAtLastLlmRef,
  };
}
