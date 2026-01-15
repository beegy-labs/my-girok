# MonacoAuthDSLEditor Component

> Professional code editor for authorization policies with custom DSL syntax highlighting

## Overview

MonacoAuthDSLEditor is a React component that provides a full-featured code editing experience for authorization policies. Built on Monaco Editor (the same engine that powers VS Code), it offers syntax highlighting for the custom authorization DSL, keyboard shortcuts for common actions, and seamless integration with the application's theme system.

**Location**: `apps/web-admin/src/components/MonacoAuthDSLEditor.tsx`

## Installation

The component requires the Monaco Editor packages:

```bash
npm install @monaco-editor/react monaco-editor
```

## Component API

| Prop         | Type                      | Required | Default   | Description                                          |
| ------------ | ------------------------- | -------- | --------- | ---------------------------------------------------- |
| `value`      | `string`                  | Yes      | -         | The DSL source code to display in the editor         |
| `onChange`   | `(value: string) => void` | Yes      | -         | Callback invoked when the content changes            |
| `height`     | `string`                  | No       | `'500px'` | Editor height as a CSS value                         |
| `onSave`     | `() => void`              | No       | -         | Callback for the Ctrl+S / Cmd+S keyboard shortcut    |
| `onValidate` | `() => void`              | No       | -         | Callback for the Ctrl+Shift+V / Cmd+Shift+V shortcut |
| `readOnly`   | `boolean`                 | No       | `false`   | When true, prevents editing                          |

## Basic Usage

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

## Using Save and Validate Callbacks

The component supports keyboard shortcuts for saving and validating policies:

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
          {validationResult.valid ? 'Valid' : 'Invalid'}
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

## Read-Only Mode

For displaying policies without allowing edits:

```typescript
<MonacoAuthDSLEditor
  value={activeModel.content}
  onChange={() => {}}
  readOnly={true}
/>
```

## Syntax Highlighting

The editor provides comprehensive syntax highlighting for authorization DSL with the following token categories:

### Keywords (Bold, Primary Color)

- `model`, `schema` - Declaration keywords
- `type`, `relations`, `define` - Structure keywords

### Operators (Secondary Color)

- `or`, `and`, `but`, `not`, `from` - Logical operators

### Types (Accent Color)

- `user`, `admin`, `operator`, `team`, `service`, `resource`

### Comments (Muted Color, Italic)

- Lines starting with `#`

### Strings (Status Color)

- Double-quoted: `"example"`
- Single-quoted: `'example'`

## Design System Integration

The component reads all colors from CSS variables defined in `packages/design-tokens/src/tokens.css`, ensuring perfect consistency with the application's theme and automatic synchronization with light/dark mode changes.

### Color Mapping

**Light Theme**:

- Keywords: `--theme-primary` (#6b4a2e)
- Types: `--theme-text-accent` (#8b5e3c)
- Comments: `--theme-text-muted` (#555351)
- Operators: `--theme-text-secondary` (#4a4744)
- Strings: `--theme-status-error-text` (#a31818)

**Dark Theme**:
Colors automatically update based on the `data-theme` attribute, using the same CSS variable names with different values.

## Keyboard Shortcuts

| Shortcut                           | Action           | Requires Prop |
| ---------------------------------- | ---------------- | ------------- |
| **Ctrl+S** / **Cmd+S**             | Save model       | `onSave`      |
| **Ctrl+Shift+V** / **Cmd+Shift+V** | Validate model   | `onValidate`  |
| **Ctrl+F** / **Cmd+F**             | Find             | Built-in      |
| **Ctrl+H** / **Cmd+H**             | Find and replace | Built-in      |
| **Ctrl+Z** / **Cmd+Z**             | Undo             | Built-in      |
| **Ctrl+Shift+Z** / **Cmd+Shift+Z** | Redo             | Built-in      |

## Editor Configuration

The component configures Monaco with settings optimized for policy editing:

| Option               | Value | Purpose                            |
| -------------------- | ----- | ---------------------------------- |
| minimap              | off   | Cleaner UI for focused editing     |
| fontSize             | 14    | Comfortable reading size           |
| lineNumbers          | on    | Easy reference for error messages  |
| scrollBeyondLastLine | off   | No wasted space                    |
| automaticLayout      | on    | Auto-resize when container changes |
| tabSize              | 2     | Compact indentation                |
| wordWrap             | on    | No horizontal scrolling            |
| formatOnPaste        | on    | Clean code from clipboard          |
| formatOnType         | on    | Consistent formatting as you type  |

## Performance Considerations

Monaco Editor is a full-featured code editor, which comes with some performance implications:

- **Lazy Loading**: Monaco is automatically code-split by Vite, so it only loads when needed
- **First Load**: Initial load takes approximately 500ms; subsequent mounts are instant
- **Memory Usage**: Each editor instance uses approximately 10MB of memory

### Recommendations

- Avoid mounting multiple editors simultaneously
- Use tabs or modals to switch between editors rather than showing multiple
- Unmount editors when they are not visible (e.g., in hidden tabs)

## Migration from Textarea

If you are upgrading from a simple textarea to MonacoAuthDSLEditor:

**Before**:

```typescript
<textarea
  value={content}
  onChange={(e) => setContent(e.target.value)}
  className="w-full h-96 font-mono border border-theme-border-default rounded-lg p-4"
/>
```

**After**:

```typescript
<MonacoAuthDSLEditor
  value={content}
  onChange={setContent}
  height="384px"
  onSave={handleSave}
/>
```

### Benefits of Upgrading

- Professional code editor experience
- Syntax highlighting for the authorization DSL
- Line numbers for easy reference
- Built-in find and replace functionality
- Undo/redo history
- Auto-formatting on paste and while typing
- Keyboard shortcuts for save and validate

## Troubleshooting

### Editor Not Loading

If the editor fails to render:

- Check browser console for Monaco CDN errors
- Verify that `@monaco-editor/react` and `monaco-editor` versions are compatible
- Clear browser cache and rebuild the application

### Syntax Highlighting Not Working

If code appears without colors:

- Verify the language is registered before the editor mounts
- Check that the `beforeMount` callback is being called
- Inspect Monaco's registered languages: `monaco.languages.getLanguages()`

### Theme Not Applying

If the editor does not match the application theme:

- Ensure the `useTheme()` hook is available in the component tree
- Verify theme names match registered themes (`authz-dsl-light`, `authz-dsl-dark`)
- Check that CSS variables are defined in the design tokens
- Use browser DevTools to inspect computed CSS variable values

### Keyboard Shortcuts Not Working

If Ctrl+S or Ctrl+Shift+V do not trigger callbacks:

- Verify that `onSave` and `onValidate` props are provided
- Check for conflicting browser shortcuts
- Test in different browsers

## Related Components

| Component        | Purpose                                     |
| ---------------- | ------------------------------------------- |
| MonacoDiffViewer | Side-by-side comparison of model versions   |
| ModelExport      | Export models to JSON or DSL files          |
| ModelImport      | Import models from JSON or DSL files        |
| PoliciesTab      | Main container for authorization management |

## Related Documentation

- [Toast Notifications](../guides/toast-notifications.md) - Toast integration in save/validate
- [Authorization Service](../services/authorization-service.md) - Backend API
- [Theme System](../packages/design-tokens.md) - CSS variables and theme tokens

---

**LLM Reference**: `docs/llm/components/monaco-auth-dsl-editor.md`
