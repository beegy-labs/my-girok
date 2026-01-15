# ModelExport Component

> Export authorization models with support for JSON and DSL formats

## Overview

ModelExport is a React component that enables users to download authorization models in multiple formats. It supports both JSON exports with full metadata and plain DSL exports containing only the policy code. The component provides visual format selection, loading states, and toast notifications for user feedback.

**Location**: `apps/web-admin/src/components/ModelExport.tsx`

## Component API

| Prop      | Type         | Required | Default | Description                                       |
| --------- | ------------ | -------- | ------- | ------------------------------------------------- |
| `modelId` | `string`     | Yes      | -       | Unique identifier of the model to export          |
| `version` | `number`     | Yes      | -       | Version number, used in the downloaded filename   |
| `onClose` | `() => void` | No       | -       | Callback to close the export modal after download |

## Basic Usage

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

## Using with Modal

The component is typically displayed within a modal dialog:

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

## Export Formats

### JSON Format

The JSON format includes full metadata alongside the policy content, making it ideal for backups and migration between environments.

**Filename**: `authz-model-v{version}.json`

**Structure**:

```json
{
  "version": 5,
  "content": "type user\n\ntype resource...",
  "notes": "Added new permissions",
  "exportedAt": "2026-01-14T02:00:00Z"
}
```

### DSL Format

The DSL format contains only the raw policy code without any metadata, making it ideal for code review, version control, or sharing the policy definition itself.

**Filename**: `authz-model-v{version}.dsl`

**Content**:

```
type user

type resource
  relations
    define viewer: [user]
```

## User Interface

The component presents a visual toggle for format selection:

```
+-------------------+-------------------+
|       JSON        |        DSL        |
+-------------------+-------------------+
|  With metadata    |    Code only      |
|  and version info |                   |
+-------------------+-------------------+
```

The active format displays with a highlighted border and background, while the inactive format shows a subtle border with hover effects.

## User Feedback

The component provides clear feedback throughout the export process:

| State   | Feedback                                                     |
| ------- | ------------------------------------------------------------ |
| Success | Toast notification: "Model v{version} exported successfully" |
| Error   | Error toast via centralized `handleApiError()`               |
| Loading | Button text changes to "Downloading..."                      |

During download, the button is disabled to prevent multiple simultaneous requests.

## Error Handling

Errors are processed through the centralized error handling pattern:

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

The `handleApiError` function provides user-friendly messages while logging technical details to the console for debugging.

## Backend Integration

### API Endpoints

| Endpoint                                              | Response Type           | Content     |
| ----------------------------------------------------- | ----------------------- | ----------- |
| `GET /admin/authorization/model/{modelId}/export`     | Blob (application/json) | JSON format |
| `GET /admin/authorization/model/{modelId}/export-dsl` | Blob (text/plain)       | DSL format  |

Both endpoints return the content as a blob for direct file download.

## Download Mechanism

The component handles file downloads client-side:

1. Creates a Blob from the API response
2. Generates a temporary download URL using `window.URL.createObjectURL()`
3. Creates and clicks a hidden anchor element to trigger the download
4. Cleans up the object URL immediately after download to prevent memory leaks

## Accessibility

The component includes several accessibility considerations:

- Clear button labels with format descriptions
- Disabled state during export prevents accidental double-clicks
- Descriptive loading text indicates progress
- Full keyboard navigation support
- Close button available for modal dismissal

## Example Workflow

1. User clicks the "Export" button on a model version
2. Export modal opens with ModelExport component
3. User selects either JSON or DSL format
4. User clicks "Download as JSON" or "Download as DSL"
5. Button displays "Downloading..." while request is in progress
6. File automatically downloads with appropriate filename
7. Success toast appears confirming the export
8. Modal closes (via `onClose` callback)

## Browser Compatibility

The component uses standard web APIs that work across all modern browsers:

- `Blob` for creating file content
- `URL.createObjectURL()` for generating download URLs
- Temporary anchor element for triggering downloads

Object URLs are automatically revoked after use to prevent memory leaks.

## Related Components

| Component        | Purpose                              |
| ---------------- | ------------------------------------ |
| ModelImport      | Import models from JSON or DSL files |
| MonacoDiffViewer | Compare versions before export       |
| PoliciesTab      | Main container for model management  |

---

**LLM Reference**: `docs/llm/components/model-export.md`
