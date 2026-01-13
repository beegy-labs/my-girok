/**
 * Monaco Editor for Authorization DSL
 *
 * Provides syntax highlighting and editing for authorization policy DSL.
 * Integrates with theme system and supports keyboard shortcuts.
 */

import Editor, { type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useTheme } from '../contexts/ThemeContext';

interface MonacoAuthDSLEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  onSave?: () => void;
  onValidate?: () => void;
  readOnly?: boolean;
}

export function MonacoAuthDSLEditor({
  value,
  onChange,
  height = '500px',
  onSave,
  onValidate,
  readOnly = false,
}: MonacoAuthDSLEditorProps) {
  const { resolvedTheme } = useTheme();

  function handleEditorWillMount(monaco: Monaco) {
    // Register custom language for Authorization DSL
    monaco.languages.register({ id: 'authz-dsl' });

    // Set syntax highlighting rules
    monaco.languages.setMonarchTokensProvider('authz-dsl', {
      keywords: [
        'model',
        'schema',
        'type',
        'relations',
        'define',
        'or',
        'and',
        'but',
        'not',
        'from',
      ],
      typeKeywords: ['user', 'admin', 'operator', 'team', 'service', 'resource'],
      operators: [':', '[', ']', '|', '#'],

      tokenizer: {
        root: [
          [/\b(model|schema)\b/, 'keyword.control'],
          [/\b(type|relations|define)\b/, 'keyword'],
          [/\b(or|and|but|not|from)\b/, 'keyword.operator'],
          [/\b(user|admin|operator|team|service|resource)\b/, 'type'],
          [/#.*$/, 'comment'],
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string_double'],
          [/'/, 'string', '@string_single'],
          [/[a-zA-Z_]\w*/, 'identifier'],
        ],
        string_double: [
          [/[^\\"]+/, 'string'],
          [/"/, 'string', '@pop'],
        ],
        string_single: [
          [/[^\\']+/, 'string'],
          [/'/, 'string', '@pop'],
        ],
      },
    });

    // Set theme colors
    monaco.editor.defineTheme('authz-dsl-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword.control', foreground: '0000FF', fontStyle: 'bold' },
        { token: 'keyword', foreground: '0000FF' },
        { token: 'keyword.operator', foreground: 'AF00DB' },
        { token: 'type', foreground: '267F99' },
        { token: 'comment', foreground: '008000', fontStyle: 'italic' },
        { token: 'string', foreground: 'A31515' },
      ],
      colors: {},
    });

    monaco.editor.defineTheme('authz-dsl-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword.control', foreground: '569CD6', fontStyle: 'bold' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'keyword.operator', foreground: 'C586C0' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'string', foreground: 'CE9178' },
      ],
      colors: {},
    });
  }

  function handleEditorDidMount(editor: editor.IStandaloneCodeEditor, monaco: Monaco) {
    // Save shortcut (Ctrl+S / Cmd+S)
    if (onSave) {
      editor.addAction({
        id: 'save-model',
        label: 'Save Model',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
        run: () => {
          onSave();
        },
      });
    }

    // Validate shortcut (Ctrl+Shift+V / Cmd+Shift+V)
    if (onValidate) {
      editor.addAction({
        id: 'validate-model',
        label: 'Validate Model',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyV],
        run: () => {
          onValidate();
        },
      });
    }
  }

  const theme = resolvedTheme === 'dark' ? 'authz-dsl-dark' : 'authz-dsl-light';

  return (
    <div className="border border-theme-border-default rounded-lg overflow-hidden">
      <Editor
        height={height}
        language="authz-dsl"
        theme={theme}
        value={value}
        onChange={(val) => onChange(val || '')}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          readOnly,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          formatOnPaste: true,
          formatOnType: true,
        }}
      />
    </div>
  );
}
