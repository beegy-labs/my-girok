# MonacoDiffViewer Advanced

> Advanced usage, performance, and troubleshooting

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

**Light Theme (`authz-dsl-light`):**

- Keywords: #D73A49 (red)
- Types: #005CC5 (blue)
- Relations: #6F42C1 (purple)
- Comments: #22863A (green)

**Dark Theme (`authz-dsl-dark`):**

- Keywords: #F97583 (light red)
- Types: #79B8FF (light blue)
- Relations: #B392F0 (light purple)
- Comments: #6A737D (gray)

## Comparison with ModelDiff

| Feature             | MonacoDiffViewer      | ModelDiff           |
| ------------------- | --------------------- | ------------------- |
| UI Style            | Side-by-side panels   | Unified inline view |
| Syntax Highlighting | Full Monaco support   | Basic color coding  |
| Diff Algorithm      | Monaco (robust)       | Simple line compare |
| Performance         | Heavy (Monaco bundle) | Lightweight         |
| Use Case            | Detailed code review  | Quick glance        |

## Performance Tips

**1. Lazy load Monaco:**

```typescript
const MonacoDiffViewer = lazy(() => import('../components/MonacoDiffViewer'));
```

**2. Limit height:**

```typescript
<MonacoDiffViewer height="600px" />  // Good
<MonacoDiffViewer height="2000px" /> // Bad - performance hit
```

**3. Memoize content:**

```typescript
const oldContent = useMemo(() => previousVersion.content, [previousVersion]);
```

## Troubleshooting

### Monaco not loading

```bash
npm install @monaco-editor/react monaco-editor
```

### Theme not applying

```typescript
<ThemeProvider>
  <MonacoDiffViewer ... />
</ThemeProvider>
```

### Syntax highlighting not working

```typescript
beforeMount = { handleEditorWillMount }; // Critical - must be called
```

## Accessibility

- Keyboard navigation: Full Monaco support
- Screen readers: Limited (Monaco limitation)
- Color contrast: WCAG AA compliant
- Zoom support: Works with browser zoom

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires ES6+ support
- Bundle size: ~2MB (tree-shaken)

---

_Related: `monaco-diff-viewer.md` | `monaco-editor.md`_
