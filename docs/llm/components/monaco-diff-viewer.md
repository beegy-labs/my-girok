# MonacoDiffViewer Component

> **Location**: `apps/web-admin/src/components/MonacoDiffViewer.tsx`
> **Package**: @monaco-editor/react, monaco-editor
> **Used In**: Authorization model version comparison

## Overview

MonacoDiffViewer is a React component that provides a side-by-side diff viewer for authorization models using Monaco Editor (VS Code's editor engine). It features custom syntax highlighting for authz-dsl language and seamless integration with the app's theme system (light/dark mode). This component is essential for reviewing changes between model versions before activation.

## Component API

### Props

| Prop         | Type     | Required | Default      | Description                            |
| ------------ | -------- | -------- | ------------ | -------------------------------------- |
| `oldContent` | `string` | Yes      | -            | Previous version content (left side)   |
| `newContent` | `string` | Yes      | -            | Current version content (right side)   |
| `oldLabel`   | `string` | No       | `'Previous'` | Label for the left side (old content)  |
| `newLabel`   | `string` | No       | `'Current'`  | Label for the right side (new content) |
| `height`     | `string` | No       | `'500px'`    | Diff viewer height (CSS value)         |

### Basic Usage

```typescript
import { MonacoDiffViewer } from '../components/MonacoDiffViewer';

function VersionComparison() {
  const oldModel = `type user

type resource
  relations
    define viewer: [user]`;

  const newModel = `type user

type resource
  relations
    define viewer: [user]
    define editor: [user]`;

  return (
    <MonacoDiffViewer
      oldContent={oldModel}
      newContent={newModel}
      height="600px"
    />
  );
}
```

### With Custom Labels

```typescript
import { MonacoDiffViewer } from '../components/MonacoDiffViewer';

function ModelVersionDiff({ oldVersion, newVersion }: Props) {
  return (
    <MonacoDiffViewer
      oldContent={oldVersion.content}
      newContent={newVersion.content}
      oldLabel={`v${oldVersion.version}`}
      newLabel={`v${newVersion.version}`}
      height="700px"
    />
  );
}
```

### In Authorization Tab

```typescript
import { MonacoDiffViewer } from '../components/MonacoDiffViewer';
import { Card } from '../components/atoms/Card';

function PoliciesTab() {
  const [showDiff, setShowDiff] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<AuthorizationModel | null>(null);
  const [activeModel, setActiveModel] = useState<AuthorizationModel | null>(null);

  return (
    <>
      {showDiff && selectedVersion && activeModel && (
        <Card>
          <div className="p-4 border-b">
            <h3>Compare Versions</h3>
            <p>
              Comparing v{selectedVersion.version} with active model v{activeModel.version}
            </p>
          </div>
          <MonacoDiffViewer
            oldContent={selectedVersion.content}
            newContent={activeModel.content}
            oldLabel={`v${selectedVersion.version}`}
            newLabel={`v${activeModel.version} (Active)`}
            height="600px"
          />
        </Card>
      )}
    </>
  );
}
```

## Features

### Side-by-Side Diff

The component provides:

- **Left pane**: Original/old content
- **Right pane**: Modified/new content
- **Inline changes**: Line-by-line highlighting
- **Synchronized scrolling**: Both panes scroll together
- **Change indicators**: Added, removed, and modified lines are color-coded

### Syntax Highlighting

Custom authz-dsl language support with tokens:

- **Keywords**: `type`, `relation`, `permission`, `define` (bold, red)
- **Type Names**: Capitalized identifiers (blue)
- **Relations**: Lowercase identifiers after `define` (purple)
- **Operators**: `and`, `or`, `not`, `but`, `from` (orange)
- **Delimiters**: `[`, `]`, `:`, `#` (gray)
- **Comments**: Lines starting with `#` (green, italic)

### Theme Integration

Automatic theme switching based on app theme:

```typescript
const { resolvedTheme } = useTheme();
const theme = resolvedTheme === 'dark' ? 'authz-dsl-dark' : 'authz-dsl-light';
```

**Light Theme (`authz-dsl-light`)**:

- Base: VS Code light theme
- Keywords: #D73A49 (red)
- Types: #005CC5 (blue)
- Relations: #6F42C1 (purple)
- Comments: #22863A (green)
- Background: #FFFFFF

**Dark Theme (`authz-dsl-dark`)**:

- Base: VS Code dark theme
- Keywords: #F97583 (light red)
- Types: #79B8FF (light blue)
- Relations: #B392F0 (light purple)
- Comments: #6A737D (gray)
- Background: #1E1E1E

### Read-Only Mode

The diff viewer is always read-only:

- Users cannot edit content in the diff view
- Focus is on reviewing changes only
- Edit functionality is in the main editor (MonacoAuthDSLEditor)

### Performance Optimizations

- **Minimap disabled**: Saves rendering time for large files
- **Language registration**: Only registers once (checked before registration)
- **Efficient diffing**: Monaco's built-in diff algorithm
- **Lazy rendering**: Only visible lines are rendered

## Monaco Language Configuration

### Token Provider

```typescript
monaco.languages.setMonarchTokensProvider('authz-dsl', {
  tokenizer: {
    root: [
      [/#.*$/, 'comment'], // Comments
      [/\b(type|relation|permission|define)\b/, 'keyword'], // Keywords
      [/\b[A-Z][a-zA-Z0-9_]*\b/, 'type'], // Type names
      [/\b(and|or|not|but|from)\b/, 'keyword.operator'], // Operators
      [/\b[a-z_][a-zA-Z0-9_]*\b/, 'identifier'], // Identifiers
      [/[[\]:,#]/, 'delimiter'], // Delimiters
    ],
  },
});
```

### Theme Definitions

Themes are defined using Monaco's `defineTheme` API with token color rules matching the syntax highlighting strategy.

## Diff Viewer Options

```typescript
options={{
  readOnly: true,              // No editing allowed
  renderSideBySide: true,      // Side-by-side view (not inline)
  minimap: { enabled: false }, // Disable minimap for cleaner UI
}}
```

### Additional Monaco Options (Available)

While not currently used, these options can be added:

- `originalEditable`: Allow editing of original content
- `modifiedEditable`: Allow editing of modified content
- `renderIndicators`: Show +/- indicators
- `ignoreTrimWhitespace`: Ignore whitespace changes
- `renderOverviewRuler`: Show overview ruler on right
- `scrollBeyondLastLine`: Allow scrolling past last line

## UI Layout

```
┌─────────────────────────────────────────────────┐
│  Previous        │        Current               │
├─────────────────────────────────────────────────┤
│                  │                              │
│  type user       │  type user                   │
│                  │                              │
│  type resource   │  type resource               │
│    relations     │    relations                 │
│      define      │      define viewer: [user]   │
│      viewer:     │      define editor: [user]   │ <- Added line (green)
│      [user]      │                              │
│                  │                              │
└─────────────────────────────────────────────────┘
```

### Header Section

```typescript
<div className="grid grid-cols-2 bg-theme-background-secondary">
  <div>{oldLabel}</div>
  <div>{newLabel}</div>
</div>
```

- Two-column layout for labels
- Theme-aware background color
- Clear visual separation

## Integration with Theme System

The component uses the `useTheme()` hook from `ThemeContext`:

```typescript
import { useTheme } from '../contexts/ThemeContext';

const { resolvedTheme } = useTheme(); // 'light' or 'dark'
```

This ensures:

- Automatic theme switching when user changes app theme
- Consistent colors with the rest of the application
- No theme flicker on load

## Related Components

- **MonacoAuthDSLEditor**: Main editor for writing authz policies
- **ModelDiff**: Simple text-based diff viewer (alternative)
- **PoliciesTab**: Contains diff viewer toggle
- **Card**: Wrapper component for visual consistency

## Comparison: MonacoDiffViewer vs ModelDiff

| Feature             | MonacoDiffViewer      | ModelDiff           |
| ------------------- | --------------------- | ------------------- |
| UI Style            | Side-by-side panels   | Unified inline view |
| Syntax Highlighting | Full Monaco support   | Basic color coding  |
| Diff Algorithm      | Monaco (robust)       | Simple line compare |
| Performance         | Heavy (Monaco bundle) | Lightweight         |
| Use Case            | Detailed code review  | Quick glance        |
| Mobile Support      | Better (side-by-side) | Good                |

## Example: Diff Mode Toggle

```typescript
function PoliciesTab() {
  const [diffMode, setDiffMode] = useState<'simple' | 'monaco'>('simple');

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setDiffMode('simple')}
          className={diffMode === 'simple' ? 'active' : ''}
        >
          Simple
        </button>
        <button
          onClick={() => setDiffMode('monaco')}
          className={diffMode === 'monaco' ? 'active' : ''}
        >
          Side-by-Side
        </button>
      </div>

      {diffMode === 'simple' ? (
        <ModelDiff oldContent={old} newContent={current} />
      ) : (
        <MonacoDiffViewer oldContent={old} newContent={current} height="600px" />
      )}
    </>
  );
}
```

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires ES6+ support
- Monaco Editor bundle size: ~2MB (tree-shaken)
- Lazy loading recommended for performance

## Accessibility

- **Keyboard navigation**: Full keyboard support via Monaco
- **Screen readers**: Limited support (Monaco limitation)
- **Focus management**: Proper focus indicators
- **Color contrast**: WCAG AA compliant in both themes
- **Zoom support**: Works with browser zoom

## Testing Considerations

- Test theme switching (light/dark transitions)
- Verify syntax highlighting for all token types
- Check side-by-side scrolling synchronization
- Validate label rendering
- Test with large files (performance)
- Verify read-only mode (no editing)
- Check responsive layout on different screen sizes

## Performance Tips

1. **Lazy load**: Import only when diff view is shown

```typescript
const MonacoDiffViewer = lazy(() => import('../components/MonacoDiffViewer'));
```

2. **Limit height**: Don't use excessively tall editors

```typescript
<MonacoDiffViewer height="600px" />  // Good
<MonacoDiffViewer height="2000px" /> // Bad
```

3. **Memoize content**: Prevent unnecessary re-renders

```typescript
const oldContent = useMemo(() => previousVersion.content, [previousVersion]);
```

## Common Issues

### Issue: Monaco not loading

**Solution**: Ensure @monaco-editor/react is installed

```bash
npm install @monaco-editor/react monaco-editor
```

### Issue: Theme not applying

**Solution**: Check ThemeContext is wrapped around component

```typescript
<ThemeProvider>
  <MonacoDiffViewer ... />
</ThemeProvider>
```

### Issue: Syntax highlighting not working

**Solution**: Verify `handleEditorWillMount` is called before rendering

```typescript
beforeMount = { handleEditorWillMount }; // Critical
```

## Future Enhancements

Potential improvements:

- Export diff as PDF
- Highlight specific line ranges
- Show change statistics (lines added/removed)
- Support for multi-file diffs
- Inline comment annotations
- Custom diff algorithms (word-level, character-level)
