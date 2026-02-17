import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { collapseExpand } from '../utility/motion';

interface ConnectionErrorBannerProps {
  onTryAgain: () => void;
}

export function ConnectionErrorBanner({ onTryAgain }: ConnectionErrorBannerProps) {
  return (
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
            Something went wrong, please try again.
          </h3>
        </div>
        <Button
          onClick={onTryAgain}
          size="sm"
          className="w-fit bg-primary text-primary-foreground hover:opacity-90"
        >
          Try again
        </Button>
      </div>
    </motion.div>
  );
}
