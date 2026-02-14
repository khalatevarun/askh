import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Content from '@/components/Workspace/Content';
import { CheckpointList } from '@/components/CheckpointList';
import { CollapsibleBuildSteps } from '@/components/CollapsibleBuildSteps';
import { useWebContainer } from '@/hooks/useWebContainer';
import { useBlobStore } from '@/hooks/useBlobStore';
import { handleDownload } from '@/utility/helper';
import { BACKEND_URL } from '@/utility/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Framework } from '@/types';
import { ArrowUp, Sparkles } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectFiles,
  selectSteps,
  selectUserPrompt,
  selectCheckpoints,
  selectIsFollowUpDisabled,
  selectIsEnhancingPrompt,
  selectIsBuildingApp,
} from '@/store/selectors';
import {
  setWorkspaceParams,
  setUserPrompt,
  setCurrentStepId,
  setIsEnhancingPrompt,
  initWorkspace,
  submitFollowUp,
} from '@/store/workspaceSlice';
import { getArtifactTitle, parseXml } from '@/steps';
import { applyStepsToFiles } from '@/utility/file-tree';

const DEFAULT_FRAMEWORK: Framework = { webapp: 'react', service: '' };

export default function Workspace() {
  const location = useLocation();
  const state = location.state as { prompt?: string; framework?: Framework } | undefined;
  const prompt = state?.prompt ?? '';
  const framework = state?.framework ?? DEFAULT_FRAMEWORK;
  const webContainer = useWebContainer();

  const dispatch = useAppDispatch();
  const files = useAppSelector(selectFiles);
  const steps = useAppSelector(selectSteps);
  const userPrompt = useAppSelector(selectUserPrompt);
  const checkpoints = useAppSelector(selectCheckpoints);
  const isFollowUpDisabled = useAppSelector(selectIsFollowUpDisabled);
  const isEnhancing = useAppSelector(selectIsEnhancingPrompt);
  const isBuildingApp = useAppSelector(selectIsBuildingApp);

  const {
    createCheckpoint,
    restoreFromCheckpoint,
    filesAtLastLlmRef,
    updateFilesAtLastLlmRef,
  } = useBlobStore();

  // Init workspace on mount
  useEffect(() => {
    dispatch(setWorkspaceParams({ prompt, framework }));
    dispatch(initWorkspace({ prompt, framework })).then((result) => {
      if (initWorkspace.fulfilled.match(result)) {
        const { uiXml, chatXml, allMessages } = result.payload;
        // Build checkpoint from the final state
        const templateSteps = parseXml(uiXml);
        const { files: filesAfterTemplate } = applyStepsToFiles([], templateSteps);
        const newSteps = parseXml(chatXml);
        const { files: newFiles } = applyStepsToFiles(filesAfterTemplate, newSteps);
        const stepsAfterTemplate = templateSteps.map(s => ({ ...s, status: 'completed' as const }));
        const allSteps = [...stepsAfterTemplate, ...newSteps.map(s => ({ ...s, status: 'completed' as const }))];
        const label = getArtifactTitle(chatXml);
        createCheckpoint(newFiles, allSteps, allMessages, label, 1);
        updateFilesAtLastLlmRef(newFiles);
      }
    });
  }, [prompt, framework]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitFollowUp = useCallback(async () => {
    const result = await dispatch(submitFollowUp({ filesAtLastLlmRef: filesAtLastLlmRef.current }));
    if (submitFollowUp.fulfilled.match(result)) {
      const { xml, allMessages } = result.payload;
      const newSteps = parseXml(xml);
      const { files: newFiles } = applyStepsToFiles(files, newSteps);
      const newStepsWithStatus = newSteps.map(s => ({ ...s, status: 'completed' as const }));
      const allSteps = [...steps, ...newStepsWithStatus];
      const label = getArtifactTitle(xml);
      createCheckpoint(newFiles, allSteps, allMessages, label, checkpoints.length + 1);
      updateFilesAtLastLlmRef(newFiles);
    }
  }, [dispatch, filesAtLastLlmRef, files, steps, checkpoints.length, createCheckpoint, updateFilesAtLastLlmRef]);

  const enhancePrompt = useCallback(async () => {
    const message = userPrompt.trim();
    if (!message) return;
    try {
      dispatch(setIsEnhancingPrompt(true));
      dispatch(setUserPrompt(''));
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
                dispatch(setUserPrompt(enhanced));
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
      dispatch(setIsEnhancingPrompt(false));
    }
  }, [userPrompt, dispatch]);

  return (
    <div className="h-screen flex bg-background text-foreground dark">
      {/* Left Sidebar - Checkpoints + collapsible Build steps */}
      <div className="w-80 border-r border-border bg-card p-4 overflow-y-auto flex flex-col gap-4">
        <CheckpointList onRestore={restoreFromCheckpoint} />
        <CollapsibleBuildSteps
          onStepClick={(id: string) => dispatch(setCurrentStepId(id))}
        />
        <div className="mt-auto flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitFollowUp();
            }}
            className="flex flex-col rounded-xl border border-border bg-muted/30 overflow-hidden focus-within:ring-1 focus-within:ring-ring"
          >
            <Textarea
              value={userPrompt}
              onChange={(e) => dispatch(setUserPrompt(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitFollowUp();
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
                disabled={isEnhancing || isBuildingApp || !userPrompt.trim()}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-xl hover:bg-muted"
                title="Enhance your prompt for better results"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <Button
                type="submit"
                size="icon"
                disabled={isFollowUpDisabled}
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
          webContainer={webContainer}
          onDownload={() => handleDownload(files)}
        />
      </div>
    </div>
  );
}
