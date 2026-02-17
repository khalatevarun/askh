import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react';
import type { WebContainer } from '@webcontainer/api';
import { usePreviewManager } from '../../hooks/usePreviewManager';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectPreviewState, selectPreviewErrors } from '@/store/selectors';
import { clearErrors } from '@/store/previewSlice';
import type { PreviewStatus } from '@/store/previewSlice';
import { fadeIn } from '@/utility/motion';

interface PreviewProps {
  webContainer: WebContainer | null;
  onRequestFix?: (errorContext: string) => void;
}

/** Status message map for non-running states. */
const STATUS_DISPLAY: Record<Exclude<PreviewStatus, 'running'>, { title: string; subtitle?: string }> = {
  idle: { title: 'Preview not available', subtitle: 'Click below to start the preview' },
  building: { title: 'Building your app...', subtitle: 'Generating code with AI' },
  mounting: { title: 'Setting up project...', subtitle: 'Mounting files into the container' },
  installing: { title: 'Installing dependencies...', subtitle: 'Running npm install' },
  starting: { title: 'Starting dev server...', subtitle: 'Waiting for Vite to be ready' },
  error: { title: 'Something went wrong' },
};

export function Preview({ webContainer, onRequestFix }: PreviewProps) {
  const dispatch = useAppDispatch();
  const { startManually } = usePreviewManager({ webContainer });
  const previewState = useAppSelector(selectPreviewState);
  const previewErrors = useAppSelector(selectPreviewErrors);
  const [errorExpanded, setErrorExpanded] = useState(false);
  const hasErrors = previewErrors.length > 0;
  const allErrorsText = previewErrors.map(e => e.detail).join('\n\n---\n\n');

  // Preview is running — show iframe (with optional error banner overlay)
  if (previewState.status === 'running' && previewState.url) {
    return (
      <div className="w-full h-full relative">
        <iframe width="100%" height="100%" src={previewState.url} />
        <AnimatePresence>
          {hasErrors && (
            <motion.div
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute top-0 left-0 right-0 bg-destructive/95 backdrop-blur-sm text-destructive-foreground shadow-lg z-20"
            >
              <div className="flex items-center gap-2 px-3 py-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium flex-1 truncate">
                  {previewErrors.length === 1
                    ? 'Error Detected'
                    : `${previewErrors.length} Errors Detected`}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {onRequestFix && (
                    <button
                      onClick={() => onRequestFix(allErrorsText)}
                      className="text-xs px-2 py-1 rounded bg-destructive-foreground/20 hover:bg-destructive-foreground/30 transition-colors"
                    >
                      Ask to fix it
                    </button>
                  )}
                  <button
                    onClick={() => setErrorExpanded(!errorExpanded)}
                    className="p-1 rounded hover:bg-destructive-foreground/20 transition-colors"
                    title={errorExpanded ? 'Collapse' : 'Expand'}
                  >
                    {errorExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => dispatch(clearErrors())}
                    className="p-1 rounded hover:bg-destructive-foreground/20 transition-colors"
                    title="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {errorExpanded && (
                <ul className="px-3 pb-2 max-h-48 overflow-y-auto space-y-1 list-disc list-inside">
                  {previewErrors.map((err) => (
                    <li key={err.id} className="text-xs opacity-90 break-words">
                      {err.summary}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // All other states — show status message
  const display = STATUS_DISPLAY[previewState.status as Exclude<PreviewStatus, 'running'>] ?? STATUS_DISPLAY.idle;
  const showSpinner = ['building', 'mounting', 'installing', 'starting'].includes(previewState.status);
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
          {previewState.error && (
            <p className="text-sm text-gray-400 mb-4 max-w-md break-words">{previewState.error}</p>
          )}
          {showStartButton && (
            <div className="flex items-center gap-2 justify-center">
              <button
                onClick={startManually}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {previewState.status === 'error' ? 'Retry' : 'Start Preview'}
              </button>
              {previewState.status === 'error' && previewState.error && onRequestFix && (
                <button
                  onClick={() => onRequestFix(previewState.error!)}
                  className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  Ask to fix it
                </button>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
