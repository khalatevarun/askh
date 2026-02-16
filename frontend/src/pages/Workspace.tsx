import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Content from '@/components/Workspace/Content';
import { ChatTimeline } from '@/components/ChatTimeline';
import { useWebContainer } from '@/hooks/useWebContainer';
import { useCheckpoint } from '@/hooks/useCheckpoint';
import { handleDownload } from '@/utility/helper';
import { BACKEND_URL, readSseStream } from '@/utility/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DEFAULT_FRAMEWORK, type Framework } from '@/types';
import { ArrowUp, Sparkles } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectFiles,
  selectUserPrompt,
  selectCheckpoints,
  selectIsFollowUpDisabled,
  selectIsEnhancingPrompt,
  selectIsBuildingApp,
  selectLlmMessages,
} from '@/store/selectors';
import {
  setWorkspaceParams,
  setUserPrompt,
  setIsEnhancingPrompt,
  initWorkspace,
  submitFollowUp,
} from '@/store/workspaceSlice';
import { appendChatItems, appendUserMessage, clearChat } from '@/store/chatSlice';
import { getArtifactTitle, parseXml } from '@/steps';
import { applyStepsToFiles } from '@/utility/file-tree';
import { getNarrativeFromAssistantContent, stripModificationsBlock } from '@/utility/chat-content';


export default function Workspace() {
  const location = useLocation();
  const state = location.state as { prompt?: string; framework?: Framework } | undefined;
  const prompt = state?.prompt ?? '';
  const framework = state?.framework ?? DEFAULT_FRAMEWORK;
  const webContainer = useWebContainer();

  const dispatch = useAppDispatch();
  const files = useAppSelector(selectFiles);
  const userPrompt = useAppSelector(selectUserPrompt);
  const checkpoints = useAppSelector(selectCheckpoints);
  const isFollowUpDisabled = useAppSelector(selectIsFollowUpDisabled);
  const isEnhancing = useAppSelector(selectIsEnhancingPrompt);
  const isBuildingApp = useAppSelector(selectIsBuildingApp);

  const {
    createCheckpoint,
    restoreFromCheckpoint,
    revertFromCheckpoint,
    filesAtLastLlmRef,
    updateFilesAtLastLlmRef,
  } = useCheckpoint();

  // Init workspace on mount
  useEffect(() => {
    dispatch(setWorkspaceParams({ framework }));
    dispatch(clearChat());
    dispatch(initWorkspace({ prompt, framework })).then((result) => {
      if (initWorkspace.fulfilled.match(result)) {
        const { uiXml, chatXml, allMessages } = result.payload;
        // Build checkpoint from the final state
        const templateSteps = parseXml(uiXml);
        const { files: filesAfterTemplate } = applyStepsToFiles([], templateSteps);
        const newSteps = parseXml(chatXml);
        const { files: newFiles } = applyStepsToFiles(filesAfterTemplate, newSteps);
        const label = getArtifactTitle(chatXml);
        const cp = createCheckpoint(newFiles, allMessages, label, 1);
        const cleanMessages = allMessages.slice(2).map(m =>
          m.role === 'assistant'
            ? { ...m, content: getNarrativeFromAssistantContent(m.content) }
            : { ...m, content: stripModificationsBlock(m.content) }
        );
        dispatch(appendChatItems({ messages: cleanMessages, checkpointId: cp.id }));
        updateFilesAtLastLlmRef(newFiles);
      }
    });
  }, [prompt, framework]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitFollowUp = useCallback(async () => {
    const message = userPrompt.trim();
    if (!message) return;
    dispatch(appendUserMessage(message));
    dispatch(setUserPrompt(''));
    const result = await dispatch(submitFollowUp({ filesAtLastLlmRef: filesAtLastLlmRef.current, userPrompt: message }));
    if (submitFollowUp.fulfilled.match(result)) {
      const { xml, allMessages } = result.payload;
      const newSteps = parseXml(xml);
      const { files: newFiles } = applyStepsToFiles(files, newSteps);
      const label = getArtifactTitle(xml);
      const cp = createCheckpoint(newFiles, allMessages, label, checkpoints.length + 1);
      const prevLen = checkpoints.length === 0 ? 0 : checkpoints[checkpoints.length - 1].llmMessages.length;
      const newMessages = allMessages.slice(prevLen)
        .filter(m => m.role === 'assistant')
        .map(m => ({ ...m, content: getNarrativeFromAssistantContent(m.content) }));
      dispatch(appendChatItems({ messages: newMessages, checkpointId: cp.id }));
      updateFilesAtLastLlmRef(newFiles);
    }
  }, [dispatch, userPrompt, filesAtLastLlmRef, files, checkpoints, createCheckpoint, updateFilesAtLastLlmRef]);

  const llmMessages = useAppSelector(selectLlmMessages);

  const enhancePrompt = useCallback(async () => {
    const message = userPrompt.trim();
    if (!message) return;
    try {
      dispatch(setIsEnhancingPrompt(true));
      dispatch(setUserPrompt(''));
      const context = llmMessages.slice(-4).map((m) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : '',
      }));
      const response = await fetch(`${BACKEND_URL}/enhance-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, framework, context: context.length > 0 ? context : undefined }),
      });
      let enhanced = '';
      await readSseStream(response, (text) => {
        enhanced += text;
        dispatch(setUserPrompt(enhanced));
      });
    } catch (error) {
      console.error('Error enhancing prompt:', error);
    } finally {
      dispatch(setIsEnhancingPrompt(false));
    }
  }, [userPrompt, llmMessages, dispatch]);

  return (
    <div className="h-screen flex bg-background text-foreground dark">
      {/* Left Sidebar - Chat timeline + prompt */}
      <div className="w-96 border-r border-border bg-card p-4 flex flex-col min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ChatTimeline
            initialPrompt={prompt}
            onPreview={restoreFromCheckpoint}
            onRevert={revertFromCheckpoint}
            isWaitingForResponse={isBuildingApp}
          />
        </div>
        <div className="mt-4 flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitFollowUp();
            }}
            className="flex flex-col rounded-2xl border border-white/20 bg-[hsl(var(--hero-via)_/_0.4)] shadow-lg overflow-hidden focus-within:bg-[hsl(var(--hero-via)_/_0.5)] transition-colors"
          >
            <Textarea
              value={userPrompt}
              onChange={(e) => dispatch(setUserPrompt(e.target.value))}
              disabled={isBuildingApp || isEnhancing}
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
      <div className="flex-1 min-w-0">
        <Content
          webContainer={webContainer}
          onDownload={() => handleDownload(files)}
          editorReadOnly={isBuildingApp}
        />
      </div>
    </div>
  );
}
