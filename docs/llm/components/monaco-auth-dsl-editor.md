# MonacoAuthDSLEditor Component

> **Location**: `apps/web-admin/src/components/MonacoAuthDSLEditor.tsx`
> **Package**: @monaco-editor/react, monaco-editor
> **Used In**: Authorization policy editing

## Overview

MonacoAuthDSLEditor is a React component that wraps the Monaco Editor (VS Code's editor engine) for editing authorization policies with custom DSL syntax highlighting. It integrates seamlessly with the app's theme system using CSS variables from the design tokens package.

## Component API

### Props

| Prop         | Type                      | Required | Default   | Description                                      |
| ------------ | ------------------------- | -------- | --------- | ------------------------------------------------ |
| `value`      | `string`                  | Yes      | -         | Editor content (DSL source code)                 |
| `onChange`   | `(value: string) => void` | Yes      | -         | Callback when content changes                    |
| `height`     | `string`                  | No       | `'500px'` | Editor height (CSS value)                        |
| `onSave`     | `() => void`              | No       | -         | Callback for Ctrl+S / Cmd+S shortcut             |
| `onValidate` | `() => void`              | No       | -         | Callback for Ctrl+Shift+V / Cmd+Shift+V shortcut |
| `readOnly`   | `boolean`                 | No       | `false`   | Enable read-only mode                            |

### Basic Usage

```typescript
import { MonacoAuthDSLEditor } from '../components/MonacoAuthDSLEditor';
import { useState } from 'react';

function PolicyEditor() {
  const [content, setContent] = useState('type user\n\ntype resource\n  relations\n    define viewer: [user]');

  return (
    <MonacoAuthDSLEditor
      value={content}
      onChange={setContent}
      height="600px"
    />
  );
}
```

### With Save and Validate Callbacks

```typescript
import { MonacoAuthDSLEditor } from '../components/MonacoAuthDSLEditor';
import { useApiMutation } from '../hooks/useApiMutation';
import { authorizationApi } from '../api/authorization';

function PoliciesTab() {
  const [content, setContent] = useState('');
  const [validationResult, setValidationResult] = useState(null);

  const saveMutation = useApiMutation({
    mutationFn: async () => authorizationApi.createModel(content),
    successToast: 'Policy saved successfully!',
  });

  const validateMutation = useApiMutation({
    mutationFn: async () => authorizationApi.validateModel(content),
    onSuccess: (result) => setValidationResult(result),
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleValidate = () => {
    validateMutation.mutate();
  };

  return (
    <div>
      {/* Validation feedback */}
      {validationResult && (
        <div className={validationResult.valid ? 'text-green-600' : 'text-red-600'}>
          {validationResult.valid ? '✓ Valid' : '✗ Invalid'}
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

### Read-Only Mode

```typescript
<MonacoAuthDSLEditor
  value={activeModel.content}
  onChange={() => {}} // No-op
  readOnly={true}
/>
```

## Features

### 1. Custom DSL Syntax Highlighting

The editor provides syntax highlighting for authorization DSL with the following token types:

**Keywords (bold, primary color)**:

- `model`, `schema` - Declaration keywords
- `type`, `relations`, `define` - Structure keywords

**Operators (secondary color)**:

- `or`, `and`, `but`, `not`, `from` - Logical operators

**Types (accent color)**:

- `user`, `admin`, `operator`, `team`, `service`, `resource`

**Comments (muted color, italic)**:

- `# comment text`

**Strings (error/success color)**:

- `"double quoted"` or `'single quoted'`

### 2. Design System Integration

**IMPORTANT**: The component reads all colors from CSS variables defined in `packages/design-tokens/src/tokens.css`. This ensures:

- Perfect theme consistency
- Automatic dark/light mode synchronization
- SSOT compliance for all color values

**Color Mapping**:

Light theme:

- Keywords: `--theme-primary` (#6b4a2e)
- Types: `--theme-text-accent` (#8b5e3c)
- Comments: `--theme-text-muted` (#555351)
- Operators: `--theme-text-secondary` (#4a4744)
- Strings: `--theme-status-error-text` (#a31818)

Dark theme:

- Keywords: `--theme-primary` (changes based on data-theme)
- Types: `--theme-text-accent`
- Comments: `--theme-text-muted`
- Operators: `--theme-text-secondary`
- Strings: `--theme-status-success-text`

The `getCSSColorAsHex()` helper function:

- Reads colors from computed styles
- Converts hex (#RRGGBB) to Monaco format (RRGGBB)
- Converts RGB values to hex
- Falls back to black (000000) if color not found

### 3. Theme Switching

The component automatically switches themes based on `useTheme()` hook:

```typescript
const { resolvedTheme } = useTheme();
const theme = resolvedTheme === 'dark' ? 'authz-dsl-dark' : 'authz-dsl-light';
```

Themes are defined in `handleEditorWillMount()` using Monaco's `defineTheme()` API.

### 4. Keyboard Shortcuts

| Shortcut                           | Action             | Prop Required |
| ---------------------------------- | ------------------ | ------------- |
| **Ctrl+S** / **Cmd+S**             | Save model         | `onSave`      |
| **Ctrl+Shift+V** / **Cmd+Shift+V** | Validate model     | `onValidate`  |
| **Ctrl+F** / **Cmd+F**             | Find (built-in)    | -             |
| **Ctrl+H** / **Cmd+H**             | Replace (built-in) | -             |
| **Ctrl+Z** / **Cmd+Z**             | Undo (built-in)    | -             |
| **Ctrl+Shift+Z** / **Cmd+Shift+Z** | Redo (built-in)    | -             |

Keyboard shortcuts are registered in `handleEditorDidMount()` using Monaco's `addAction()` API.

### 5. Editor Options

The component configures Monaco with the following options:

```typescript
{
  minimap: { enabled: false },     // No minimap for cleaner UI
  fontSize: 14,                     // Readable font size
  lineNumbers: 'on',                // Show line numbers
  roundedSelection: false,          // Square selections
  scrollBeyondLastLine: false,      // No extra scroll space
  readOnly: false,                  // Editable by default
  automaticLayout: true,            // Auto-resize on container change
  tabSize: 2,                       // 2-space tabs
  wordWrap: 'on',                   // Wrap long lines
  formatOnPaste: true,              // Auto-format pasted code
  formatOnType: true,               // Auto-format as you type
}
```

## Implementation Details

### Language Registration

The component registers a custom language called `authz-dsl` using Monaco's Monarch system:

```typescript
monaco.languages.register({ id: 'authz-dsl' });

monaco.languages.setMonarchTokensProvider('authz-dsl', {
  keywords: ['model', 'schema', 'type', 'relations', 'define', 'or', 'and', 'but', 'not', 'from'],
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
```

### Token Type Constants

To improve maintainability and avoid magic strings:

```typescript
const TOKEN_KEYWORD_CONTROL = 'keyword.control';
const TOKEN_KEYWORD = 'keyword';
const TOKEN_KEYWORD_OPERATOR = 'keyword.operator';
const TOKEN_TYPE = 'type';
const TOKEN_COMMENT = 'comment';
const TOKEN_STRING = 'string';
const TOKEN_STRING_INVALID = 'string.invalid';
const TOKEN_IDENTIFIER = 'identifier';
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

### Component Tests

See `apps/web-admin/src/components/MonacoAuthDSLEditor.test.tsx` for comprehensive test coverage:

- Component rendering with various props
- Theme integration (light/dark switching)
- onChange callback execution
- Keyboard shortcuts registration
- Design system CSS variable integration
- RGB to hex color conversion
- Multi-line value rendering
- Read-only mode

### Testing Pattern

```typescript
import { render, screen } from '@testing-library/react';
import { MonacoAuthDSLEditor } from './MonacoAuthDSLEditor';

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: vi.fn(({ value, onChange }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )),
}));

test('renders with initial value', () => {
  const mockOnChange = vi.fn();

  render(
    <MonacoAuthDSLEditor
      value="type user"
      onChange={mockOnChange}
    />
  );

  expect(screen.getByTestId('monaco-editor')).toHaveValue('type user');
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
- Verify theme names match registered themes (`authz-dsl-light`, `authz-dsl-dark`)
- Check CSS variables are defined in design tokens
- Use browser DevTools to inspect computed CSS variable values

### Colors not matching design system

- Verify all colors use CSS variables (no hardcoded values)
- Check `getCSSColorAsHex()` is reading correct variables
- Inspect computed styles: `getComputedStyle(document.documentElement).getPropertyValue('--theme-primary')`
- Ensure data-theme attribute is set on root element

### Keyboard shortcuts not working

- Verify `onSave` / `onValidate` props are provided
- Check for conflicting browser shortcuts
- Use `onMount` callback to verify actions are registered
- Test in different browsers

## Migration from Textarea

### Before

```typescript
<textarea
  value={content}
  onChange={(e) => setContent(e.target.value)}
  className="w-full h-96 font-mono border border-theme-border-default rounded-lg p-4"
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

**Benefits**:

- Professional code editor experience
- Syntax highlighting
- Line numbers
- Find/replace
- Undo/redo
- Auto-formatting
- Keyboard shortcuts

## Related Documentation

- [Toast Notifications](../guides/toast-notifications.md) - Toast integration in save/validate
- [Authorization Service](../services/authorization-service.md) - Backend API
- [Theme System](../packages/design-tokens.md) - CSS variables and theme tokens
- [Monaco Editor Guide](../guides/monaco-editor.md) - General Monaco integration guide
- [Monaco Editor Official Docs](https://microsoft.github.io/monaco-editor/) - Monaco API reference

## Example: Full Integration

```typescript
import { useState, useCallback } from 'react';
import { MonacoAuthDSLEditor } from '../components/MonacoAuthDSLEditor';
import { useApiMutation } from '../hooks/useApiMutation';
import { authorizationApi } from '../api/authorization';

export function AuthorizationPolicyEditor() {
  const [content, setContent] = useState('');
  const [validationResult, setValidationResult] = useState(null);

  const validateMutation = useApiMutation({
    mutationFn: async () => authorizationApi.validateModel(content),
    onSuccess: (result) => {
      setValidationResult(result);
      if (result.valid) {
        console.log('Model is valid!');
      } else {
        console.error('Validation errors:', result.errors);
      }
    },
  });

  const saveMutation = useApiMutation({
    mutationFn: async () => authorizationApi.createModel(content, false),
    successToast: (data) => `Model created with ID: ${data.modelId}`,
    onSuccess: (data) => {
      console.log('Model created:', data);
    },
  });

  const handleSave = useCallback(() => {
    if (!content.trim()) {
      alert('Cannot save empty model');
      return;
    }
    saveMutation.mutate();
  }, [content, saveMutation]);

  const handleValidate = useCallback(() => {
    if (!content.trim()) {
      alert('Cannot validate empty model');
      return;
    }
    validateMutation.mutate();
  }, [content, validateMutation]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Authorization Policy Editor</h2>

      {/* Validation feedback */}
      {validationResult && (
        <div
          className={`p-4 rounded-lg ${
            validationResult.valid
              ? 'bg-theme-status-success-bg text-theme-status-success-text'
              : 'bg-theme-status-error-bg text-theme-status-error-text'
          }`}
        >
          {validationResult.valid ? (
            <div>✓ Model is valid</div>
          ) : (
            <div>
              <div>✗ Model has errors:</div>
              <ul className="mt-2 list-disc list-inside">
                {validationResult.errors.map((error, index) => (
                  <li key={index}>
                    {error.message}
                    {error.line && ` (line ${error.line})`}
                  </li>
                ))}
              </ul>
            </div>
          )}
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
      <div className="flex gap-2">
        <button
          onClick={handleValidate}
          disabled={validateMutation.isLoading || !content.trim()}
          className="px-4 py-2 bg-theme-bg-secondary rounded-lg hover:bg-theme-bg-hover"
        >
          {validateMutation.isLoading ? 'Validating...' : 'Validate (Ctrl+Shift+V)'}
        </button>
        <button
          onClick={handleSave}
          disabled={saveMutation.isLoading || !content.trim()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          {saveMutation.isLoading ? 'Saving...' : 'Save (Ctrl+S)'}
        </button>
      </div>

      {/* Help text */}
      <div className="text-sm text-theme-text-secondary">
        <p>Keyboard shortcuts:</p>
        <ul className="mt-1 list-disc list-inside">
          <li>Ctrl+S / Cmd+S - Save model</li>
          <li>Ctrl+Shift+V / Cmd+Shift+V - Validate model</li>
          <li>Ctrl+F / Cmd+F - Find</li>
          <li>Ctrl+H / Cmd+H - Find and replace</li>
        </ul>
      </div>
    </div>
  );
}
```
