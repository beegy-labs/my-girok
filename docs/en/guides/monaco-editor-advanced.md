# Monaco Editor Advanced Guide

This guide covers language definition with Monarch tokenizers, theme customization, dynamic height calculation, testing strategies, and troubleshooting for Monaco Editor integration.

## Overview

Monaco Editor is used to provide syntax highlighting and code editing capabilities for the authorization DSL. This guide explains how to define custom languages, create matching themes, and handle common implementation challenges.

## Monarch Tokenizer

The Monarch tokenizer defines how the authorization DSL syntax is highlighted. Register the language and its tokenization rules:

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

The tokenizer uses regular expressions to identify different syntax elements and assign them token types that the theme uses for coloring.

## Theme Configuration

### Light Theme

Create a light theme that provides good contrast and readability:

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

### Dark Theme

Create a matching dark theme for users who prefer reduced eye strain:

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

The color values are chosen to be consistent with VS Code's default themes for familiarity.

## Dynamic Height Calculation

To make the editor height adjust based on content, calculate the appropriate height from the line count:

```typescript
const [height, setHeight] = useState('500px');

useEffect(() => {
  const lines = content.split('\n').length;
  const calculatedHeight = Math.min(Math.max(lines * 19, 200), 800);
  setHeight(`${calculatedHeight}px`);
}, [content]);
```

This approach:

- Multiplies line count by 19 pixels (approximate line height)
- Enforces a minimum height of 200 pixels for usability
- Caps maximum height at 800 pixels to prevent excessive scrolling

## Testing

Monaco Editor does not render properly in test environments, so mock it with a simple textarea:

```typescript
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

This mock allows you to test the component's behavior without the complexity of the actual Monaco Editor.

## Troubleshooting

### Editor Not Loading

If the Monaco Editor fails to load:

- Verify that both `@monaco-editor/react` and `monaco-editor` packages are installed with compatible versions
- Check for JavaScript errors in the browser console
- Ensure the container element has defined dimensions

### Syntax Highlighting Not Working

If syntax highlighting does not appear:

- Verify that the `beforeMount` callback is being called (add console.log to confirm)
- Check that the language ID matches between registration and editor configuration
- Confirm the tokenizer rules are correctly formatted

### Theme Not Applying

If the custom theme is not applied:

- Ensure the `useTheme()` hook returns the correct `resolvedTheme` value
- Verify the theme is defined before the editor mounts
- Check that the theme name matches between definition and editor options

### Keyboard Shortcuts Not Working

If custom keyboard shortcuts do not function:

- Verify that `onSave` and `onValidate` props are provided to the component
- Check that the shortcuts are registered in the editor's action system
- Confirm no other element is capturing the keyboard events

## Migration from Textarea

When migrating from a plain textarea to Monaco Editor, update the component as follows:

```typescript
// Before
<textarea value={content} onChange={(e) => setContent(e.target.value)} />

// After
<MonacoAuthDSLEditor value={content} onChange={setContent} height="384px" />
```

The MonacoAuthDSLEditor component handles the value/onChange pattern similarly to a textarea, making migration straightforward.

---

_This document is auto-generated from `docs/llm/guides/monaco-editor-advanced.md`_
