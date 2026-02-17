import { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector } from '@/store/hooks';
import { selectChatItems } from '@/store/selectors';
import type { ChatItem } from '@/store/chatSlice';
import { CheckpointCard } from '@/components/CheckpointCard';
import { Button } from '@/components/ui/button';
import { fadeSlideUp, fadeIn, staggerContainer } from '@/utility/motion';
import { extractErrorSummary } from '@/utility/error-parsing';

interface ChatTimelineProps {
  initialPrompt?: string;
  onPreview: (id: string) => void;
  onRevert: (id: string) => void;
  isWaitingForResponse?: boolean;
  onRetry?: (action: string, context?: string) => void;
}

function MessageBubble({ item }: { item: ChatItem }) {
  if (item.type === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-xl rounded-br-md bg-primary/90 text-primary-foreground px-3 py-2 text-sm">
          {item.content}
        </div>
      </div>
    );
  }
  if (item.type === 'assistant') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-xl rounded-bl-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground whitespace-pre-wrap break-words">
          {item.content}
        </div>
      </div>
    );
  }
  return null;
}

function ThinkingBubble() {
  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex justify-start"
    >
      <div className="max-w-[85%] rounded-xl rounded-bl-md border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">Working on it…</span>
      </div>
    </motion.div>
  );
}

function ErrorBubble({
  item,
  onRetry,
}: {
  item: Extract<ChatItem, { type: 'error' }>;
  onRetry?: (action: string, context?: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const buttonLabel = item.retryAction === 'fix-compilation' ? 'Ask to fix it' : 'Retry';

  // Split context on separator to get individual errors, extract first-line summaries
  const errorSummaries = item.context
    ? item.context.split('\n\n---\n\n').map(extractErrorSummary)
    : [];

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-xl rounded-bl-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-foreground">{item.message}</p>
            {errorSummaries.length > 0 && (
              <div className="mt-1.5">
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  {expanded ? 'Hide details' : 'Show details'}
                </button>
                {expanded && (
                  <ul className="mt-1 space-y-1 rounded bg-background/50 p-2 text-xs text-muted-foreground list-disc list-inside">
                    {errorSummaries.map((summary, i) => (
                      <li key={i} className="break-words">{summary}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {item.retryAction && onRetry && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 h-7 text-xs border-destructive/30 hover:bg-destructive/10"
                onClick={() => onRetry(item.retryAction!, item.context)}
              >
                {buttonLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChatTimeline({ initialPrompt, onPreview, onRevert, isWaitingForResponse = false, onRetry }: ChatTimelineProps) {
  const items = useAppSelector(selectChatItems);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [items.length, isWaitingForResponse]);

  if (items.length === 0) {
    if (initialPrompt) {
      return (
        <div ref={scrollRef} className="flex flex-col gap-3 py-2 pr-1">
          <motion.div variants={fadeSlideUp} initial="initial" animate="animate">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-xl rounded-br-md bg-primary/90 text-primary-foreground px-3 py-2 text-sm">
                {initialPrompt}
              </div>
            </div>
          </motion.div>
          <AnimatePresence>
            {isWaitingForResponse && <ThinkingBubble />}
          </AnimatePresence>
        </div>
      );
    }
    return (
      <p className="text-sm text-muted-foreground py-4 px-2">
        No messages yet. Submit a prompt to create your first artifact.
      </p>
    );
  }

  return (
    <motion.div
      ref={scrollRef}
      className="flex flex-col gap-3 overflow-y-auto py-2 pr-1"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <AnimatePresence initial={false}>
        {items.map((item, index) => {
          if (item.type === 'checkpoint') {
            return (
              <motion.div
                key={`${item.checkpointId}-${index}`}
                variants={fadeSlideUp}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex justify-start"
              >
                <div className="w-full max-w-[95%]">
                  <CheckpointCard checkpointId={item.checkpointId} onPreview={onPreview} onRevert={onRevert} />
                </div>
              </motion.div>
            );
          }
          if (item.type === 'error') {
            return (
              <motion.div
                key={`error-${index}`}
                variants={fadeSlideUp}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <ErrorBubble item={item} onRetry={onRetry} />
              </motion.div>
            );
          }
          return (
            <motion.div
              key={`${item.type}-${index}`}
              variants={fadeSlideUp}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <MessageBubble item={item} />
            </motion.div>
          );
        })}
      </AnimatePresence>
      <AnimatePresence>
        {isWaitingForResponse && <ThinkingBubble />}
      </AnimatePresence>
    </motion.div>
  );
}
