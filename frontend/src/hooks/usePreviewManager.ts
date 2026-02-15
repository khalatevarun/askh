import { useEffect, useRef, useCallback } from 'react';
import type { WebContainer, WebContainerProcess } from '@webcontainer/api';
import { diffFiles, didPackageJsonChange } from '../utility/file-tree';
import {
  mountFileTree,
  syncChangedFiles,
  runInstall,
  runDevServer,
  onServerReady,
  waitForMount,
} from '../utility/webcontainer-service';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectFiles, selectFlatFiles, selectIsBuildingApp } from '../store/selectors';
import {
  setPreviewStatus,
  setPreviewError,
  setPreviewRunning,
} from '../store/previewSlice';

export interface UsePreviewManagerOptions {
  webContainer: WebContainer | null;
}

export interface UsePreviewManagerReturn {
  startManually: () => void;
}

export function usePreviewManager({
  webContainer,
}: UsePreviewManagerOptions): UsePreviewManagerReturn {
  const dispatch = useAppDispatch();
  const files = useAppSelector(selectFiles);
  const flatFiles = useAppSelector(selectFlatFiles);
  const isBuildingApp = useAppSelector(selectIsBuildingApp);

  const processRef = useRef<{ install?: WebContainerProcess; dev?: WebContainerProcess }>({});
  const prevFilesRef = useRef<Array<{ path: string; content: string }>>([]);
  const hasStartedOnce = useRef(false);
  const isStartingRef = useRef(false);

  const startPreview = useCallback(async () => {
    if (!webContainer || isStartingRef.current) return;
    isStartingRef.current = true;

    try {
      try {
        processRef.current.install?.kill();
        processRef.current.dev?.kill();
      } catch (_e) { /* ignore */ }
      processRef.current = {};

      if (!hasStartedOnce.current) {
        dispatch(setPreviewStatus('mounting'));
        await mountFileTree(webContainer, files);

        const mounted = await waitForMount(webContainer);
        if (!mounted) {
          console.warn('[PreviewManager] Mount may not have completed');
        }
      }

      dispatch(setPreviewStatus('installing'));

      const installProcess = await runInstall(webContainer);
      processRef.current.install = installProcess;
      await installProcess.exit;

      dispatch(setPreviewStatus('starting'));
      const devProcess = await runDevServer(webContainer);
      processRef.current.dev = devProcess;

      onServerReady(webContainer, (readyUrl) => {
        dispatch(setPreviewRunning(readyUrl));
        hasStartedOnce.current = true;
        prevFilesRef.current = flatFiles;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start preview';
      console.error('[PreviewManager]', message);
      dispatch(setPreviewError(message));
    } finally {
      isStartingRef.current = false;
    }
  }, [webContainer, files, flatFiles, dispatch]);

  useEffect(() => {
    if (!webContainer) return;

    const currentFlat = flatFiles;
    const prevFlat = prevFilesRef.current;

    if (currentFlat.length === 0) return;

    const hasPackageJson = currentFlat.some(f => f.path === '/package.json');

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

    const changed = diffFiles(prevFlat, currentFlat);
    if (changed.length === 0) return;

    const packageJsonChanged = didPackageJsonChange(prevFlat, currentFlat);

    if (packageJsonChanged) {
      console.log('[PreviewManager] package.json changed, restarting...');
      syncChangedFiles(webContainer, changed)
        .then(() => startPreview())
        .catch(err => console.error('[PreviewManager] Sync before restart failed:', err));
    } else {
      console.log('[PreviewManager] Syncing files...', changed.map(f => f.path));
      syncChangedFiles(webContainer, changed)
        .then(() => {
          prevFilesRef.current = currentFlat;
        })
        .catch(err => console.error('[PreviewManager] Sync failed:', err));
    }
  }, [webContainer, flatFiles, isBuildingApp, startPreview, dispatch]);

  useEffect(() => {
    if (isBuildingApp && !hasStartedOnce.current) {
      dispatch(setPreviewStatus('building'));
    }
  }, [isBuildingApp, dispatch]);

  useEffect(() => {
    return () => {
      try {
        processRef.current.install?.kill();
        processRef.current.dev?.kill();
      } catch (_e) { /* ignore */ }
    };
  }, []);

  const startManually = useCallback(() => {
    if (!isStartingRef.current) {
      startPreview();
    }
  }, [startPreview]);

  return { startManually };
}
