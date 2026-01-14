/**
 * MonacoDiffViewer Component
 *
 * Side-by-side diff viewer using Monaco Editor with syntax highlighting
 */

import { DiffEditor } from '@monaco-editor/react';
import type { Monaco } from '@monaco-editor/react';
import { useTheme } from '../contexts/ThemeContext';

export interface MonacoDiffViewerProps {
  oldContent: string;
  newContent: string;
  oldLabel?: string;
  newLabel?: string;
  height?: string;
}

export function MonacoDiffViewer({
  oldContent,
  newContent,
  oldLabel = 'Previous',
  newLabel = 'Current',
  height = '500px',
}: MonacoDiffViewerProps) {
  const { resolvedTheme } = useTheme();

  function handleEditorWillMount(monaco: Monaco) {
    // Register authz-dsl language if not already registered
    if (!monaco.languages.getLanguages().some((lang: { id: string }) => lang.id === 'authz-dsl')) {
      monaco.languages.register({ id: 'authz-dsl' });

      // Token provider for syntax highlighting
      monaco.languages.setMonarchTokensProvider('authz-dsl', {
        tokenizer: {
          root: [
            // Comments
            [/#.*$/, 'comment'],

            // Keywords
            [/\b(type|relation|permission|define)\b/, 'keyword'],

            // Operators
            [/[=:]/, 'operator'],
            [/[{}[\]()]/, 'delimiter.bracket'],

            // Type names (capitalized words)
            [/\b[A-Z][a-zA-Z0-9_]*\b/, 'type'],

            // Relation/permission names
            [/\b[a-z][a-zA-Z0-9_]*\b/, 'variable'],

            // Strings
            [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-terminated string
            [/"/, { token: 'string.quote', next: '@string' }],
          ],

          string: [
            [/[^\\"]+/, 'string'],
            [/\\./, 'string.escape.invalid'],
            [/"/, { token: 'string.quote', next: '@pop' }],
          ],
        },
      });

      // Define theme for light mode
      monaco.editor.defineTheme('authz-dsl-light', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6A737D' },
          { token: 'keyword', foreground: 'D73A49', fontStyle: 'bold' },
          { token: 'type', foreground: '005CC5', fontStyle: 'bold' },
          { token: 'variable', foreground: '6F42C1' },
          { token: 'operator', foreground: 'D73A49' },
          { token: 'string', foreground: '032F62' },
        ],
        colors: {
          'editor.background': '#FFFFFF',
        },
      });

      // Define theme for dark mode
      monaco.editor.defineTheme('authz-dsl-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6A737D' },
          { token: 'keyword', foreground: 'F97583', fontStyle: 'bold' },
          { token: 'type', foreground: '79B8FF', fontStyle: 'bold' },
          { token: 'variable', foreground: 'B392F0' },
          { token: 'operator', foreground: 'F97583' },
          { token: 'string', foreground: '9ECBFF' },
        ],
        colors: {
          'editor.background': '#1E1E1E',
        },
      });
    }
  }

  const theme = resolvedTheme === 'dark' ? 'authz-dsl-dark' : 'authz-dsl-light';

  return (
    <div>
      <div className="grid grid-cols-2 bg-theme-background-secondary border-b border-theme-border-default">
        <div className="px-4 py-2 text-sm font-medium text-theme-text-secondary border-r border-theme-border-default">
          {oldLabel}
        </div>
        <div className="px-4 py-2 text-sm font-medium text-theme-text-secondary">{newLabel}</div>
      </div>
      <DiffEditor
        height={height}
        language="authz-dsl"
        theme={theme}
        original={oldContent}
        modified={newContent}
        beforeMount={handleEditorWillMount}
        options={{
          readOnly: true,
          renderSideBySide: true,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
        }}
      />
    </div>
  );
}
