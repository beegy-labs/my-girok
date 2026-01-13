/**
 * Monaco Editor for Authorization DSL
 *
 * Provides syntax highlighting and editing for authorization policy DSL.
 * Integrates with theme system via CSS variables and supports keyboard shortcuts.
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

// Token type constants for maintainability
const TOKEN_KEYWORD_CONTROL = 'keyword.control';
const TOKEN_KEYWORD = 'keyword';
const TOKEN_KEYWORD_OPERATOR = 'keyword.operator';
const TOKEN_TYPE = 'type';
const TOKEN_COMMENT = 'comment';
const TOKEN_STRING = 'string';
const TOKEN_STRING_INVALID = 'string.invalid';
const TOKEN_IDENTIFIER = 'identifier';

/**
 * Get color from CSS variable and convert to Monaco hex format
 */
function getCSSColorAsHex(variableName: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();

  // If it's already a hex color, remove the # and return
  if (value.startsWith('#')) {
    return value.substring(1);
  }

  // If it's RGB, convert to hex
  const rgb = value.match(/\d+/g);
  if (rgb && rgb.length >= 3) {
    const r = parseInt(rgb[0]).toString(16).padStart(2, '0');
    const g = parseInt(rgb[1]).toString(16).padStart(2, '0');
    const b = parseInt(rgb[2]).toString(16).padStart(2, '0');
    return `${r}${g}${b}`;
  }

  // Fallback
  return '000000';
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
          [/\b(model|schema)\b/, TOKEN_KEYWORD_CONTROL],
          [/\b(type|relations|define)\b/, TOKEN_KEYWORD],
          [/\b(or|and|but|not|from)\b/, TOKEN_KEYWORD_OPERATOR],
          [/\b(user|admin|operator|team|service|resource)\b/, TOKEN_TYPE],
          [/#.*$/, TOKEN_COMMENT],
          [/"([^"\\]|\\.)*$/, TOKEN_STRING_INVALID],
          [/'([^'\\]|\\.)*$/, TOKEN_STRING_INVALID],
          [/"/, TOKEN_STRING, '@string_double'],
          [/'/, TOKEN_STRING, '@string_single'],
          [/[a-zA-Z_]\w*/, TOKEN_IDENTIFIER],
        ],
        string_double: [
          [/[^\\"]+/, TOKEN_STRING],
          [/"/, TOKEN_STRING, '@pop'],
        ],
        string_single: [
          [/[^\\']+/, TOKEN_STRING],
          [/'/, TOKEN_STRING, '@pop'],
        ],
      },
    });

    // Read colors from CSS variables (design system integration)
    // Light mode: use primary for keywords, success for types, muted for comments
    const lightPrimary = getCSSColorAsHex('--theme-primary'); // Keywords
    const lightAccent = getCSSColorAsHex('--theme-text-accent'); // Types
    const lightMuted = getCSSColorAsHex('--theme-text-muted'); // Comments
    const lightSecondary = getCSSColorAsHex('--theme-text-secondary'); // Operators
    const lightError = getCSSColorAsHex('--theme-status-error-text'); // Strings

    // Dark mode: use CSS variables from dark theme
    const darkPrimary = getCSSColorAsHex('--theme-primary'); // Will change based on data-theme
    const darkAccent = getCSSColorAsHex('--theme-text-accent');
    const darkMuted = getCSSColorAsHex('--theme-text-muted');
    const darkSecondary = getCSSColorAsHex('--theme-text-secondary');
    const darkSuccess = getCSSColorAsHex('--theme-status-success-text');

    // Define light theme using design system colors
    monaco.editor.defineTheme('authz-dsl-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: TOKEN_KEYWORD_CONTROL, foreground: lightPrimary, fontStyle: 'bold' },
        { token: TOKEN_KEYWORD, foreground: lightPrimary },
        { token: TOKEN_KEYWORD_OPERATOR, foreground: lightSecondary },
        { token: TOKEN_TYPE, foreground: lightAccent },
        { token: TOKEN_COMMENT, foreground: lightMuted, fontStyle: 'italic' },
        { token: TOKEN_STRING, foreground: lightError },
      ],
      colors: {
        'editor.background': '#00000000', // Transparent to inherit from wrapper
      },
    });

    // Define dark theme using design system colors
    monaco.editor.defineTheme('authz-dsl-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: TOKEN_KEYWORD_CONTROL, foreground: darkPrimary, fontStyle: 'bold' },
        { token: TOKEN_KEYWORD, foreground: darkPrimary },
        { token: TOKEN_KEYWORD_OPERATOR, foreground: darkSecondary },
        { token: TOKEN_TYPE, foreground: darkAccent },
        { token: TOKEN_COMMENT, foreground: darkMuted, fontStyle: 'italic' },
        { token: TOKEN_STRING, foreground: darkSuccess },
      ],
      colors: {
        'editor.background': '#00000000', // Transparent to inherit from wrapper
      },
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
