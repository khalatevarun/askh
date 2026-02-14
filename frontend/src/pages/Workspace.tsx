import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Content from '@/components/Workspace/Content';
import { CheckpointList } from '@/components/CheckpointList';
import { CollapsibleBuildSteps } from '@/components/CollapsibleBuildSteps';
import { useWebContainer } from '@/hooks/useWebContainer';
import { useWorkspace } from '@/hooks/useWorkspace';
import { handleDownload } from '@/utility/helper';
import { BACKEND_URL } from '@/utility/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Framework } from '@/types';
import { ArrowUp, Sparkles } from 'lucide-react';

const DEFAULT_FRAMEWORK: Framework = { webapp: 'react', service: '' };

export default function Workspace() {
  const location = useLocation();
  const state = location.state as { prompt?: string; framework?: Framework } | undefined;
  const prompt = state?.prompt ?? '';
  const framework = state?.framework ?? DEFAULT_FRAMEWORK;
  const webContainer = useWebContainer();
  const [isEnhancing, setIsEnhancing] = useState(false);

  const {
    phase,
    files,
    steps,
    checkpoints,
    restoreCheckpoint,
    selectedFile,
    setSelectedFile,
    userPrompt,
    setUserPrompt,
    currentStep,
    setCurrentStep,
    submitFollowUp,
    editFile,
  } = useWorkspace(prompt, framework);

  const enhancePrompt = async () => {
    const message = userPrompt.trim();
    if (!message) return;
    try {
      setIsEnhancing(true);
      setUserPrompt('');
      const response = await fetch(`${BACKEND_URL}/enhance-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');
      const decoder = new TextDecoder();
      let enhanced = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(5);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                enhanced += parsed.text;
                setUserPrompt(enhanced);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Error enhancing prompt:', error);
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="h-screen flex bg-background text-foreground dark">
      {/* Left Sidebar - Checkpoints + collapsible Build steps */}
      <div className="w-80 border-r border-border bg-card p-4 overflow-y-auto flex flex-col gap-4">
        <CheckpointList checkpoints={checkpoints} onRestore={restoreCheckpoint} />
        <CollapsibleBuildSteps
          steps={steps}
          currentStep={currentStep}
          onStepClick={setCurrentStep}
        />
        <div className="mt-auto flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitFollowUp();
            }}
            className="flex flex-col rounded-xl border border-border bg-muted/30 overflow-hidden focus-within:ring-1 focus-within:ring-ring"
          >
            <Textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submitFollowUp();
                }
              }}
              placeholder="Describe what you want to build..."
              rows={3}
              className="min-h-0 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div className="flex items-center justify-between px-2 pb-2 pt-1">
              <button
                type="button"
                onClick={enhancePrompt}
                disabled={isEnhancing || phase === 'building' || !userPrompt.trim()}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-xl hover:bg-muted"
                title="Enhance your prompt for better results"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <Button
                type="submit"
                size="icon"
                disabled={phase === 'building'}
                className="h-9 w-9 rounded-xl shrink-0"
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1">
        <Content
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
          webContainer={webContainer}
          files={files}
          isBuildingApp={phase !== 'ready'}
          onFileChange={editFile}
          onDownload={() => handleDownload(files)}
        />
      </div>
    </div>
  );
}
