# ModelExport Component

> **Location**: `apps/web-admin/src/components/ModelExport.tsx`
> **Used In**: Authorization model versioning
> **Dependencies**: toast library, error-handler

## Overview

ModelExport is a React component for exporting authorization models with support for multiple formats. It allows users to download model versions as either JSON (with full metadata) or DSL (code only) files.

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

<ModelExport
  modelId={version.id}
  version={version.version}
  onClose={() => setShowModal(false)}
/>
```

## Export Formats

### JSON Format (`.json`)

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

### DSL Format (`.dsl`)

- Pure DSL code only
- No metadata
- Ideal for code review and version control

## User Feedback

- **Success**: Toast notification "Model v{version} exported successfully"
- **Error**: Centralized error toast via `handleApiError()`
- **Loading**: Button shows "Downloading..." during export

## Endpoints

```typescript
// JSON export
GET /admin/authorization/model/{modelId}/export
Response: Blob (application/json)

// DSL export
GET /admin/authorization/model/{modelId}/export-dsl
Response: Blob (text/plain)
```

## Related Documentation

- **Implementation Details**: `model-export-impl.md`
- **ModelImport**: Import models from JSON/DSL files
- **MonacoDiffViewer**: View differences between model versions
