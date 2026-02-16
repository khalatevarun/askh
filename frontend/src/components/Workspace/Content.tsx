import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  editorReadOnly?: boolean;
}

export default function Content({
  webContainer,
  onDownload,
  editorReadOnly = false,
}: ContentProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('preview');
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
        <motion.div
          className="absolute inset-0 flex z-0"
          animate={{ opacity: showCode ? 1 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ pointerEvents: showCode ? 'auto' : 'none' }}
          aria-hidden={!showCode}
        >
          <div className="w-64 border-r border-border flex-shrink-0 flex flex-col min-h-0 bg-card">
            <FileExplorer />
          </div>
          <div className="flex-1 min-w-0">
            <CodeEditor readOnly={editorReadOnly} />
          </div>
        </motion.div>

        <motion.div
          className="absolute inset-0 z-10"
          animate={{ opacity: showPreview ? 1 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ pointerEvents: showPreview ? 'auto' : 'none' }}
          aria-hidden={!showPreview}
        >
          <Preview webContainer={webContainer} />
        </motion.div>
      </div>
    </div>
  );
}
