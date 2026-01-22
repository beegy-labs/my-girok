# Monaco Editor Advanced

> Language definition, testing, and troubleshooting

## Monarch Tokenizer

```typescript
monaco.languages.register({ id: 'authz-dsl' });

monaco.languages.setMonarchTokensProvider('authz-dsl', {
  keywords: ['model', 'schema', 'type', 'relations', 'define', 'or', 'and', 'but', 'not', 'from'],
  typeKeywords: ['user', 'admin', 'operator', 'team', 'service', 'resource'],
  operators: [':', '[', ']', '|', '#'],

  tokenizer: {
    root: [
      [/\b(model|schema)\b/, 'keyword.control'],
      [/\b(type|relations|define)\b/, 'keyword'],
      [/\b(or|and|but|not|from)\b/, 'keyword.operator'],
      [/\b(user|admin|operator|team|service|resource)\b/, 'type'],
      [/#.*$/, 'comment'],
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/'([^'\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string_double'],
      [/'/, 'string', '@string_single'],
      [/[a-zA-Z_]\w*/, 'identifier'],
    ],
  },
});
```

## Theme Colors

**Light Theme (authz-dsl-light):**

```typescript
{
  base: 'vs',
  rules: [
    { token: 'keyword.control', foreground: '0000FF', fontStyle: 'bold' },
    { token: 'keyword', foreground: '0000FF' },
    { token: 'keyword.operator', foreground: 'AF00DB' },
    { token: 'type', foreground: '267F99' },
    { token: 'comment', foreground: '008000', fontStyle: 'italic' },
    { token: 'string', foreground: 'A31515' },
  ],
}
```

**Dark Theme (authz-dsl-dark):**

```typescript
{
  base: 'vs-dark',
  rules: [
    { token: 'keyword.control', foreground: '569CD6', fontStyle: 'bold' },
    { token: 'keyword', foreground: '569CD6' },
    { token: 'keyword.operator', foreground: 'C586C0' },
    { token: 'type', foreground: '4EC9B0' },
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
    { token: 'string', foreground: 'CE9178' },
  ],
}
```

## Dynamic Height

```typescript
const [height, setHeight] = useState('500px');

useEffect(() => {
  const lines = content.split('\n').length;
  const calculatedHeight = Math.min(Math.max(lines * 19, 200), 800);
  setHeight(`${calculatedHeight}px`);
}, [content]);
```

## Testing

```typescript
// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

test('renders with initial value', () => {
  render(<MonacoAuthDSLEditor value="model test" onChange={vi.fn()} />);
  expect(screen.getByTestId('monaco-editor')).toHaveValue('model test');
});
```

## Troubleshooting

| Issue                 | Solution                                                  |
| --------------------- | --------------------------------------------------------- |
| Editor not loading    | Check `@monaco-editor/react` and `monaco-editor` versions |
| Syntax not working    | Verify `beforeMount` callback is called                   |
| Theme not applying    | Ensure `useTheme()` hook is available                     |
| Shortcuts not working | Verify `onSave`/`onValidate` props provided               |

## Migration from Textarea

```typescript
// Before
<textarea value={content} onChange={(e) => setContent(e.target.value)} />

// After
<MonacoAuthDSLEditor value={content} onChange={setContent} height="384px" />
```

---

_Related: `monaco-editor.md` | `monaco-diff-viewer.md`_
