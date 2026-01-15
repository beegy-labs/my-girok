# MonacoDiffViewer Component

> Side-by-side diff viewer for authorization models with syntax highlighting

## Overview

MonacoDiffViewer is a React component that provides a professional side-by-side comparison view for authorization models. Built on Monaco Editor (the same engine powering VS Code), it offers syntax highlighting for the authorization DSL and seamless integration with the application's light and dark themes. This component is essential for reviewing changes between model versions before activation or rollback.

**Location**: `apps/web-admin/src/components/MonacoDiffViewer.tsx`

## Installation

The component requires the Monaco Editor packages:

```bash
npm install @monaco-editor/react monaco-editor
```

## Component API

| Prop         | Type     | Required | Default      | Description                           |
| ------------ | -------- | -------- | ------------ | ------------------------------------- |
| `oldContent` | `string` | Yes      | -            | Previous version content (left panel) |
| `newContent` | `string` | Yes      | -            | Current version content (right panel) |
| `oldLabel`   | `string` | No       | `'Previous'` | Label displayed above the left panel  |
| `newLabel`   | `string` | No       | `'Current'`  | Label displayed above the right panel |
| `height`     | `string` | No       | `'500px'`    | Viewer height as a CSS value          |

## Basic Usage

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

## Using Custom Labels

Version information can be displayed as labels:

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

## Integration in Authorization Tab

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

## Diff View Features

### Side-by-Side Comparison

The component displays content in two synchronized panels:

- **Left Panel**: Original or previous version content
- **Right Panel**: Modified or current version content
- **Synchronized Scrolling**: Both panels scroll together
- **Change Highlighting**: Added, removed, and modified lines are color-coded

### Visual Layout

```
+------------------------+------------------------+
|       Previous         |        Current         |
+------------------------+------------------------+
|                        |                        |
|  type user             |  type user             |
|                        |                        |
|  type resource         |  type resource         |
|    relations           |    relations           |
|      define viewer:    |      define viewer:    |
|      [user]            |      [user]            |
|                        |      define editor:    | <- Added (green)
|                        |      [user]            |
+------------------------+------------------------+
```

## Syntax Highlighting

The component provides syntax highlighting for the authorization DSL with the following token categories:

| Token Type | Examples                             | Light Theme | Dark Theme   |
| ---------- | ------------------------------------ | ----------- | ------------ |
| Keywords   | `type`, `relation`, `permission`     | Red         | Light Red    |
| Types      | Capitalized identifiers              | Blue        | Light Blue   |
| Relations  | Lowercase identifiers after `define` | Purple      | Light Purple |
| Operators  | `and`, `or`, `not`, `but`, `from`    | Orange      | Orange       |
| Delimiters | `[`, `]`, `:`, `#`                   | Gray        | Gray         |
| Comments   | Lines starting with `#`              | Green       | Gray         |

## Theme Integration

The component automatically switches between light and dark themes based on the application's theme setting:

```typescript
const { resolvedTheme } = useTheme();
const theme = resolvedTheme === 'dark' ? 'authz-dsl-dark' : 'authz-dsl-light';
```

### Light Theme Colors

| Element    | Color  | Hex     |
| ---------- | ------ | ------- |
| Background | White  | #FFFFFF |
| Keywords   | Red    | #D73A49 |
| Types      | Blue   | #005CC5 |
| Relations  | Purple | #6F42C1 |
| Comments   | Green  | #22863A |

### Dark Theme Colors

| Element    | Color        | Hex     |
| ---------- | ------------ | ------- |
| Background | Dark Gray    | #1E1E1E |
| Keywords   | Light Red    | #F97583 |
| Types      | Light Blue   | #79B8FF |
| Relations  | Light Purple | #B392F0 |
| Comments   | Gray         | #6A737D |

## Read-Only Mode

The diff viewer is always read-only:

- Users cannot edit content in either panel
- Focus is on reviewing changes only
- Editing functionality is provided by the MonacoAuthDSLEditor component

## Monaco Configuration

The component uses the following Monaco options:

| Option             | Value      | Purpose                    |
| ------------------ | ---------- | -------------------------- |
| `readOnly`         | `true`     | Prevents editing           |
| `renderSideBySide` | `true`     | Shows panels side by side  |
| `minimap`          | `disabled` | Cleaner UI without minimap |

Additional options available for customization include:

- `originalEditable`: Allow editing in the left panel
- `modifiedEditable`: Allow editing in the right panel
- `renderIndicators`: Show +/- indicators for changes
- `ignoreTrimWhitespace`: Ignore whitespace-only changes
- `renderOverviewRuler`: Show overview ruler on the right
- `scrollBeyondLastLine`: Allow scrolling past the last line

## Performance Optimizations

The component includes several performance considerations:

- **Minimap Disabled**: Reduces rendering overhead for large files
- **Single Language Registration**: Language is registered only once, with a check before registration
- **Monaco's Diff Algorithm**: Uses the built-in efficient diff algorithm
- **Lazy Rendering**: Only visible lines are rendered

### Recommendations

1. **Lazy Load**: Import the component only when the diff view is shown

```typescript
const MonacoDiffViewer = lazy(() => import('../components/MonacoDiffViewer'));
```

2. **Reasonable Height**: Avoid excessively tall editors

```typescript
<MonacoDiffViewer height="600px" />  // Good
<MonacoDiffViewer height="2000px" /> // Avoid
```

3. **Memoize Content**: Prevent unnecessary re-renders

```typescript
const oldContent = useMemo(() => previousVersion.content, [previousVersion]);
```

## Comparison: MonacoDiffViewer vs ModelDiff

| Feature             | MonacoDiffViewer      | ModelDiff           |
| ------------------- | --------------------- | ------------------- |
| UI Style            | Side-by-side panels   | Unified inline view |
| Syntax Highlighting | Full Monaco support   | Basic color coding  |
| Diff Algorithm      | Monaco (robust)       | Simple line compare |
| Performance         | Heavy (Monaco bundle) | Lightweight         |
| Best For            | Detailed code review  | Quick overview      |
| Mobile Support      | Good                  | Good                |

## Accessibility

The component follows accessibility best practices:

- Full keyboard navigation via Monaco
- Proper focus indicators
- WCAG AA compliant color contrast in both themes
- Works with browser zoom

Note: Screen reader support is limited due to Monaco Editor constraints.

## Browser Compatibility

- Modern browsers: Chrome, Firefox, Safari, Edge
- Requires ES6+ support
- Monaco Editor bundle size: approximately 2MB (tree-shaken)
- Lazy loading recommended for performance

## Troubleshooting

### Monaco Not Loading

Ensure the packages are installed:

```bash
npm install @monaco-editor/react monaco-editor
```

### Theme Not Applying

Verify the ThemeContext wraps the component:

```typescript
<ThemeProvider>
  <MonacoDiffViewer ... />
</ThemeProvider>
```

### Syntax Highlighting Not Working

Ensure `handleEditorWillMount` is called before rendering:

```typescript
beforeMount = { handleEditorWillMount }; // This prop is critical
```

## Related Components

| Component           | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| MonacoAuthDSLEditor | Main editor for writing authorization policies |
| ModelDiff           | Simple text-based diff viewer (alternative)    |
| ModelExport         | Export models before comparison                |
| ModelImport         | Import models to compare                       |
| PoliciesTab         | Contains diff viewer toggle                    |

## Future Enhancements

Potential improvements under consideration:

- Export diff as PDF
- Highlight specific line ranges
- Show change statistics (lines added/removed)
- Support for multi-file diffs
- Inline comment annotations
- Custom diff algorithms (word-level, character-level)

---

**LLM Reference**: `docs/llm/components/monaco-diff-viewer.md`
