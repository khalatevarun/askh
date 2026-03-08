import { useEffect, useRef, useCallback } from 'react';
import { flattenFiles, diffFiles, didPackageJsonChange } from '../utility/file-tree';
import { createSandbox, syncFiles, restartSandbox, terminateSandbox } from '../utility/sandbox-api';
import { BACKEND_URL } from '../utility/api';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectFiles, selectIsBuildingApp, selectFramework } from '../store/selectors';
import {
  setPreviewStatus,
  setPreviewError,
  setPreviewRunning,
} from '../store/previewSlice';
import { startOperation, finishOperation } from '../store/workspaceSlice';
import { setAppError, clearAppError } from '../store/errorSlice';
import { makeDedupKey } from '../utility/error-parsing';

export interface UseModalSandboxManagerReturn {
  startManually: () => void;
}

export function useModalSandboxManager(): UseModalSandboxManagerReturn {
  const dispatch = useAppDispatch();
  const files = useAppSelector(selectFiles);
  const isBuildingApp = useAppSelector(selectIsBuildingApp); // true for 'idle' AND 'building' phases
  const framework = useAppSelector(selectFramework);

  const sandboxIdRef = useRef<string | null>(null);
  const prevFilesRef = useRef<Array<{ path: string; content: string }>>([]);
  const hasStartedOnce = useRef(false);
  const isStartingRef = useRef(false);

  const startPreview = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    const currentFlat = flattenFiles(files);

    try {
      // Terminate any existing sandbox before creating a new one
      if (sandboxIdRef.current) {
        await terminateSandbox(sandboxIdRef.current).catch(() => {});
        sandboxIdRef.current = null;
      }

      // Single status dispatch before the API call — Python service handles
      // file writing, npm install, and dev server start in one round trip.
      dispatch(setPreviewStatus('mounting'));
      dispatch(startOperation({
        id: 'preview:start',
        message: 'Setting up cloud sandbox and installing dependencies...',
      }));

      const { sandboxId, url } = await createSandbox(files, framework.webapp);

      sandboxIdRef.current = sandboxId;
      prevFilesRef.current = currentFlat;
      hasStartedOnce.current = true;

      dispatch(setPreviewRunning(url));
      dispatch(clearAppError());
      dispatch(finishOperation('preview:start'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start sandbox';
      console.error('[ModalSandboxManager]', message);
      dispatch(setPreviewError(message));
      dispatch(setAppError({
        id: crypto.randomUUID(),
        source: 'sandbox-create',
        summary: 'Failed to start sandbox',
        detail: message,
        dedupKey: makeDedupKey('sandbox-create', message),
      }));
      dispatch(finishOperation('preview:start'));
    } finally {
      isStartingRef.current = false;
    }
  }, [files, framework, dispatch]);

  // React to file changes — mirrors the structure of usePreviewManager.ts
  useEffect(() => {
    const currentFlat = flattenFiles(files);
    if (currentFlat.length === 0) return;

    const hasPackageJson = currentFlat.some(f => f.path === '/package.json');

    // First start: isBuildingApp is true for both 'idle' and 'building' phases;
    // only proceed when phase reaches 'ready' (isBuildingApp === false).
    if (!hasStartedOnce.current) {
      if (isBuildingApp) {
        dispatch(setPreviewStatus('building'));
        return;
      }
      if (hasPackageJson && !isStartingRef.current) {
        startPreview();
      }
      return;
    }

    // Subsequent changes: diff and sync
    const changed = diffFiles(prevFilesRef.current, currentFlat);
    if (changed.length === 0) return;

    const sandboxId = sandboxIdRef.current;
    if (!sandboxId) return;

    // Large diff ratio = checkpoint restore or major restructure → full sandbox restart
    const changeRatio = currentFlat.length > 0 ? changed.length / currentFlat.length : 0;
    if (changeRatio > 0.5 && changed.length > 5) {
      startPreview();
      return;
    }

    const packageJsonChanged = didPackageJsonChange(prevFilesRef.current, currentFlat);

    if (packageJsonChanged) {
      // Sync files then reinstall + restart dev server
      restartSandbox(sandboxId, changed)
        .then((result) => {
          prevFilesRef.current = currentFlat;
          if (result.url) {
            dispatch(setPreviewRunning(result.url));
          }
        })
        .catch(err => console.error('[ModalSandboxManager] Restart failed:', err));
    } else {
      // HMR path: write changed files; Vite file watcher picks them up automatically
      syncFiles(sandboxId, changed)
        .then(() => {
          prevFilesRef.current = currentFlat;
        })
        .catch(err => console.error('[ModalSandboxManager] Sync failed:', err));
    }
  }, [files, isBuildingApp, startPreview, dispatch]);

  // Propagate building/idle state to preview slice
  useEffect(() => {
    if (isBuildingApp && !hasStartedOnce.current) {
      dispatch(setPreviewStatus('building'));
    }
  }, [isBuildingApp, dispatch]);

  // Cleanup on unmount — fire-and-forget with keepalive
  useEffect(() => {
    return () => {
      const id = sandboxIdRef.current;
      if (id) {
        // Use fetch with keepalive so the request survives component unmount / navigation
        fetch(`${BACKEND_URL}/sandbox/${id}`, {
          method: 'DELETE',
          keepalive: true,
        }).catch(() => {});
      }
    };
  }, []);

  const startManually = useCallback(() => {
    if (!isStartingRef.current) {
      startPreview();
    }
  }, [startPreview]);

  return { startManually };
}
