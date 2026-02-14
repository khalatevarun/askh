import { useState, useEffect } from 'react';
import type { WebContainer } from '@webcontainer/api';
import Tabs from './Tabs';
import CodeEditor from './CodeEditor';
import { Preview } from './Preview';
import FileExplorer from '@/components/FileExplorer/FileExplorer';
import { useAppSelector } from '@/store/hooks';
import { selectSelectedFile } from '@/store/selectors';

interface ContentProps {
  webContainer: WebContainer | null;
  onDownload?: () => void;
}

export default function Content({
  webContainer,
  onDownload,
}: ContentProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const selectedFile = useAppSelector(selectSelectedFile);

  // Switch to code tab when the user selects a file
  useEffect(() => {
    if (selectedFile) {
      setActiveTab('code');
    }
  }, [selectedFile]);

  const showCode = activeTab === 'code';
  const showPreview = activeTab === 'preview';

  return (
    <div className="h-full flex flex-col">
      <Tabs activeTab={activeTab} onTabChange={setActiveTab} onDownload={onDownload} />
      <div className="flex-1 min-h-0 relative">
        <div
          className={`absolute inset-0 flex z-0 ${showCode ? 'visible' : 'invisible pointer-events-none'}`}
          aria-hidden={!showCode}
        >
          <div className="w-64 border-r border-border flex-shrink-0 flex flex-col min-h-0 bg-card">
            <FileExplorer />
          </div>
          <div className="flex-1 min-w-0">
            <CodeEditor />
          </div>
        </div>

        <div
          className={`absolute inset-0 z-10 ${showPreview ? 'visible' : 'invisible pointer-events-none'}`}
          aria-hidden={!showPreview}
        >
          <Preview webContainer={webContainer} isVisible={showPreview} />
        </div>
      </div>
    </div>
  );
}
