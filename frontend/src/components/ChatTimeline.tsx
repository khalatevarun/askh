import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector } from '@/store/hooks';
import { selectChatItems } from '@/store/selectors';
import type { ChatItem } from '@/store/chatSlice';
import { CheckpointCard } from '@/components/CheckpointCard';
import { fadeSlideUp, fadeIn, staggerContainer } from '@/utility/motion';

interface ChatTimelineProps {
  initialPrompt?: string;
  onPreview: (id: string) => void;
  onRevert: (id: string) => void;
  isWaitingForResponse?: boolean;
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

export function ChatTimeline({ initialPrompt, onPreview, onRevert, isWaitingForResponse = false }: ChatTimelineProps) {
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
        No messages yet. Submit a prompt to create your first project.
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
