import { motion, AnimatePresence } from 'framer-motion';
import { useModalSandboxManager } from '../../hooks/useModalSandboxManager';
import { useAppSelector } from '@/store/hooks';
import { selectPreviewState, selectGlobalError } from '@/store/selectors';
import type { PreviewStatus } from '@/store/previewSlice';
import { fadeIn } from '@/utility/motion';

/** Status message map for non-running states. */
const STATUS_DISPLAY: Record<Exclude<PreviewStatus, 'running'>, { title: string; subtitle?: string }> = {
  idle: { title: 'Preview not available', subtitle: 'Click below to start the preview' },
  building: { title: 'Building your app...', subtitle: 'Generating code with AI' },
  'sandbox-warming': { title: 'Sandbox ready...', subtitle: 'Waiting for AI-generated code' },
  mounting: { title: 'Setting up sandbox...', subtitle: 'Syncing code and installing dependencies' },
  installing: { title: 'Installing dependencies...', subtitle: 'Running npm install' },
  starting: { title: 'Starting dev server...', subtitle: 'Waiting for Vite to be ready' },
  error: { title: 'Something went wrong', subtitle: 'Check the console for details' },
};

export function Preview() {
  const { startManually } = useModalSandboxManager();
  const previewState = useAppSelector(selectPreviewState);
  const globalError = useAppSelector(selectGlobalError);

  // Connection/backend error — show message in sync with sidebar (no spinner)
  if (globalError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="mb-2">Something went wrong, please try again.</p>
          <p className="text-sm text-muted-foreground">
            Use the button in the sidebar to try again.
          </p>
        </div>
      </div>
    );
  }

  // Preview is running — show iframe
  if (previewState.status === 'running' && previewState.url) {
    return (
      <div className="w-full h-full">
        <iframe width="100%" height="100%" src={previewState.url} />
      </div>
    );
  }

  // All other states — show status message
  const display = STATUS_DISPLAY[previewState.status as Exclude<PreviewStatus, 'running'>] ?? STATUS_DISPLAY.idle;
  const showSpinner = ['building', 'sandbox-warming', 'mounting', 'installing', 'starting'].includes(previewState.status);
  const showStartButton = previewState.status === 'idle' || previewState.status === 'error';

  return (
    <div className="w-full h-full flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={previewState.status}
          variants={fadeIn}
          initial="initial"
          animate="animate"
          exit="exit"
          className="text-center"
        >
          <p className="mb-2">{previewState.error ?? display.title}</p>
          {display.subtitle && (
            <p className="text-sm text-gray-400 mb-4">{display.subtitle}</p>
          )}
          {showSpinner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"
            />
          )}
          {showStartButton && (
            <button
              onClick={startManually}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {previewState.status === 'error' ? 'Retry' : 'Start Preview'}
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
