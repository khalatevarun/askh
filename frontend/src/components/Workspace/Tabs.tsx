import { Code2, Eye, FolderDown } from 'lucide-react';
import { Tabs as TabsPrimitive, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAppSelector } from '@/store/hooks';
import { selectHasPreviewError } from '@/store/selectors';

interface TabsProps {
  activeTab: 'code' | 'preview';
  onTabChange: (tab: 'code' | 'preview') => void;
  onDownload?: () => void;
}

export default function Tabs({ activeTab, onTabChange, onDownload }: TabsProps) {
  const hasError = useAppSelector(selectHasPreviewError);

  return (
    <div className="flex items-center border-b border-border bg-card">
      <TabsPrimitive value={activeTab} onValueChange={(v) => onTabChange(v as 'code' | 'preview')}>
        <TabsList className="h-11 w-auto rounded-none border-0 bg-transparent p-1 gap-1">
          <TabsTrigger
            value="code"
            className="rounded-md border-0 data-[state=active]:bg-primary/80 data-[state=active]:text-foreground data-[state=active]:shadow-none gap-2 px-4"
          >
            <Code2 className="h-4 w-4" />
            Code
          </TabsTrigger>
          <TabsTrigger
            value="preview"
            className="rounded-md border-0 data-[state=active]:bg-primary/80 data-[state=active]:text-foreground data-[state=active]:shadow-none gap-2 px-4"
          >
            <Eye className="h-4 w-4" />
            <span className="inline-flex items-center gap-1.5">
              Preview
              {hasError && (
                <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
              )}
            </span>
          </TabsTrigger>
        </TabsList>
      </TabsPrimitive>
      {onDownload && (
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto mr-2 hover:bg-accent group"
          onClick={onDownload}
          title="Export project"
        >
          <FolderDown className="h-5 w-5 text-white group-hover:text-white/90" />
        </Button>
      )}
    </div>
  );
}
