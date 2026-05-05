import { useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectSelectedFile } from '../store/selectors';
import { editFile } from '../store/workspaceSlice';

export function useFileEdit() {
  const dispatch = useAppDispatch();
  const selectedFile = useAppSelector(selectSelectedFile);
  const selectedFileRef = useRef(selectedFile);
  selectedFileRef.current = selectedFile;
  const pendingSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Stable callback — never recreated. Uses selectedFileRef so it always reads
  // the latest selected file without capturing it as a closure dependency.
  // This prevents Monaco from re-registering its onChange listener on every file
  // click, which was the source of spurious sync API calls.
  const handleEditFile = useCallback(
    (content: string) => {
      const currentFile = selectedFileRef.current;
      if (!currentFile?.path) return;
      const targetPath = currentFile.path;

      const existing = pendingSaveTimers.current[targetPath];
      if (existing) clearTimeout(existing);

      pendingSaveTimers.current[targetPath] = setTimeout(() => {
        dispatch(editFile({ path: targetPath, content }));
        delete pendingSaveTimers.current[targetPath];
      }, 500);
    },
    [dispatch]
  );

  return { editFile: handleEditFile };
}
