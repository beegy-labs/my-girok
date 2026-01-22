# MonacoDiffViewer Component

> **Location**: `apps/web-admin/src/components/MonacoDiffViewer.tsx`

## Overview

Side-by-side diff viewer for authorization models using Monaco Editor with custom authz-dsl syntax highlighting.

## Props

| Prop         | Type     | Required | Default      | Description               |
| ------------ | -------- | -------- | ------------ | ------------------------- |
| `oldContent` | `string` | Yes      | -            | Previous version (left)   |
| `newContent` | `string` | Yes      | -            | Current version (right)   |
| `oldLabel`   | `string` | No       | `'Previous'` | Label for left side       |
| `newLabel`   | `string` | No       | `'Current'`  | Label for right side      |
| `height`     | `string` | No       | `'500px'`    | Viewer height (CSS value) |

## Basic Usage

```typescript
import { MonacoDiffViewer } from '../components/MonacoDiffViewer';

<MonacoDiffViewer
  oldContent={previousModel}
  newContent={currentModel}
  oldLabel={`v${oldVersion}`}
  newLabel={`v${newVersion}`}
  height="600px"
/>
```

## Features

- **Side-by-side diff** with synchronized scrolling
- **Change indicators**: Added, removed, modified lines color-coded
- **Custom syntax highlighting** for authz-dsl
- **Theme integration**: Auto light/dark switching
- **Read-only mode**: Focus on reviewing changes

## Syntax Highlighting

| Token     | Examples                          | Color (Light/Dark) |
| --------- | --------------------------------- | ------------------ |
| Keywords  | `type`, `relation`, `permission`  | Red                |
| Types     | Capitalized identifiers           | Blue               |
| Relations | Lowercase after `define`          | Purple             |
| Operators | `and`, `or`, `not`, `but`, `from` | Orange             |
| Comments  | Lines starting with `#`           | Green              |

## Theme Integration

```typescript
const { resolvedTheme } = useTheme();
const theme = resolvedTheme === 'dark' ? 'authz-dsl-dark' : 'authz-dsl-light';
```

## Monaco Options

```typescript
options={{
  readOnly: true,
  renderSideBySide: true,
  minimap: { enabled: false },
}}
```

## Related Components

- **MonacoAuthDSLEditor**: Main editor for writing policies
- **ModelDiff**: Simple text-based diff (lightweight alternative)

---

_See `monaco-diff-viewer-advanced.md` for advanced usage_
