# ModelExport - Testing & Security

> Accessibility, testing, performance, and security

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

_Main: `model-export-impl.md`_
