# ModelExport - Implementation Details

> Modal usage, format selection UI, and file download

## In Modal

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

## Format Selection UI

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

## File Download

The component:

- Creates a Blob from the API response
- Generates a download URL using `window.URL.createObjectURL()`
- Triggers automatic download with a descriptive filename
- Cleans up the object URL after download
- Filename format: `authz-model-v{version}.{format}`

## Error Handling

```typescript
try {
  const response = await apiClient.get(endpoint, { responseType: 'blob' });
  showSuccessToast(`Model v${version} exported successfully`);
} catch (error) {
  const appError = handleApiError(error, 'ModelExport.handleExport');
  showErrorToast(appError);
}
```

## State Management

### Local State

- `exportFormat`: Selected format ('json' | 'dsl')
- `exporting`: Loading state during download

### No Global State

The component is self-contained and doesn't require global state management or React Query.

## Related Documentation

- **Testing & Security**: `model-export-impl-testing.md`
- Main: `model-export.md`
