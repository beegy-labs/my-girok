# Web Girok - Features

> Resume PDF architecture and authentication routes

## Resume PDF Architecture

```
ResumePdfDocument.tsx -> @react-pdf/renderer (generates)
ResumePreview.tsx     -> react-pdf (displays canvas)
ResumePreviewContainer -> Responsive wrapper + scale
```

### PDF i18n

```typescript
type PdfLocale = 'ko' | 'en' | 'ja';
<ResumePdfDocument resume={resume} paperSize="A4" locale="en" />
```

### Crash Prevention

```typescript
// Stable key prevents reconciler bug (#3153)
<ResumePreviewContainer key={`preview-${previewData.id || 'new'}`} />

// Safe resume wrapper
const safeResume = useMemo(() => ({
  ...resume,
  name: resume.name || '',
  skills: resume.skills || [],
}), [resume]);
```

### Text Sanitization

```typescript
function sanitizeText(text: string | undefined | null): string {
  if (!text) return '';
  return String(text)
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Emojis
    .replace(/[\u{2600}-\u{26FF}]/gu, '') // Misc symbols
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Zero-width
}
```

### Profile Image (CORS bypass)

```typescript
import { imageToBase64 } from '../../utils/imageProxy';
const [base64, setBase64] = useState<string | null>(null);
useEffect(() => {
  if (resume.profileImage) imageToBase64(resume.profileImage).then(setBase64);
}, [resume.profileImage]);
```

### ResumePreviewContainer Props

| Prop      | Type         | Default | Description |
| --------- | ------------ | ------- | ----------- |
| resume    | Resume       | req     | Data        |
| paperSize | PaperSizeKey | A4      | Paper size  |
| scale     | number       | auto    | Fixed scale |
| maxHeight | string       | -       | Max height  |

## Auth Routes (Added 2026-01-11)

| Path                 | Description                    |
| -------------------- | ------------------------------ |
| `/login/mfa`         | MFA verification (TOTP/backup) |
| `/auth/callback`     | OAuth callback handler         |
| `/settings`          | Security settings (MFA setup)  |
| `/settings/sessions` | Active sessions management     |

## OAuth Callback Flow

```
BFF redirect → /auth/callback?provider=xxx&status=xxx
├── success       → Fetch user, redirect
├── mfa_required  → Store challenge, /login/mfa
├── error         → Show error
└── not_implemented → Provider unavailable
```

## MFA Support

- TOTP: 6-digit code from authenticator
- Backup Code: XXXX-XXXX format recovery

## Security Settings

`/settings`:

- MFA enable/disable (QR code)
- Backup codes view/regenerate

`/settings/sessions`:

- Current device info
- Revoke all other sessions

---

_Main: `web-girok.md`_
