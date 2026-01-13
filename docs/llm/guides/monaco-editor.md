# Monaco Editor Integration

> **Package**: @monaco-editor/react, monaco-editor
> **Component**: `apps/web-admin/src/components/MonacoAuthDSLEditor.tsx`
> **Used In**: Authorization policies, DSL editing

## Overview

Monaco Editor is the code editor that powers VS Code. We use it for editing authorization policies with custom DSL syntax highlighting, keyboard shortcuts, and theme integration.

## MonacoAuthDSLEditor Component

### Basic Usage

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

| Prop         | Type                      | Required | Default   | Description                          |
| ------------ | ------------------------- | -------- | --------- | ------------------------------------ |
| `value`      | `string`                  | Yes      | -         | Editor content                       |
| `onChange`   | `(value: string) => void` | Yes      | -         | Content change callback              |
| `height`     | `string`                  | No       | `'500px'` | Editor height (CSS value)            |
| `onSave`     | `() => void`              | No       | -         | Called on Ctrl+S / Cmd+S             |
| `onValidate` | `() => void`              | No       | -         | Called on Ctrl+Shift+V / Cmd+Shift+V |
| `readOnly`   | `boolean`                 | No       | `false`   | Enable read-only mode                |

### Features

#### 1. Custom DSL Syntax Highlighting

The editor provides syntax highlighting for authorization DSL:

**Keywords**:

- `model`, `schema` - Declaration keywords (bold blue)
- `type`, `relations`, `define` - Structure keywords (blue)
- `or`, `and`, `but`, `not`, `from` - Logical operators (purple)

**Types**:

- `user`, `admin`, `operator`, `team`, `service`, `resource` (teal)

**Operators**:

- `:`, `[`, `]`, `|`, `#` (syntax elements)

**Comments**:

- `# comment text` (green, italic)

**Strings**:

- `"double quoted"` or `'single quoted'` (red)

#### 2. Theme Integration

Automatically switches between light and dark themes based on `useTheme()`:

```typescript
// Light theme: authz-dsl-light (base: vs)
// Dark theme: authz-dsl-dark (base: vs-dark)
```

Theme colors are defined in the component using Monaco's theme API.

#### 3. Keyboard Shortcuts

| Shortcut                           | Action             | Prop Required |
| ---------------------------------- | ------------------ | ------------- |
| **Ctrl+S** / **Cmd+S**             | Save               | `onSave`      |
| **Ctrl+Shift+V** / **Cmd+Shift+V** | Validate           | `onValidate`  |
| **Ctrl+F** / **Cmd+F**             | Find (built-in)    | -             |
| **Ctrl+H** / **Cmd+H**             | Replace (built-in) | -             |

#### 4. Editor Options

Default configuration:

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

The custom language is registered using Monaco's Monarch system:

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

**Light Theme** (authz-dsl-light):

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

**Dark Theme** (authz-dsl-dark):

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

### Custom Height Based on Content

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

```typescript
<MonacoAuthDSLEditor
  value={activeModel.content}
  onChange={() => {}} // No-op
  readOnly={true}
/>
```

### Diff Viewer (Future Enhancement)

Monaco supports diff viewing out of the box:

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

1. **Lazy Loading**: Monaco Editor is code-split automatically by Vite
2. **Initialization**: First load takes ~500ms, subsequent mounts are instant
3. **Memory**: Each editor instance uses ~10MB of memory
4. **Recommendations**:
   - Don't mount multiple editors simultaneously
   - Use tabs or modals to switch between editors
   - Unmount when not visible (in hidden tabs)

## Testing

### Component Testing

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

### Editor not loading

- Check browser console for Monaco CDN errors
- Verify `@monaco-editor/react` and `monaco-editor` versions match
- Clear browser cache and rebuild

### Syntax highlighting not working

- Verify language is registered before editor mount
- Check `beforeMount` callback is called
- Inspect Monaco's registered languages: `monaco.languages.getLanguages()`

### Theme not applying

- Ensure `useTheme()` hook is available
- Verify theme names match registered themes
- Check theme is defined before editor mount

### Keyboard shortcuts not working

- Verify `onSave` / `onValidate` props are provided
- Check for conflicting browser shortcuts
- Use `onMount` callback to verify actions are registered

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
- [Monaco Editor Official Docs](https://microsoft.github.io/monaco-editor/)
