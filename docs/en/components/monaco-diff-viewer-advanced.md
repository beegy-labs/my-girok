# MonacoDiffViewer - Advanced

This document covers advanced usage, performance optimization, and troubleshooting for the Monaco Diff Viewer component.

## Monaco Language Configuration

### Token Provider

```typescript
monaco.languages.setMonarchTokensProvider('authz-dsl', {
  tokenizer: {
    root: [
      [/#.*$/, 'comment'],
      [/\b(type|relation|permission|define)\b/, 'keyword'],
      [/\b[A-Z][a-zA-Z0-9_]*\b/, 'type'],
      [/\b(and|or|not|but|from)\b/, 'keyword.operator'],
      [/\b[a-z_][a-zA-Z0-9_]*\b/, 'identifier'],
      [/[[\]:,#]/, 'delimiter'],
    ],
  },
});
```

### Theme Definitions

**Light Theme (`authz-dsl-light`)**:

| Token     | Color   | Description |
| --------- | ------- | ----------- |
| Keywords  | #D73A49 | Red         |
| Types     | #005CC5 | Blue        |
| Relations | #6F42C1 | Purple      |
| Comments  | #22863A | Green       |

**Dark Theme (`authz-dsl-dark`)**:

| Token     | Color   | Description  |
| --------- | ------- | ------------ |
| Keywords  | #F97583 | Light red    |
| Types     | #79B8FF | Light blue   |
| Relations | #B392F0 | Light purple |
| Comments  | #6A737D | Gray         |

## Comparison with ModelDiff

| Feature             | MonacoDiffViewer      | ModelDiff           |
| ------------------- | --------------------- | ------------------- |
| UI Style            | Side-by-side panels   | Unified inline view |
| Syntax Highlighting | Full Monaco support   | Basic color coding  |
| Diff Algorithm      | Monaco (robust)       | Simple line compare |
| Performance         | Heavy (Monaco bundle) | Lightweight         |
| Use Case            | Detailed code review  | Quick glance        |

**When to use MonacoDiffViewer**:

- Detailed code review sessions
- When syntax highlighting is important
- When users need to navigate large diffs

**When to use ModelDiff**:

- Quick comparisons
- Performance-critical scenarios
- Simple inline previews

## Performance Tips

### 1. Lazy Load Monaco

```typescript
const MonacoDiffViewer = lazy(() => import('../components/MonacoDiffViewer'));
```

### 2. Limit Height

```typescript
// Good - bounded height
<MonacoDiffViewer height="600px" />

// Bad - excessive height causes performance issues
<MonacoDiffViewer height="2000px" />
```

### 3. Memoize Content

```typescript
const oldContent = useMemo(() => previousVersion.content, [previousVersion]);
const newContent = useMemo(() => currentVersion.content, [currentVersion]);
```

## Troubleshooting

### Monaco Not Loading

```bash
npm install @monaco-editor/react monaco-editor
```

Verify the packages are correctly installed and check for version conflicts.

### Theme Not Applying

Ensure the component is wrapped in a ThemeProvider:

```typescript
<ThemeProvider>
  <MonacoDiffViewer ... />
</ThemeProvider>
```

### Syntax Highlighting Not Working

The `beforeMount` callback is critical for language registration:

```typescript
beforeMount = { handleEditorWillMount }; // Critical - must be called
```

Ensure the callback is provided and executes before the editor mounts.

## Accessibility

| Feature             | Support Level               |
| ------------------- | --------------------------- |
| Keyboard navigation | Full Monaco support         |
| Screen readers      | Limited (Monaco limitation) |
| Color contrast      | WCAG AA compliant           |
| Zoom support        | Works with browser zoom     |

## Browser Compatibility

- **Supported Browsers**: Chrome, Firefox, Safari, Edge (modern versions)
- **Requirements**: ES6+ support
- **Bundle Size**: ~2MB (tree-shaken)

### Performance Considerations

- Monaco Editor is a heavy dependency
- Consider lazy loading for initial page load
- Use code splitting to reduce main bundle size

---

**Related Documentation**:

- [monaco-diff-viewer.md](monaco-diff-viewer.md)
- [monaco-editor.md](monaco-editor.md)

---

_This document is auto-generated from `docs/llm/components/monaco-diff-viewer-advanced.md`_
