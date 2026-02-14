import { useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectSelectedFile } from '../store/selectors';
import { editFile } from '../store/workspaceSlice';

export function useFileEdit() {
  const dispatch = useAppDispatch();
  const selectedFile = useAppSelector(selectSelectedFile);
  const pendingSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleEditFile = useCallback(
    (content: string) => {
      if (!selectedFile?.path) return;
      const targetPath = selectedFile.path;

      const existing = pendingSaveTimers.current[targetPath];
      if (existing) clearTimeout(existing);

      pendingSaveTimers.current[targetPath] = setTimeout(() => {
        dispatch(editFile({ path: targetPath, content }));
        delete pendingSaveTimers.current[targetPath];
      }, 500);
    },
    [selectedFile, dispatch]
  );

  return { editFile: handleEditFile };
}
