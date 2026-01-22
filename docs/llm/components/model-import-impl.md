# ModelImport - Implementation Details

> Modal usage, state management, integration, and testing

## In Modal

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

## State Management

### Local State

- `file`: Selected file object
- `notes`: Version notes input value
- `activate`: Activation checkbox state
- `fileError`: Client-side validation error messages

### Mutation State (via useApiMutation)

- `isLoading`: Shows loading spinner during import
- `errorMessage`: API error message (displayed in error box)

## Integration with Authorization API

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

- Test both JSON and DSL file imports
- Verify file extension validation
- Check activation warning display
- Confirm error handling for invalid content
- Validate success/error callbacks

---

_Main: `model-import.md`_
