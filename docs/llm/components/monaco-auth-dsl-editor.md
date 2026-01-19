# MonacoAuthDSLEditor Component

```yaml
location: apps/web-admin/src/components/MonacoAuthDSLEditor.tsx
package: '@monaco-editor/react, monaco-editor'
use_case: Authorization policy editing with DSL syntax
```

## API

### Props

| Prop         | Type                      | Required | Default   | Description                 |
| ------------ | ------------------------- | -------- | --------- | --------------------------- |
| `value`      | `string`                  | ✅       | -         | Editor content (DSL source) |
| `onChange`   | `(value: string) => void` | ✅       | -         | Callback on content change  |
| `height`     | `string`                  | ❌       | `'500px'` | Editor height (CSS value)   |
| `onSave`     | `() => void`              | ❌       | -         | Callback for Ctrl+S         |
| `onValidate` | `() => void`              | ❌       | -         | Callback for Ctrl+Shift+V   |
| `readOnly`   | `boolean`                 | ❌       | `false`   | Enable read-only mode       |

### Usage

```typescript
import { MonacoAuthDSLEditor } from '../components/MonacoAuthDSLEditor';

<MonacoAuthDSLEditor
  value={content}
  onChange={setContent}
  height="600px"
  onSave={handleSave}
  onValidate={handleValidate}
/>
```

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

**CRITICAL**: All colors read from CSS variables (SSOT compliance)

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

## Keyboard Shortcuts

| Shortcut       | Action             | Prop Required |
| -------------- | ------------------ | ------------- |
| Ctrl+S / Cmd+S | Save model         | `onSave`      |
| Ctrl+Shift+V   | Validate model     | `onValidate`  |
| Ctrl+F / Cmd+F | Find (built-in)    | -             |
| Ctrl+H / Cmd+H | Replace (built-in) | -             |
| Ctrl+Z / Cmd+Z | Undo (built-in)    | -             |

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

## Performance

| Metric           | Value              |
| ---------------- | ------------------ |
| First load       | ~500ms             |
| Subsequent mount | Instant            |
| Memory usage     | ~10MB per instance |
| Code splitting   | Automatic (Vite)   |

**Best Practices**:

- Don't mount multiple editors simultaneously
- Use tabs/modals for switching
- Unmount when hidden

## Testing

**File**: `apps/web-admin/src/components/MonacoAuthDSLEditor.test.tsx`

**Mock Pattern**:

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

**Coverage**:

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

## Related Documentation

- [Authorization Service](../services/authorization-service.md)
- [Theme System](../packages/design-tokens.md)
- [Monaco Editor Docs](https://microsoft.github.io/monaco-editor/)
