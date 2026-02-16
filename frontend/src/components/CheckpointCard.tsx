import { useState } from 'react';
import { MoreVertical, Eye, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import { useAppSelector } from '@/store/hooks';
import { selectCheckpoints } from '@/store/selectors';

const MAX_LABEL_LEN = 45;

function truncate(label: string): string {
  if (label.length <= MAX_LABEL_LEN) return label;
  return label.slice(0, MAX_LABEL_LEN) + '…';
}

interface CheckpointCardProps {
  checkpointId: string;
  onPreview: (id: string) => void;
  onRevert: (id: string) => void;
}

export function CheckpointCard({ checkpointId, onPreview, onRevert }: CheckpointCardProps) {
  const checkpoints = useAppSelector(selectCheckpoints);
  const cp = checkpoints.find((c) => c.id === checkpointId);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);

  if (!cp) return null;

  return (
    <>
      <Card className="group rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-2 p-2 min-w-0">
          <button
            type="button"
            className="flex-1 min-w-0 text-left cursor-pointer"
            onClick={() => onPreview(cp.id)}
          >
            <span className="text-sm font-medium text-foreground block truncate" title={cp.label}>
              {truncate(cp.label)}
            </span>
            <span className="text-xs text-muted-foreground">Version {cp.version}</span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Options">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onPreview(cp.id)}>
                <Eye className="h-3.5 w-3.5 mr-2" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowRevertConfirm(true)}>
                <RotateCcw className="h-3.5 w-3.5 mr-2" />
                Revert
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      <AlertDialog open={showRevertConfirm} onOpenChange={setShowRevertConfirm}>
        <AlertDialogContent className="max-w-md">
          <button
            type="button"
            onClick={() => setShowRevertConfirm(false)}
            className="absolute right-4 top-4 rounded-sm p-1 text-white/50 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle>Revert to this checkpoint?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              All chat messages and versions after this checkpoint will be permanently erased.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onRevert(cp.id)}
              className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 hover:text-red-300"
            >
              Revert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
