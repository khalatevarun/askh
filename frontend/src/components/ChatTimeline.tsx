import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectChatItems } from '@/store/selectors';
import type { ChatItem } from '@/store/chatSlice';
import { CheckpointCard } from '@/components/CheckpointCard';
import { getNarrativeFromAssistantContent } from '@/utility/chat-content';

interface ChatTimelineProps {
  initialPrompt?: string;
  onRestore: (id: string) => void;
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
    const narrative = getNarrativeFromAssistantContent(item.content);
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-xl rounded-bl-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground whitespace-pre-wrap break-words">
          {narrative}
        </div>
      </div>
    );
  }
  return null;
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-xl rounded-bl-md border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">Working on it…</span>
      </div>
    </div>
  );
}

export function ChatTimeline({ initialPrompt, onRestore, isWaitingForResponse = false }: ChatTimelineProps) {
  const items = useAppSelector(selectChatItems);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [items.length, isWaitingForResponse]);

  if (items.length === 0) {
    if (initialPrompt) {
      return (
        <div ref={scrollRef} className="flex flex-col gap-3 py-2 pr-1">
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-xl rounded-br-md bg-primary/90 text-primary-foreground px-3 py-2 text-sm">
              {initialPrompt}
            </div>
          </div>
          {isWaitingForResponse && <ThinkingBubble />}
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
    <div ref={scrollRef} className="flex flex-col gap-3 overflow-y-auto py-2 pr-1">
      {items.map((item, index) => {
        if (item.type === 'checkpoint') {
          return (
            <div key={`${item.checkpointId}-${index}`} className="flex justify-start">
              <div className="w-full max-w-[95%]">
                <CheckpointCard checkpointId={item.checkpointId} onRestore={onRestore} />
              </div>
            </div>
          );
        }
        return (
          <MessageBubble key={`${item.type}-${index}`} item={item} />
        );
      })}
      {isWaitingForResponse && <ThinkingBubble />}
    </div>
  );
}
