# Monaco Editor Integration Guide

> VS Code-powered code editor with custom DSL syntax highlighting for authorization policies

## Overview

Monaco Editor is the code editor that powers Visual Studio Code. In this project, it is used for editing authorization policies with custom DSL syntax highlighting, keyboard shortcuts for common operations, and seamless theme integration. The editor component lives at `apps/web-admin/src/components/MonacoAuthDSLEditor.tsx` and depends on `@monaco-editor/react` and `monaco-editor` packages.

## MonacoAuthDSLEditor Component

### Basic Usage

Import and use the component with content state management:

```typescript
import { MonacoAuthDSLEditor } from '../components/MonacoAuthDSLEditor';

function PolicyEditor() {
  const [content, setContent] = useState(initialPolicy);

  return (
    <MonacoAuthDSLEditor
      value={content}
      onChange={setContent}
      height="500px"
      onSave={handleSave}
      onValidate={handleValidate}
    />
  );
}
```

### Props

The component accepts the following props:

- **value** (string, required): The current content of the editor
- **onChange** ((value: string) => void, required): Callback fired when content changes
- **height** (string, default: '500px'): Editor height as a CSS value
- **onSave** (() => void, optional): Callback for Ctrl+S / Cmd+S keyboard shortcut
- **onValidate** (() => void, optional): Callback for Ctrl+Shift+V / Cmd+Shift+V keyboard shortcut
- **readOnly** (boolean, default: false): When true, prevents editing

### Features

#### Custom DSL Syntax Highlighting

The editor provides rich syntax highlighting for the authorization DSL language:

**Declaration Keywords** (bold blue):

- `model`, `schema`

**Structure Keywords** (blue):

- `type`, `relations`, `define`

**Logical Operators** (purple):

- `or`, `and`, `but`, `not`, `from`

**Type Keywords** (teal):

- `user`, `admin`, `operator`, `team`, `service`, `resource`

**Syntax Elements**:

- `:`, `[`, `]`, `|`, `#`

**Comments** (green, italic):

- Lines starting with `#`

**Strings** (red):

- Double-quoted (`"..."`) or single-quoted (`'...'`) strings

#### Theme Integration

The editor automatically switches between light and dark themes based on the current application theme from `useTheme()`. The light theme (`authz-dsl-light`) is based on the VS light theme, while the dark theme (`authz-dsl-dark`) is based on VS Dark. Theme colors are defined within the component using Monaco's theme API.

#### Keyboard Shortcuts

The following keyboard shortcuts are available:

- **Ctrl+S / Cmd+S**: Triggers the `onSave` callback (requires `onSave` prop)
- **Ctrl+Shift+V / Cmd+Shift+V**: Triggers the `onValidate` callback (requires `onValidate` prop)
- **Ctrl+F / Cmd+F**: Opens the built-in find dialog
- **Ctrl+H / Cmd+H**: Opens the built-in find and replace dialog

#### Editor Options

The editor is configured with sensible defaults:

```typescript
{
  minimap: { enabled: false },     // No minimap
  fontSize: 14,                     // Readable font size
  lineNumbers: 'on',                // Show line numbers
  roundedSelection: false,          // Square selections
  scrollBeyondLastLine: false,      // No extra scroll
  readOnly: false,                  // Editable by default
  automaticLayout: true,            // Auto-resize
  tabSize: 2,                       // 2-space tabs
  wordWrap: 'on',                   // Wrap long lines
  formatOnPaste: true,              // Auto-format pasted code
  formatOnType: true,               // Auto-format as you type
}
```

## Implementation Example

### Authorization Policy Editor

A complete example integrating the editor with validation and save functionality:

```typescript
import { useState, useCallback } from 'react';
import { MonacoAuthDSLEditor } from '../components/MonacoAuthDSLEditor';
import { useApiMutation } from '../hooks/useApiMutation';
import { authorizationApi } from '../api/authorization';

function PoliciesTab() {
  const [content, setContent] = useState('');
  const [validationResult, setValidationResult] = useState(null);

  const validateMutation = useApiMutation({
    mutationFn: async () => authorizationApi.validateModel(content),
    onSuccess: (result) => setValidationResult(result),
  });

  const saveMutation = useApiMutation({
    mutationFn: async () => authorizationApi.createModel(content),
    successToast: 'Policy saved successfully!',
  });

  const handleSave = useCallback(() => {
    saveMutation.mutate();
  }, [saveMutation]);

  const handleValidate = useCallback(() => {
    validateMutation.mutate();
  }, [validateMutation]);

  return (
    <div>
      {/* Validation feedback */}
      {validationResult && (
        <div className={validationResult.valid ? 'text-green-600' : 'text-red-600'}>
          {validationResult.valid ? '✓ Valid' : '✗ Invalid'}
          {validationResult.errors?.map(err => <div key={err}>{err}</div>)}
        </div>
      )}

      {/* Editor */}
      <MonacoAuthDSLEditor
        value={content}
        onChange={setContent}
        height="600px"
        onSave={handleSave}
        onValidate={handleValidate}
      />

      {/* Action buttons */}
      <div className="mt-4 flex gap-2">
        <button onClick={handleValidate}>
          Validate (Ctrl+Shift+V)
        </button>
        <button onClick={handleSave} disabled={saveMutation.isLoading}>
          {saveMutation.isLoading ? 'Saving...' : 'Save (Ctrl+S)'}
        </button>
      </div>
    </div>
  );
}
```

## DSL Language Definition

### Monarch Tokenizer

The custom authorization DSL language is registered using Monaco's Monarch tokenization system:

```typescript
monaco.languages.register({ id: 'authz-dsl' });

monaco.languages.setMonarchTokensProvider('authz-dsl', {
  keywords: ['model', 'schema', 'type', 'relations', 'define', 'or', 'and', 'but', 'not', 'from'],
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
    // String states...
  },
});
```

### Theme Colors

**Light Theme (authz-dsl-light)**:

```typescript
{
  base: 'vs',
  rules: [
    { token: 'keyword.control', foreground: '0000FF', fontStyle: 'bold' },
    { token: 'keyword', foreground: '0000FF' },
    { token: 'keyword.operator', foreground: 'AF00DB' },
    { token: 'type', foreground: '267F99' },
    { token: 'comment', foreground: '008000', fontStyle: 'italic' },
    { token: 'string', foreground: 'A31515' },
  ],
}
```

**Dark Theme (authz-dsl-dark)**:

```typescript
{
  base: 'vs-dark',
  rules: [
    { token: 'keyword.control', foreground: '569CD6', fontStyle: 'bold' },
    { token: 'keyword', foreground: '569CD6' },
    { token: 'keyword.operator', foreground: 'C586C0' },
    { token: 'type', foreground: '4EC9B0' },
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
    { token: 'string', foreground: 'CE9178' },
  ],
}
```

## Advanced Usage

### Dynamic Height Based on Content

Automatically adjust editor height based on the number of lines:

```typescript
const [height, setHeight] = useState('500px');

useEffect(() => {
  const lines = content.split('\n').length;
  const calculatedHeight = Math.min(Math.max(lines * 19, 200), 800);
  setHeight(`${calculatedHeight}px`);
}, [content]);

<MonacoAuthDSLEditor height={height} ... />
```

### Read-Only Mode for Viewing

Display policies in read-only mode for review purposes:

```typescript
<MonacoAuthDSLEditor
  value={activeModel.content}
  onChange={() => {}} // No-op
  readOnly={true}
/>
```

### Diff Viewer (Future Enhancement)

Monaco supports diff viewing out of the box for comparing policy versions:

```typescript
import { DiffEditor } from '@monaco-editor/react';

<DiffEditor
  original={oldVersion.content}
  modified={newVersion.content}
  language="authz-dsl"
  theme={theme}
/>
```

## Performance Considerations

Monaco Editor is a powerful but resource-intensive component. Keep these considerations in mind:

**Lazy Loading**: Monaco Editor is automatically code-split by Vite, so it does not impact initial page load time.

**Initialization Time**: The first load takes approximately 500ms while Monaco initializes. Subsequent mounts are nearly instant as the core library is cached.

**Memory Usage**: Each editor instance uses approximately 10MB of memory.

**Best Practices**:

- Avoid mounting multiple editors simultaneously on the same page
- Use tabs or modals to switch between editors rather than rendering all at once
- Unmount editors in hidden tabs to reclaim memory

## Testing

### Component Testing

Mock Monaco Editor for unit tests to avoid loading the full editor:

```typescript
import { render, screen } from '@testing-library/react';
import { MonacoAuthDSLEditor } from './MonacoAuthDSLEditor';

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

test('renders with initial value', () => {
  render(
    <MonacoAuthDSLEditor
      value="model test"
      onChange={vi.fn()}
    />
  );

  expect(screen.getByTestId('monaco-editor')).toHaveValue('model test');
});
```

## Troubleshooting

### Editor Not Loading

Check the browser console for Monaco CDN errors. Verify that `@monaco-editor/react` and `monaco-editor` versions are compatible. Try clearing the browser cache and rebuilding the application.

### Syntax Highlighting Not Working

Ensure the custom language is registered before the editor mounts. Check that the `beforeMount` callback is being called. Inspect Monaco's registered languages using `monaco.languages.getLanguages()` in the console.

### Theme Not Applying

Verify the `useTheme()` hook is available and returns a valid theme. Check that theme names match the registered theme IDs. Ensure themes are defined before the editor mounts.

### Keyboard Shortcuts Not Working

Verify that the `onSave` or `onValidate` props are provided when using those shortcuts. Check for conflicting browser shortcuts that might intercept the key combinations. Use the `onMount` callback to verify that custom actions are properly registered.

## Migration from Textarea

### Before

```typescript
<textarea
  value={content}
  onChange={(e) => setContent(e.target.value)}
  className="w-full h-96 font-mono"
/>
```

### After

```typescript
<MonacoAuthDSLEditor
  value={content}
  onChange={setContent}
  height="384px"
  onSave={handleSave}
/>
```

## Related Documentation

- [Authorization Service](../services/authorization-service.md)
- [Theme System](../packages/design-tokens.md)
- [Monaco Editor Official Documentation](https://microsoft.github.io/monaco-editor/)

---

**LLM Reference**: `docs/llm/guides/monaco-editor.md`
