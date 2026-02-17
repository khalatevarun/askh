import { AlertTriangle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppSelector } from '../store/hooks';
import { selectCurrentError } from '../store/selectors';
import { clearAppError } from '../store/errorSlice';
import { useAppDispatch } from '../store/hooks';
import { Button } from './ui/button';
import { collapseExpand } from '../utility/motion';

interface ErrorBoxProps {
  onAskToFix: (errorDetail: string) => void;
}

export function ErrorBox({ onAskToFix }: ErrorBoxProps) {
  const dispatch = useAppDispatch();
  const error = useAppSelector(selectCurrentError);

  if (!error) return null;

  const handleDismiss = () => {
    dispatch(clearAppError());
  };

  const handleAskToFix = () => {
    dispatch(clearAppError());
    onAskToFix(error.detail);
  };

  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial="initial"
          animate="animate"
          exit="exit"
          variants={collapseExpand}
          className="mb-4 rounded-xl border border-red-500/25 bg-red-950/25 overflow-hidden"
        >
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500/90 shrink-0" />
              <h3 className="font-medium text-red-100 text-sm leading-tight">
                Error Detected
              </h3>
              <div className="flex-1 min-w-0" />
              <button
                onClick={handleDismiss}
                className="text-red-400/80 hover:text-red-200 transition-colors shrink-0"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-red-200/90 leading-tight">
                {error.summary}
              </p>
              {error.filePath && (
                <p className="text-xs text-red-300/70 font-mono">
                  {error.filePath}
                </p>
              )}
              <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/20">
                <pre className="text-xs text-red-200/80 whitespace-pre-wrap break-all font-mono max-h-24 overflow-y-auto">
                  {error.detail}
                </pre>
              </div>
              <Button
                onClick={handleAskToFix}
                size="sm"
                className="w-fit bg-primary text-primary-foreground hover:opacity-90"
              >
                ASKH to fix it
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
