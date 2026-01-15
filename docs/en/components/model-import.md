# ModelImport Component

> Import authorization models from JSON or DSL files with validation and activation options

## Overview

ModelImport is a React component that enables users to import authorization models from external files. It supports both JSON exports (containing metadata) and plain DSL files, with automatic format detection. The component integrates with the centralized error handling pattern through `useApiMutation` for consistent toast notifications and error management.

**Location**: `apps/web-admin/src/components/ModelImport.tsx`

## Component API

| Prop         | Type         | Required | Default | Description                                  |
| ------------ | ------------ | -------- | ------- | -------------------------------------------- |
| `onImported` | `() => void` | No       | -       | Callback invoked after a successful import   |
| `onClose`    | `() => void` | No       | -       | Callback to close the import modal or dialog |

## Basic Usage

```typescript
import { ModelImport } from '../components/ModelImport';
import { useState } from 'react';

function AuthorizationPage() {
  const [showImport, setShowImport] = useState(false);

  const handleImported = () => {
    console.log('Model imported successfully');
    setShowImport(false);
    // Refresh model list
    refetchModels();
  };

  return (
    <div>
      <button onClick={() => setShowImport(true)}>Import Model</button>

      {showImport && (
        <ModelImport
          onImported={handleImported}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
```

## Using with Modal

The component is typically displayed within a modal dialog:

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

## Supported File Formats

### JSON Format

JSON files can contain full metadata from a previous export. The component extracts the DSL content from the `content` field:

```json
{
  "version": "1.0",
  "content": "type user\n\ntype resource...",
  "notes": "Initial model",
  "exportedAt": "2026-01-14T00:00:00Z"
}
```

### DSL Format

DSL files contain raw policy code without any wrapper:

```
type user

type resource
  relations
    define viewer: [user]
```

## Automatic Content Detection

The component automatically determines the file format:

1. Attempts to parse the file content as JSON
2. If successful and the parsed object contains a `content` field, extracts the DSL from that field
3. Otherwise, treats the entire file content as DSL code

This approach allows users to import either format without manually specifying the type.

## File Validation

The component validates files before processing:

- Only `.json` and `.dsl` file extensions are accepted
- Other file types display an error message: "Only .json and .dsl files are supported"
- Empty file selection shows: "Please select a file"

## Import Options

### Version Notes

Users can optionally add notes when importing a model. These notes are saved alongside the model version for change tracking and documentation purposes.

### Activation Option

The "Activate after import" checkbox allows users to immediately make the imported model the active version. When selected, a warning message appears explaining that this will replace the current active model.

## Error Handling

The component uses `useApiMutation` for consistent error handling:

| Error Type             | Display Location                                   |
| ---------------------- | -------------------------------------------------- |
| File validation errors | Inline text below the file input                   |
| API errors             | Toast notification via `useApiMutation`            |
| Success notification   | Toast: "Authorization model imported successfully" |

## State Management

### Local State

| State       | Type             | Purpose                              |
| ----------- | ---------------- | ------------------------------------ |
| `file`      | `File \| null`   | The selected file object             |
| `notes`     | `string`         | User-entered version notes           |
| `activate`  | `boolean`        | Whether to activate after import     |
| `fileError` | `string \| null` | Client-side validation error message |

### Mutation State

The `useApiMutation` hook provides:

- `isLoading`: Shows loading spinner during import
- `errorMessage`: API error message displayed in error box

## Backend Integration

### API Endpoint

```
POST /admin/authorization/model/import
```

### Request Body

```typescript
{
  content: string;      // DSL content (required)
  notes?: string;       // Optional version notes
  activate?: boolean;   // Whether to activate immediately
}
```

The component extracts the DSL content from the selected file, combines it with the user-provided options, and sends the request to the backend.

## User Interface Elements

The component includes the following UI elements:

1. **File Input**: Styled file picker accepting `.json` and `.dsl` files
2. **Notes Field**: Textarea for optional version notes
3. **Activation Checkbox**: Toggle for immediate activation
4. **Warning Message**: Displayed when activation is selected
5. **Error Display**: Red-background message for validation or API errors
6. **Import Button**: Primary action button with loading state

## Accessibility

The component follows accessibility best practices:

- Proper label associations for all form inputs
- Disabled state prevents multiple submissions during import
- Clear error messages provide validation feedback
- Loading state shows descriptive text
- Keyboard navigation works throughout the form

## Example Workflow

1. User clicks the "Import" button
2. Import modal opens with the ModelImport component
3. User selects a `.json` or `.dsl` file from their computer
4. Optionally adds version notes describing the import
5. Optionally checks "Activate after import" (warning appears)
6. Clicks "Import Model"
7. Component shows loading state during API call
8. On success: Toast notification appears, callbacks are invoked
9. On error: Error message displays inline

## Related Components

| Component        | Purpose                                       |
| ---------------- | --------------------------------------------- |
| ModelExport      | Export models to JSON or DSL files            |
| MonacoDiffViewer | Compare imported version with current version |
| PoliciesTab      | Main container for model management           |

## Testing Considerations

When testing the ModelImport component:

- Verify both JSON and DSL file imports work correctly
- Test file extension validation rejects unsupported types
- Confirm the activation warning appears when checkbox is selected
- Validate error handling for invalid file content
- Verify success and error callbacks are invoked appropriately
- Test the loading state and disabled button during import

---

**LLM Reference**: `docs/llm/components/model-import.md`
