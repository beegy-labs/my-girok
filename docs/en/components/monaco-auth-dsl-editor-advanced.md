# MonacoAuthDSLEditor - Advanced

This document covers syntax highlighting, theme integration, testing, and troubleshooting for the Monaco Auth DSL Editor component.

## Syntax Highlighting

### Token Types

| Token     | Style               | Examples                            |
| --------- | ------------------- | ----------------------------------- |
| Keywords  | Bold, primary color | `model`, `schema`, `type`, `define` |
| Operators | Secondary color     | `or`, `and`, `but`, `not`, `from`   |
| Types     | Accent color        | `user`, `admin`, `resource`         |
| Comments  | Muted color, italic | `# comment`                         |
| Strings   | Error/success color | `"string"` or `'string'`            |

### Language Registration

```typescript
monaco.languages.register({ id: 'authz-dsl' });

monaco.languages.setMonarchTokensProvider('authz-dsl', {
  keywords: ['model', 'schema', 'type', 'relations', 'define', 'or', 'and', 'but', 'not', 'from'],
  typeKeywords: ['user', 'admin', 'operator', 'team', 'service', 'resource'],

  tokenizer: {
    root: [
      [/\b(model|schema)\b/, 'keyword.control'],
      [/\b(type|relations|define)\b/, 'keyword'],
      [/\b(or|and|but|not|from)\b/, 'keyword.operator'],
      [/\b(user|admin|operator|team|service|resource)\b/, 'type'],
      [/#.*$/, 'comment'],
      [/"/, 'string', '@string_double'],
      [/'/, 'string', '@string_single'],
    ],
  },
});
```

## Theme Integration

**CRITICAL**: All colors are read from CSS variables to ensure SSOT compliance.

### Color Mapping

| Theme Element | Light Mode CSS Variable     | Dark Mode CSS Variable        |
| ------------- | --------------------------- | ----------------------------- |
| Keywords      | `--theme-primary`           | `--theme-primary`             |
| Types         | `--theme-text-accent`       | `--theme-text-accent`         |
| Comments      | `--theme-text-muted`        | `--theme-text-muted`          |
| Operators     | `--theme-text-secondary`    | `--theme-text-secondary`      |
| Strings       | `--theme-status-error-text` | `--theme-status-success-text` |

### Theme Switching

```typescript
const { resolvedTheme } = useTheme();
const theme = resolvedTheme === 'dark' ? 'authz-dsl-dark' : 'authz-dsl-light';
```

## Editor Options

```typescript
{
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbers: 'on',
  roundedSelection: false,
  scrollBeyondLastLine: false,
  readOnly: false,
  automaticLayout: true,
  tabSize: 2,
  wordWrap: 'on',
  formatOnPaste: true,
  formatOnType: true,
}
```

## Testing

**File**: `apps/web-admin/src/components/MonacoAuthDSLEditor.test.tsx`

### Mock Pattern

```typescript
vi.mock('@monaco-editor/react', () => ({
  default: vi.fn(({ value, onChange }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )),
}));
```

### Coverage Areas

- Component rendering
- Theme switching (light/dark)
- onChange callbacks
- Keyboard shortcuts
- CSS variable integration
- Read-only mode

## Troubleshooting

| Issue                 | Solution                                                       |
| --------------------- | -------------------------------------------------------------- |
| Editor not loading    | Check Monaco CDN, verify package versions, clear browser cache |
| Syntax not working    | Verify language registered before mount, check `beforeMount`   |
| Theme not applying    | Verify `useTheme()` available, check CSS variables defined     |
| Colors not matching   | Use DevTools to inspect CSS variable values                    |
| Shortcuts not working | Verify props provided, check browser conflicts                 |

### Common Solutions

**Editor not loading**:

1. Verify `@monaco-editor/react` is installed
2. Check network tab for CDN issues
3. Clear browser cache and hard reload

**Syntax highlighting issues**:

1. Ensure `beforeMount` callback is provided
2. Verify language is registered before editor mounts
3. Check console for registration errors

**Theme issues**:

1. Wrap component in `ThemeProvider`
2. Verify CSS variables are defined in root
3. Check `resolvedTheme` value in DevTools

---

**Main Document**: [monaco-auth-dsl-editor.md](monaco-auth-dsl-editor.md)

---

_This document is auto-generated from `docs/llm/components/monaco-auth-dsl-editor-advanced.md`_
