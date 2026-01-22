# ModelExport - Implementation Details

This document covers modal usage, format selection UI, file download, and testing considerations for the ModelExport component.

## Modal Usage

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
+------------------+------------------+
|       JSON       |       DSL        |
+------------------+------------------+
|  With metadata   |    Code only     |
|  and version info|                  |
+------------------+------------------+
```

**Visual States**:

- **Active format**: Blue border, highlighted background
- **Inactive format**: Gray border, hover effect
- Clear descriptions for each format

## File Download

The component handles file downloads as follows:

1. Creates a Blob from the API response
2. Generates a download URL using `window.URL.createObjectURL()`
3. Triggers automatic download with a descriptive filename
4. Cleans up the object URL after download

**Filename Format**: `authz-model-v{version}.{format}`

Examples:

- `authz-model-v1.json`
- `authz-model-v2.dsl`

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

| State          | Type                | Description                   |
| -------------- | ------------------- | ----------------------------- |
| `exportFormat` | `'json'` \| `'dsl'` | Currently selected format     |
| `exporting`    | `boolean`           | Loading state during download |

### No Global State

The component is self-contained and doesn't require global state management or React Query.

## Accessibility

- Clear button labels with format descriptions
- Disabled state during export prevents double-clicks
- Descriptive loading text
- Keyboard navigation support
- Close button for modal dismissal

## Testing Considerations

| Test Case            | Description                               |
| -------------------- | ----------------------------------------- |
| Format selection     | Test both JSON and DSL export formats     |
| Filename generation  | Verify correct version number in filename |
| Loading state        | Check loading indicator during download   |
| Success notification | Confirm success toast appears             |
| Error handling       | Test error handling for network failures  |
| Memory management    | Validate Blob URL cleanup (no leaks)      |
| Callback invocation  | Test `onClose` callback is called         |

## Performance

- **Lightweight**: No heavy dependencies
- **Memory efficient**: Blob URLs are immediately revoked
- **Fast**: Direct download from API response
- **No caching**: Fresh export every time (ensures latest version)

## Security

- Uses authenticated API client
- Requires proper admin permissions
- No sensitive data exposed in URLs
- File download happens client-side (no intermediary storage)

---

**Main Document**: [model-export.md](model-export.md)

---

_This document is auto-generated from `docs/llm/components/model-export-impl.md`_
