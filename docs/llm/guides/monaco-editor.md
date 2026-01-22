# Monaco Editor Integration

> **Component**: `apps/web-admin/src/components/MonacoAuthDSLEditor.tsx`

## Overview

Monaco Editor for authorization policies with custom DSL syntax highlighting and theme integration.

## Props

| Prop         | Type                      | Required | Default   | Description             |
| ------------ | ------------------------- | -------- | --------- | ----------------------- |
| `value`      | `string`                  | Yes      | -         | Editor content          |
| `onChange`   | `(value: string) => void` | Yes      | -         | Content change callback |
| `height`     | `string`                  | No       | `'500px'` | Editor height           |
| `onSave`     | `() => void`              | No       | -         | Ctrl+S / Cmd+S callback |
| `onValidate` | `() => void`              | No       | -         | Ctrl+Shift+V callback   |
| `readOnly`   | `boolean`                 | No       | `false`   | Enable read-only mode   |

## Basic Usage

```typescript
import { MonacoAuthDSLEditor } from '../components/MonacoAuthDSLEditor';

<MonacoAuthDSLEditor
  value={content}
  onChange={setContent}
  height="500px"
  onSave={handleSave}
  onValidate={handleValidate}
/>
```

## Features

### Syntax Highlighting

| Token     | Examples                            | Color        |
| --------- | ----------------------------------- | ------------ |
| Keywords  | `model`, `schema`, `type`, `define` | Blue         |
| Types     | `user`, `admin`, `team`, `service`  | Teal         |
| Operators | `or`, `and`, `but`, `not`, `from`   | Purple       |
| Comments  | `# comment text`                    | Green italic |
| Strings   | `"double"` or `'single'`            | Red          |

### Keyboard Shortcuts

| Shortcut               | Action   |
| ---------------------- | -------- |
| **Ctrl+S** / **Cmd+S** | Save     |
| **Ctrl+Shift+V**       | Validate |
| **Ctrl+F** / **Cmd+F** | Find     |
| **Ctrl+H** / **Cmd+H** | Replace  |

### Editor Options

```typescript
{
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbers: 'on',
  tabSize: 2,
  wordWrap: 'on',
  formatOnPaste: true,
  automaticLayout: true,
}
```

## Theme Integration

```typescript
// Light theme: authz-dsl-light (base: vs)
// Dark theme: authz-dsl-dark (base: vs-dark)
const { resolvedTheme } = useTheme();
```

## Performance

- Lazy loaded automatically by Vite
- First load: ~500ms, subsequent: instant
- Memory: ~10MB per editor instance
- Recommendation: Don't mount multiple editors simultaneously

## Related

- Advanced: `monaco-editor-advanced.md`
- Diff Viewer: `monaco-diff-viewer.md`
- Authorization: `authorization-service.md`
