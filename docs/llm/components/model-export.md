# ModelExport Component

> **Location**: `apps/web-admin/src/components/ModelExport.tsx`
> **Used In**: Authorization model versioning
> **Dependencies**: toast library, error-handler

## Overview

ModelExport is a React component for exporting authorization models with support for multiple formats. It allows users to download model versions as either JSON (with full metadata) or DSL (code only) files. The component uses centralized error handling with toast notifications for user feedback.

## Component API

### Props

| Prop      | Type         | Required | Default | Description                               |
| --------- | ------------ | -------- | ------- | ----------------------------------------- |
| `modelId` | `string`     | Yes      | -       | Unique identifier of the model to export  |
| `version` | `number`     | Yes      | -       | Version number (used in filename)         |
| `onClose` | `() => void` | No       | -       | Callback to close the export modal/dialog |

### Basic Usage

```typescript
import { ModelExport } from '../components/ModelExport';
import { useState } from 'react';

function ModelVersionList() {
  const [exportingVersion, setExportingVersion] = useState<AuthorizationModel | null>(null);

  return (
    <div>
      {versions.map((version) => (
        <div key={version.id}>
          <span>v{version.version}</span>
          <button onClick={() => setExportingVersion(version)}>
            Export
          </button>
        </div>
      ))}

      {exportingVersion && (
        <ModelExport
          modelId={exportingVersion.id}
          version={exportingVersion.version}
          onClose={() => setExportingVersion(null)}
        />
      )}
    </div>
  );
}
```

### In Modal

```typescript
import { ModelExport } from '../components/ModelExport';
import { Modal } from '../components/molecules/Modal';

function PoliciesTab() {
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportingVersion, setExportingVersion] = useState<AuthorizationModel | null>(null);

  const handleExport = (version: AuthorizationModel) => {
    setExportingVersion(version);
    setShowExportModal(true);
  };

  return (
    <>
      <button onClick={() => handleExport(selectedVersion)}>
        <Download className="w-4 h-4" /> Export
      </button>

      {showExportModal && exportingVersion && (
        <Modal
          title={`Export Model v${exportingVersion.version}`}
          onClose={() => setShowExportModal(false)}
        >
          <ModelExport
            modelId={exportingVersion.id}
            version={exportingVersion.version}
            onClose={() => setShowExportModal(false)}
          />
        </Modal>
      )}
    </>
  );
}
```

## Features

### Export Formats

The component supports two export formats:

1. **JSON Format** (`.json`):
   - Full metadata including version, notes, export timestamp
   - DSL content embedded in `content` field
   - Ideal for backup and migration

```json
{
  "version": 5,
  "content": "type user\n\ntype resource...",
  "notes": "Added new permissions",
  "exportedAt": "2026-01-14T02:00:00Z"
}
```

2. **DSL Format** (`.dsl`):
   - Pure DSL code only
   - No metadata
   - Ideal for code review and version control

```
type user

type resource
  relations
    define viewer: [user]
```

### File Download

The component:

- Creates a Blob from the API response
- Generates a download URL using `window.URL.createObjectURL()`
- Triggers automatic download with a descriptive filename
- Cleans up the object URL after download
- Filename format: `authz-model-v{version}.{format}`
  - Example: `authz-model-v5.json` or `authz-model-v5.dsl`

### User Feedback

- **Success**: Toast notification "Model v{version} exported successfully"
- **Error**: Centralized error toast via `handleApiError()`
- **Loading**: Button shows "Downloading..." during export
- **Disabled state**: Button disabled while downloading

## Format Selection UI

The component provides a visual toggle between formats:

```
┌─────────────────┬─────────────────┐
│      JSON       │       DSL       │
├─────────────────┼─────────────────┤
│ With metadata   │   Code only     │
│ and version info│                 │
└─────────────────┴─────────────────┘
```

- Active format: Blue border, highlighted background
- Inactive format: Gray border, hover effect
- Clear descriptions for each format

## Error Handling

### API Error Handling

```typescript
try {
  const response = await apiClient.get(endpoint, { responseType: 'blob' });
  // Download file...
  showSuccessToast(`Model v${version} exported successfully`);
} catch (error) {
  const appError = handleApiError(error, 'ModelExport.handleExport');
  showErrorToast(appError);
}
```

### Error Toast

The `handleApiError` function provides:

- User-friendly error messages
- Technical details for debugging (logged to console)
- Context tracking (`ModelExport.handleExport`)
- Standardized error format

## State Management

### Local State

- `exportFormat`: Selected format ('json' | 'dsl')
- `exporting`: Loading state during download

### No Global State

The component is self-contained and doesn't require global state management or React Query.

## Integration with Backend

### Endpoints

```typescript
// JSON export
GET /admin/authorization/model/{modelId}/export
Response: Blob (application/json)

// DSL export
GET /admin/authorization/model/{modelId}/export-dsl
Response: Blob (text/plain)
```

### Response Type

```typescript
const response = await apiClient.get(endpoint, {
  responseType: 'blob', // Important for file download
});
```

## Styling

The component uses Tailwind CSS with theme tokens:

- **Format buttons**: Grid layout with conditional styling
- **Active format**: Primary colors with dark mode support
- **Export button**: Full-width primary button
- **Loading state**: Opacity reduction for disabled state
- **Responsive**: Grid adapts to screen size

## Accessibility

- Clear button labels with format descriptions
- Disabled state during export prevents double-clicks
- Descriptive loading text
- Keyboard navigation support
- Close button for modal dismissal

## Related Components

- **ModelImport**: Import models from JSON/DSL files
- **MonacoDiffViewer**: View differences between model versions
- **PoliciesTab**: Main container for model management

## Example Workflow

1. User selects a model version to export
2. Opens ModelExport component (usually in a modal)
3. Chooses between JSON or DSL format
4. Clicks "Download as JSON/DSL"
5. Component shows loading state
6. File downloads automatically
7. Success toast appears
8. Modal closes (via `onClose` callback)

## Browser Compatibility

- Uses standard `Blob` and `URL.createObjectURL()` APIs
- Compatible with all modern browsers
- File download initiated via temporary `<a>` element
- Automatic cleanup of object URLs

## Testing Considerations

- Test both JSON and DSL export formats
- Verify filename generation (correct version number)
- Check loading state during download
- Confirm success/error toast notifications
- Test error handling for network failures
- Validate Blob cleanup (no memory leaks)
- Test `onClose` callback invocation

## Performance

- **Lightweight**: No heavy dependencies
- **Memory efficient**: Blob URLs are immediately revoked
- **Fast**: Direct download from API response
- **No caching**: Fresh export every time

## Security

- Uses authenticated API client
- Requires proper admin permissions
- No sensitive data exposed in URLs
- File download happens client-side (no intermediary storage)
