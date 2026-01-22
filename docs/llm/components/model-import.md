# ModelImport Component

> **Location**: `apps/web-admin/src/components/ModelImport.tsx`
> **Used In**: Authorization model versioning
> **Dependencies**: useApiMutation hook

## Overview

ModelImport is a React component for importing authorization models from JSON or DSL files. It supports both full JSON exports (with metadata) and plain DSL files, with automatic content detection and validation.

## Component API

### Props

| Prop         | Type         | Required | Default | Description                               |
| ------------ | ------------ | -------- | ------- | ----------------------------------------- |
| `onImported` | `() => void` | No       | -       | Callback invoked after successful import  |
| `onClose`    | `() => void` | No       | -       | Callback to close the import modal/dialog |

### Basic Usage

```typescript
import { ModelImport } from '../components/ModelImport';

<ModelImport
  onImported={() => refetchModels()}
  onClose={() => setShowImport(false)}
/>
```

## File Format Support

### JSON Format (`.json`)

```json
{
  "version": "1.0",
  "content": "type user\n\ntype resource...",
  "notes": "Initial model",
  "exportedAt": "2026-01-14T00:00:00Z"
}
```

### DSL Format (`.dsl`)

```
type user

type resource
  relations
    define viewer: [user]
```

## Features

- **Automatic Content Detection**: Detects JSON vs DSL format automatically
- **File Validation**: Only `.json` and `.dsl` extensions accepted
- **Version Notes**: Optional notes saved with the model version
- **Activation Option**: Immediately activate imported model (with warning)

## Error Handling

- **File validation errors**: Displayed inline
- **API errors**: Automatic toast notifications via `useApiMutation`
- **Success**: "Authorization model imported successfully" toast

## Backend Endpoint

```
POST /admin/authorization/model/import
Body: { content: string, notes?: string, activate?: boolean }
```

## Related Documentation

- **Implementation Details**: `model-import-impl.md`
- **ModelExport**: Export models to JSON/DSL files
- **MonacoDiffViewer**: View differences between model versions
