# Web Girok - Features

This document covers the Resume PDF architecture and authentication routes for the Web Girok application.

## Resume PDF Architecture

### Component Structure

```
ResumePdfDocument.tsx  -> @react-pdf/renderer (generates PDF)
ResumePreview.tsx      -> react-pdf (displays canvas preview)
ResumePreviewContainer -> Responsive wrapper + scale handling
```

### PDF Internationalization

The PDF generator supports multiple locales:

```typescript
type PdfLocale = 'ko' | 'en' | 'ja';

<ResumePdfDocument
  resume={resume}
  paperSize="A4"
  locale="en"
/>
```

### Crash Prevention

**Stable Key for Reconciler Bug (#3153)**:

```typescript
// Prevents React reconciler issues
<ResumePreviewContainer key={`preview-${previewData.id || 'new'}`} />
```

**Safe Resume Wrapper**:

```typescript
// Ensures all required fields have default values
const safeResume = useMemo(
  () => ({
    ...resume,
    name: resume.name || '',
    skills: resume.skills || [],
  }),
  [resume],
);
```

### Text Sanitization

The PDF generator sanitizes text to remove unsupported characters:

```typescript
function sanitizeText(text: string | undefined | null): string {
  if (!text) return '';
  return String(text)
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Emojis
    .replace(/[\u{2600}-\u{26FF}]/gu, '') // Misc symbols
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Zero-width characters
}
```

### Profile Image Handling (CORS Bypass)

```typescript
import { imageToBase64 } from '../../utils/imageProxy';

const [base64, setBase64] = useState<string | null>(null);

useEffect(() => {
  if (resume.profileImage) {
    imageToBase64(resume.profileImage).then(setBase64);
  }
}, [resume.profileImage]);
```

### ResumePreviewContainer Props

| Prop      | Type         | Default  | Description              |
| --------- | ------------ | -------- | ------------------------ |
| resume    | Resume       | required | Resume data object       |
| paperSize | PaperSizeKey | A4       | Paper size (A4, Letter)  |
| scale     | number       | auto     | Fixed scale factor       |
| maxHeight | string       | -        | Maximum container height |

## Authentication Routes

**Added**: 2026-01-11

| Path                 | Description                    |
| -------------------- | ------------------------------ |
| `/login/mfa`         | MFA verification (TOTP/backup) |
| `/auth/callback`     | OAuth callback handler         |
| `/settings`          | Security settings (MFA setup)  |
| `/settings/sessions` | Active sessions management     |

## OAuth Callback Flow

```
BFF redirect -> /auth/callback?provider=xxx&status=xxx
├── success         -> Fetch user, redirect to dashboard
├── mfa_required    -> Store challenge, redirect to /login/mfa
├── error           -> Show error message
└── not_implemented -> Provider unavailable message
```

## MFA Support

### TOTP Authentication

- 6-digit code from authenticator app (Google Authenticator, Authy, etc.)

### Backup Code Recovery

- Format: `XXXX-XXXX`
- Single-use recovery codes

## Security Settings

### Main Settings Page (`/settings`)

- Enable/disable MFA with QR code
- View backup codes
- Regenerate backup codes

### Sessions Page (`/settings/sessions`)

- View current device information
- List all active sessions
- Revoke all other sessions

---

**Main Document**: [web-girok.md](web-girok.md)

---

_This document is auto-generated from `docs/llm/apps/web-girok-features.md`_
