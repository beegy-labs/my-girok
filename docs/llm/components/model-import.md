# ModelImport Component

> **Location**: `apps/web-admin/src/components/ModelImport.tsx`
> **Used In**: Authorization model versioning
> **Dependencies**: useApiMutation hook

## Overview

ModelImport is a React component for importing authorization models from JSON or DSL files. It supports both full JSON exports (with metadata) and plain DSL files, with automatic content detection and validation. The component uses the centralized error handling pattern via `useApiMutation` for consistent toast notifications and error management.

## Component API

### Props

| Prop         | Type         | Required | Default | Description                               |
| ------------ | ------------ | -------- | ------- | ----------------------------------------- |
| `onImported` | `() => void` | No       | -       | Callback invoked after successful import  |
| `onClose`    | `() => void` | No       | -       | Callback to close the import modal/dialog |

### Basic Usage

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

### In Modal

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

## Features

### File Format Support

The component accepts two file formats:

1. **JSON Format** (`.json`):

```json
{
  "version": "1.0",
  "content": "type user\n\ntype resource...",
  "notes": "Initial model",
  "exportedAt": "2026-01-14T00:00:00Z"
}
```

2. **DSL Format** (`.dsl`):

```
type user

type resource
  relations
    define viewer: [user]
```

### Automatic Content Detection

The component automatically detects the file format:

- If the file is valid JSON with a `content` field, it extracts the DSL content
- Otherwise, it treats the entire file content as DSL code

### File Validation

Only `.json` and `.dsl` file extensions are accepted. Other file types will show an error message.

### Version Notes

Users can optionally add notes when importing a model. These notes are saved with the model version for change tracking.

### Activation Option

The "Activate after import" checkbox allows users to immediately activate the imported model, replacing the current active model. A warning is displayed when this option is selected.

## Error Handling

The component uses `useApiMutation` for consistent error handling:

- **File validation errors**: Displayed inline (e.g., unsupported file type, no file selected)
- **API errors**: Automatically displayed as toast notifications via `useApiMutation`
- **Success notifications**: "Authorization model imported successfully" toast

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

The component uses Tailwind CSS with theme tokens for consistent styling:

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

## Related Components

- **ModelExport**: Export models to JSON/DSL files
- **MonacoDiffViewer**: View differences between model versions
- **PoliciesTab**: Main container for model management

## Backend Endpoint

```
POST /admin/authorization/model/import
Body: { content: string, notes?: string, activate?: boolean }
```

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
