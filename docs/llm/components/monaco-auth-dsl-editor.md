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

## Keyboard Shortcuts

| Shortcut       | Action             | Prop Required |
| -------------- | ------------------ | ------------- |
| Ctrl+S / Cmd+S | Save model         | `onSave`      |
| Ctrl+Shift+V   | Validate model     | `onValidate`  |
| Ctrl+F / Cmd+F | Find (built-in)    | -             |
| Ctrl+H / Cmd+H | Replace (built-in) | -             |
| Ctrl+Z / Cmd+Z | Undo (built-in)    | -             |

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

## Related Documentation

- **Syntax & Theme Details**: `monaco-auth-dsl-editor-advanced.md`
- [Authorization Service](../services/authorization-service.md)
- [Theme System](../packages/design-tokens.md)
