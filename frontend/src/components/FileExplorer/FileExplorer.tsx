import { useState, useCallback } from 'react';
import { FolderTree } from 'lucide-react';
import FileItem from './FileItem';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectFiles } from '@/store/selectors';
import { setSelectedFile } from '@/store/workspaceSlice';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
}

export default function FileExplorer() {
  const dispatch = useAppDispatch();
  const files = useAppSelector(selectFiles);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(['/']));

  const toggleFolder = (path: string) => {
    const newOpenFolders = new Set(openFolders);
    if (newOpenFolders.has(path)) {
      newOpenFolders.delete(path);
    } else {
      newOpenFolders.add(path);
    }
    setOpenFolders(newOpenFolders);
  };

  const handleFileSelect = useCallback(
    (file: { name: string; content: string; path: string }) => {
      dispatch(setSelectedFile(file));
    },
    [dispatch]
  );

  const renderFileTree = (nodes: FileNode[], path = '') => {
    return nodes.map((node) => {
      const currentPath = `${path}/${node.name}`;
      const isOpen = openFolders.has(currentPath);

      return (
        <div key={currentPath}>
          <FileItem
            name={node.name}
            type={node.type}
            level={currentPath.split('/').length - 1}
            isOpen={isOpen}
            onToggle={() => toggleFolder(currentPath)}
            onSelect={() => node.type === 'file' && node.content && handleFileSelect({
              name: node.name,
              content: node.content,
              path: currentPath
            })}
          />
          {node.type === 'folder' && isOpen && node.children && (
            <div>{renderFileTree(node.children, currentPath)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-primary" />
          Files
        </h2>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="p-2">{renderFileTree(files)}</div>
      </div>
    </div>
  );
}
