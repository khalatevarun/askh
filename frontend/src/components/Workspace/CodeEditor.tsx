import Editor from '@monaco-editor/react';
import { useAppSelector } from '@/store/hooks';
import { selectSelectedFile } from '@/store/selectors';
import { useFileEdit } from '@/hooks/useFileEdit';

interface CodeEditorProps {
  readOnly?: boolean;
}

export default function CodeEditor({ readOnly = false }: CodeEditorProps) {
  const file = useAppSelector(selectSelectedFile);
  const { editFile: onChange } = useFileEdit();

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        Select a file to view its contents
      </div>
    );
  }

  const language = file.name.endsWith('.tsx') || file.name.endsWith('.ts')
    ? 'typescript'
    : file.name.endsWith('.css')
    ? 'css'
    : file.name.endsWith('.json')
    ? 'json'
    : 'javascript';

  return (
    <Editor
      height="100%"
      theme="vs-dark"
      language={language}
      value={file.content}
      onChange={(value) => onChange(value ?? '')}
      onMount={(editor, monaco) => {
        // Suppress semantic diagnostics (e.g. "Cannot find module 'react'"); we have no
        // node_modules in the editor, so rely on the build (WebContainer) for real errors.
        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
          noSemanticValidation: true,
          noSyntaxValidation: true,
        });
        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
          noSemanticValidation: true,
          noSyntaxValidation: true,
        });

        // Add Cmd/Ctrl+S to trigger save (call onChange with current value)
        try {
          const key = monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS;
          editor.addCommand(key, () => {
            onChange(editor.getValue());
          });
        } catch {
          // ignore if monaco keybindings not available
        }
      }}
      options={{
        minimap: { enabled: true },
        fontSize: 14,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        readOnly,
      }}
    />
  );
}
