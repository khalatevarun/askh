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

  // New refs for early-init / template pre-warm
  const sandboxUrlRef = useRef<string>('');
  const isCreatingTemplateSandboxRef = useRef(false);
  const templateSandboxCreatedRef = useRef(false);
  const pendingFinalFilesRef = useRef<Array<{ path: string; content: string }> | null>(null);

  // Latest-ref pattern: always points to the current startPreview, solving stale-closure
  // in startTemplateSandbox's error path.
  const startPreviewRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const syncFinalFilesAndShowPreview = useCallback(async (finalFlat: Array<{ path: string; content: string }>) => {
    const sandboxId = sandboxIdRef.current;
    const sandboxUrl = sandboxUrlRef.current;
    if (!sandboxId) return; // guard: returns before dispatching startOperation, so no orphaned operation

    dispatch(setPreviewStatus('mounting'));
    dispatch(startOperation({
      id: 'preview:start',
      message: 'Syncing AI-generated code to sandbox...',
    }));

    const changed = diffFiles(prevFilesRef.current, finalFlat);
    const packageJsonChanged = didPackageJsonChange(prevFilesRef.current, finalFlat);

    try {
      if (packageJsonChanged) {
        // package.json changed: reinstall dependencies and restart dev server
        const result = await restartSandbox(sandboxId, changed);
        prevFilesRef.current = finalFlat;
        dispatch(setPreviewRunning(result.url ?? sandboxUrl));
      } else if (changed.length > 0) {
        // Source files only: HMR sync, Vite picks up changes automatically
        await syncFiles(sandboxId, changed);
        prevFilesRef.current = finalFlat;
        dispatch(setPreviewRunning(sandboxUrl));
      } else {
        // No diff (template already has final content — unlikely but safe)
        prevFilesRef.current = finalFlat;
        dispatch(setPreviewRunning(sandboxUrl));
      }

      hasStartedOnce.current = true;
      dispatch(clearAppError());
      dispatch(finishOperation('preview:start'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync files to sandbox';
      console.error('[ModalSandboxManager] Sync failed:', message);
      dispatch(setPreviewError(message));
      dispatch(setAppError({
        id: crypto.randomUUID(),
        source: 'sandbox-create',
        summary: 'Failed to sync code to sandbox',
        detail: message,
        dedupKey: makeDedupKey('sandbox-create', message),
      }));
      dispatch(finishOperation('preview:start'));
    }
  }, [dispatch]);

  const startTemplateSandbox = useCallback(async () => {
    if (isCreatingTemplateSandboxRef.current || templateSandboxCreatedRef.current) return;
    isCreatingTemplateSandboxRef.current = true;

    try {
      // Terminate any stale sandbox from a previous attempt
      if (sandboxIdRef.current) {
        await terminateSandbox(sandboxIdRef.current).catch(() => {});
        sandboxIdRef.current = null;
      }

      const currentFlat = flattenFiles(files);
      const { sandboxId, url } = await createSandbox(files, framework.webapp);

      sandboxIdRef.current = sandboxId;
      sandboxUrlRef.current = url;
      prevFilesRef.current = currentFlat; // baseline = template files for later diffing

      templateSandboxCreatedRef.current = true;

      // Check if final files arrived while we were creating the sandbox
      const pending = pendingFinalFilesRef.current;
      if (pending) {
        pendingFinalFilesRef.current = null;
        await syncFinalFilesAndShowPreview(pending);
      } else {
        // Sandbox warm, still waiting for AI code
        dispatch(setPreviewStatus('sandbox-warming'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create template sandbox';
      console.error('[ModalSandboxManager] Template sandbox creation failed:', message);
      templateSandboxCreatedRef.current = false;
      sandboxIdRef.current = null;

      // If final files already arrived while we were failing, do a cold start now.
      // Use startPreviewRef.current() — NOT the captured startPreview callback —
      // because by this point files in Redux are the final files and startPreviewRef
      // points to the startPreview that captured those final files.
      const pending = pendingFinalFilesRef.current;
      if (pending) {
        pendingFinalFilesRef.current = null;
        await startPreviewRef.current();
      }
      // If final files haven't arrived yet, the main effect will call startPreview()
      // when isBuildingApp goes false (all guard refs are false/null at that point).
    } finally {
      isCreatingTemplateSandboxRef.current = false;
    }
  }, [files, framework, dispatch, syncFinalFilesAndShowPreview]);
  // Note: startPreview is intentionally NOT in deps — accessed via startPreviewRef instead.

  const startPreview = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    // Reset early-init state so next workspace init starts clean
    templateSandboxCreatedRef.current = false;
    isCreatingTemplateSandboxRef.current = false;
    pendingFinalFilesRef.current = null;

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

  // Keep startPreviewRef up to date on every render
  startPreviewRef.current = startPreview;

  // React to file changes — mirrors the structure of usePreviewManager.ts
  useEffect(() => {
    const currentFlat = flattenFiles(files);
    if (currentFlat.length === 0) return;

    const hasPackageJson = currentFlat.some(f => f.path === '/package.json');

    // ── First-time startup path ─────────────────────────────────────────────
    if (!hasStartedOnce.current) {
      if (isBuildingApp) {
        // Phase is 'building': template files are loaded.
        // Start sandbox pre-creation if we have package.json and haven't started yet.
        if (hasPackageJson && !isCreatingTemplateSandboxRef.current && !templateSandboxCreatedRef.current) {
          startTemplateSandbox();
        } else {
          dispatch(setPreviewStatus('building'));
        }
        return;
      }

      // Phase is 'ready': final files are in Redux.
      if (templateSandboxCreatedRef.current) {
        // Happy path: sandbox was pre-warmed, sync final files to it.
        syncFinalFilesAndShowPreview(currentFlat);
      } else if (isCreatingTemplateSandboxRef.current) {
        // Sandbox creation still in flight; store final files so startTemplateSandbox
        // picks them up and calls syncFinalFilesAndShowPreview when it finishes.
        pendingFinalFilesRef.current = currentFlat;
      } else {
        // No template sandbox (never started, or failed before final files arrived).
        // Fall back to cold start with the final files already in Redux.
        if (hasPackageJson && !isStartingRef.current) {
          startPreview();
        }
      }
      return;
    }

    // ── Follow-up / checkpoint changes (existing logic, unchanged) ──────────
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
  }, [files, isBuildingApp, startPreview, startTemplateSandbox, syncFinalFilesAndShowPreview, dispatch]);

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
