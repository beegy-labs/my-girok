# ModelImport - Implementation Details

This document covers modal usage, state management, API integration, and testing considerations for the ModelImport component.

## Modal Usage

```typescript
import { ModelImport } from '../components/ModelImport';
import { Modal } from '../components/molecules/Modal';

function PoliciesTab() {
  const [showImportModal, setShowImportModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowImportModal(true)}>
        <Upload className="w-4 h-4" /> Import
      </button>

      {showImportModal && (
        <Modal
          title="Import Authorization Model"
          onClose={() => setShowImportModal(false)}
        >
          <ModelImport
            onImported={() => {
              setShowImportModal(false);
              fetchModel(); // Refresh data
            }}
            onClose={() => setShowImportModal(false)}
          />
        </Modal>
      )}
    </>
  );
}
```

## Automatic Content Detection

The component automatically detects the file format:

- If the file is valid JSON with a `content` field, it extracts the DSL content
- Otherwise, it treats the entire file content as DSL code

This allows users to import either:

- Raw `.dsl` files with DSL code
- `.json` files exported from the system (with metadata)

## State Management

### Local State

| State       | Type             | Description                  |
| ----------- | ---------------- | ---------------------------- |
| `file`      | `File \| null`   | Selected file object         |
| `notes`     | `string`         | Version notes input value    |
| `activate`  | `boolean`        | Activation checkbox state    |
| `fileError` | `string \| null` | Client-side validation error |

### Mutation State (via useApiMutation)

| State          | Type      | Description                   |
| -------------- | --------- | ----------------------------- |
| `isLoading`    | `boolean` | Shows loading spinner         |
| `errorMessage` | `string`  | API error message (error box) |

## API Integration

```typescript
interface ImportVariables {
  content: string;
  notes?: string;
  activate?: boolean;
}

// API call
authorizationApi.importModel(
  vars.content, // DSL content
  vars.notes, // Optional version notes
  vars.activate, // Whether to activate immediately
);
```

## Styling

The component uses Tailwind CSS with theme tokens:

- File input with styled file button
- Warning message for activation option
- Error message with red background
- Primary button for import action
- Disabled state when no file is selected or while importing

## Accessibility

- Proper label associations for form inputs
- Disabled state prevents multiple submissions
- Clear error messages for validation feedback
- Loading state with descriptive text

## Example Workflow

1. User clicks "Import" button
2. Selects `.json` or `.dsl` file
3. Optionally adds version notes
4. Optionally checks "Activate after import"
5. Clicks "Import Model"
6. Component shows loading state
7. On success: toast notification, callbacks invoked
8. On error: error message displayed

## Testing Considerations

| Test Case                 | Description                             |
| ------------------------- | --------------------------------------- |
| JSON file import          | Test importing JSON files with metadata |
| DSL file import           | Test importing raw DSL files            |
| File extension validation | Verify only `.json` and `.dsl` accepted |
| Activation warning        | Check warning display when activated    |
| Invalid content           | Confirm error handling for bad content  |
| Success callback          | Validate `onImported` callback          |
| Error callback            | Validate `onClose` callback             |

---

**Main Document**: [model-import.md](model-import.md)

---

_This document is auto-generated from `docs/llm/components/model-import-impl.md`_
