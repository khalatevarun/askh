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
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectFiles, selectIsBuildingApp } from '../store/selectors';
import {
  setPreviewStatus,
  setPreviewError,
  setPreviewRunning,
  addError,
  clearErrors,
} from '../store/previewSlice';
import {
  startOperation,
  finishOperation,
} from '../store/workspaceSlice';
import { appendErrorItem } from '../store/chatSlice';
import {
  parseDevServerOutput,
  isCompilationSuccess,
  parsePreviewMessage,
  parseInstallResult,
} from '../utility/error-parsing';
import type { AppError } from '../types/errors';

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
  const isLlmChangeRef = useRef(false);
  const prevIsBuildingRef = useRef(isBuildingApp);
  const pendingLlmErrorsRef = useRef<AppError[]>([]);
  const llmErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushLlmErrors = useCallback(() => {
    if (pendingLlmErrorsRef.current.length === 0) return;
    const allErrors = pendingLlmErrorsRef.current.map(e => e.detail).join('\n\n---\n\n');
    pendingLlmErrorsRef.current = [];
    dispatch(appendErrorItem({
      message: 'Errors detected in generated code',
      context: allErrors,
      retryAction: 'fix-compilation',
    }));
    isLlmChangeRef.current = false;
  }, [dispatch]);

  const queueLlmError = useCallback((error: AppError) => {
    if (!pendingLlmErrorsRef.current.some(e => e.id === error.id)) {
      pendingLlmErrorsRef.current.push(error);
    }
    if (llmErrorTimerRef.current) clearTimeout(llmErrorTimerRef.current);
    llmErrorTimerRef.current = setTimeout(() => flushLlmErrors(), 2000);
  }, [flushLlmErrors]);

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

      const installError = parseInstallResult(installExitCode, installOutputRef.current);
      if (installError) {
        dispatch(setPreviewError(installError.detail));
        dispatch(appendErrorItem({
          message: 'Failed to install dependencies.',
          context: installError.detail,
          retryAction: 'fix-compilation',
        }));
        dispatch(finishOperation('preview:start'));
        return;
      }

      dispatch(setPreviewStatus('starting'));
      dispatch(startOperation({ id: 'preview:start', message: 'Starting dev server...' }));
      const devProcess = await runDevServer(webContainer, (data) => {
        const error = parseDevServerOutput(data);
        if (error) {
          dispatch(addError(error));
          if (isLlmChangeRef.current) {
            queueLlmError(error);
          }
        }
        if (isCompilationSuccess(data)) {
          dispatch(clearErrors());
          isLlmChangeRef.current = false;
        }
      });
      processRef.current.dev = devProcess;

      onServerReady(webContainer, (readyUrl) => {
        dispatch(setPreviewRunning(readyUrl));
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webContainer, files, dispatch]);

  // Track when isBuildingApp transitions from true → false (LLM finished generating)
  useEffect(() => {
    if (prevIsBuildingRef.current && !isBuildingApp) {
      isLlmChangeRef.current = true;
    }
    prevIsBuildingRef.current = isBuildingApp;
  }, [isBuildingApp]);

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
        .catch(err => {
          console.error('[PreviewManager] Sync before restart failed:', err);
          dispatch(setPreviewError(err instanceof Error ? err.message : 'File sync failed'));
        });
    } else {
      isLlmChangeRef.current = false; // User is editing files — any future errors are user-caused
      console.log('[PreviewManager] Syncing files...', changed.map(f => f.path));
      syncChangedFiles(webContainer, changed)
        .then(() => {
          prevFilesRef.current = currentFlat;
        })
        .catch(err => {
          console.error('[PreviewManager] Sync failed:', err);
          dispatch(setPreviewError(err instanceof Error ? err.message : 'File sync failed'));
        });
    }
  }, [webContainer, files, isBuildingApp, startPreview, dispatch]);

  // Listen for browser runtime errors from the preview iframe
  useEffect(() => {
    if (!webContainer) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsubscribe = webContainer.on('preview-message', (message: any) => {
      const error = parsePreviewMessage(message);
      if (!error) return;

      dispatch(addError(error));
      if (isLlmChangeRef.current) {
        queueLlmError(error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [webContainer, dispatch, queueLlmError]);

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
