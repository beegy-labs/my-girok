# ModelExport - Implementation Details

> Modal usage, format selection UI, error handling, testing, and security

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
  - Example: `authz-model-v5.json` or `authz-model-v5.dsl`

## Error Handling

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

The `handleApiError` function provides:

- User-friendly error messages
- Technical details for debugging (logged to console)
- Context tracking (`ModelExport.handleExport`)

## State Management

### Local State

- `exportFormat`: Selected format ('json' | 'dsl')
- `exporting`: Loading state during download

### No Global State

The component is self-contained and doesn't require global state management or React Query.

## Accessibility

- Clear button labels with format descriptions
- Disabled state during export prevents double-clicks
- Descriptive loading text
- Keyboard navigation support
- Close button for modal dismissal

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

---

_Main: `model-export.md`_
