import { useEffect, useRef, useCallback } from 'react';
import type { WebContainer, WebContainerProcess } from '@webcontainer/api';
import { flattenFiles, diffFiles, didPackageJsonChange } from '../utility/file-tree';
import {
  mountFileTree,
  syncChangedFiles,
  runInstall,
  runDevServer,
  onServerReady,
  waitForMount,
} from '../utility/webcontainer-service';
import {
  parseViteError,
  parseNpmError,
  parseRuntimeError,
  isViteSuccess,
  makeDedupKey,
} from '../utility/error-parsing';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectFiles, selectIsBuildingApp } from '../store/selectors';
import {
  setPreviewStatus,
  setPreviewError,
  setPreviewRunning,
} from '../store/previewSlice';
import {
  startOperation,
  finishOperation,
} from '../store/workspaceSlice';
import { setAppError, clearAppError } from '../store/errorSlice';

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
  const isBuildingApp = useAppSelector(selectIsBuildingApp);

  const processRef = useRef<{ install?: WebContainerProcess; dev?: WebContainerProcess }>({});
  const prevFilesRef = useRef<Array<{ path: string; content: string }>>([]);
  const hasStartedOnce = useRef(false);
  const isStartingRef = useRef(false);
  const installOutputRef = useRef('');

  const startPreview = useCallback(async () => {
    if (!webContainer || isStartingRef.current) return;
    isStartingRef.current = true;

    try {
      try {
        processRef.current.install?.kill();
        processRef.current.dev?.kill();
      } catch {
        /* ignore */
      }
      processRef.current = {};

      if (!hasStartedOnce.current) {
        dispatch(setPreviewStatus('mounting'));
        dispatch(startOperation({ id: 'preview:start', message: 'Setting up project...' }));
        await mountFileTree(webContainer, files);

        const mounted = await waitForMount(webContainer);
        if (!mounted) {
          console.warn('[PreviewManager] Mount may not have completed');
        }
      }

      dispatch(setPreviewStatus('installing'));
      dispatch(startOperation({ id: 'preview:start', message: 'Installing dependencies...' }));

      installOutputRef.current = '';
      const installProcess = await runInstall(webContainer, (data) => {
        installOutputRef.current += data;
      });
      processRef.current.install = installProcess;
      const installExitCode = await installProcess.exit;
      const installErr = parseNpmError(installExitCode, installOutputRef.current);
      if (installErr) {
        dispatch(setPreviewError(installErr.detail));
        dispatch(setAppError({
          id: crypto.randomUUID(),
          source: 'npm-install',
          summary: installErr.summary,
          detail: installErr.detail,
          dedupKey: makeDedupKey('npm-install', installErr.summary),
        }));
        dispatch(finishOperation('preview:start'));
        isStartingRef.current = false;
        return;
      }

      dispatch(setPreviewStatus('starting'));
      dispatch(startOperation({ id: 'preview:start', message: 'Starting dev server...' }));
      const devProcess = await runDevServer(webContainer, (data) => {
        const viteErr = parseViteError(data);
        if (viteErr) {
          dispatch(setAppError({
            id: crypto.randomUUID(),
            source: 'vite-compilation',
            summary: viteErr.summary,
            detail: viteErr.detail,
            filePath: viteErr.filePath,
            dedupKey: makeDedupKey('vite-compilation', viteErr.summary),
          }));
        }
        if (isViteSuccess(data)) {
          dispatch(clearAppError());
        }
      });
      processRef.current.dev = devProcess;

      devProcess.exit.then((code) => {
        if (code !== 0) {
          dispatch(setAppError({
            id: crypto.randomUUID(),
            source: 'dev-server-crash',
            summary: `Dev server exited with code ${code}`,
            detail: `The development server process exited unexpectedly with code ${code}.`,
            dedupKey: makeDedupKey('dev-server-crash', `exit-${code}`),
          }));
        }
      });

      onServerReady(webContainer, (readyUrl) => {
        dispatch(setPreviewRunning(readyUrl));
        dispatch(clearAppError());
        dispatch(finishOperation('preview:start'));
        hasStartedOnce.current = true;
        prevFilesRef.current = flattenFiles(files);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start preview';
      console.error('[PreviewManager]', message);
      dispatch(setPreviewError(message));
      dispatch(finishOperation('preview:start'));
    } finally {
      isStartingRef.current = false;
    }
  }, [webContainer, files, dispatch]);

  useEffect(() => {
    if (!webContainer) return;

    const currentFlat = flattenFiles(files);
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
  }, [webContainer, files, isBuildingApp, startPreview, dispatch]);

  useEffect(() => {
    if (isBuildingApp && !hasStartedOnce.current) {
      dispatch(setPreviewStatus('building'));
    }
  }, [isBuildingApp, dispatch]);

  useEffect(() => {
    if (!webContainer) return;

    const unsubscribe = webContainer.on('preview-message', (message) => {
      if (
        message.type !== 'PREVIEW_UNCAUGHT_EXCEPTION' &&
        message.type !== 'PREVIEW_UNHANDLED_REJECTION'
      )
        return;
      const parsed = parseRuntimeError(
        message.message,
        message.stack
      );
      dispatch(
        setAppError({
          id: crypto.randomUUID(),
          source: 'runtime',
          summary: parsed.summary,
          detail: parsed.detail,
          dedupKey: makeDedupKey('runtime', parsed.summary),
        })
      );
    });

    return unsubscribe;
  }, [webContainer, dispatch]);

  useEffect(() => {
    return () => {
      try {
        processRef.current.install?.kill();
        processRef.current.dev?.kill();
      } catch {
        /* ignore */
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
