# External Resources Policy

> Self-hosted resources only - no external CDN dependencies in production

## Core Rule

**NEVER use external CDN in production. All resources must be self-hosted.**

## Why Self-Host?

| Reason      | Benefit                        |
| ----------- | ------------------------------ |
| Reliability | No CDN downtime dependency     |
| Privacy     | GDPR/CCPA compliance           |
| Performance | No external DNS lookups        |
| Security    | No supply chain attack vectors |
| Offline     | PWA support                    |

## Self-Hosted Fonts

| Font             | License | Location                                       |
| ---------------- | ------- | ---------------------------------------------- |
| Inter            | OFL 1.1 | packages/design-tokens/fonts/inter/            |
| Playfair Display | OFL 1.1 | packages/design-tokens/fonts/playfair-display/ |
| Pretendard       | OFL 1.1 | packages/design-tokens/fonts/pretendard/       |

### Font Usage

```css
/* Import all tokens including fonts */
@import '@my-girok/design-tokens/tokens.css';

/* Or import specific font */
@import '@my-girok/design-tokens/fonts/inter.css';
```

### PDF Generation

```typescript
import PretendardRegular from '@my-girok/design-tokens/fonts/pretendard/Pretendard-Regular.otf';
import PretendardBold from '@my-girok/design-tokens/fonts/pretendard/Pretendard-Bold.otf';
```

## Self-Hosted JavaScript Libraries

| Resource          | Location                                |
| ----------------- | --------------------------------------- |
| pdfjs-dist worker | apps/web-main/public/pdf.worker.min.mjs |

## Allowed External Services

| Service         | Domain               | Reason              |
| --------------- | -------------------- | ------------------- |
| API Backend     | my-api-dev.girok.dev | Our infrastructure  |
| OAuth Providers | Various              | Runtime requirement |

## Adding New Fonts

### 1. Verify License

```yaml
allowed:
  - OFL (SIL Open Font License)
  - Apache 2.0
  - MIT

forbidden:
  - Commercial licenses
  - Restricted licenses
```

### 2. Download Font Files

```bash
mkdir -p packages/design-tokens/fonts/<font-name>
curl -L "<font-url>" -o packages/design-tokens/fonts/<font-name>/<weight>.ttf
```

### 3. Create CSS @font-face

```css
@font-face {
  font-family: '<Font Name>';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./<font-name>/<weight>.ttf') format('truetype');
}
```

### 4. Update License File

Add font license to: `packages/design-tokens/fonts/LICENSE`

### 5. Export in package.json

```json
{
  "exports": {
    "./fonts/<font-name>.css": "./fonts/<font-name>.css"
  }
}
```

## Migration Checklist

When migrating from CDN to self-hosted:

- [ ] Download all required files
- [ ] Verify license compatibility
- [ ] Add to appropriate package
- [ ] Update import statements
- [ ] Test build process
- [ ] Update Content Security Policy
- [ ] Remove all CDN URLs

## CI Verification

Add to CI pipeline to catch CDN usage:

```bash
# Check for Google Fonts CDN
grep -r "fonts.googleapis.com" --include="*.html" --include="*.css"

# Check for common CDNs
grep -rE "(cdn\.|unpkg|jsdelivr|cloudflare)" --include="*.tsx" --include="*.ts"

# Both commands should return empty
```

## OFL License Compliance

| Allowed                        | Not Allowed                      |
| ------------------------------ | -------------------------------- |
| Commercial use                 | Sell fonts as standalone product |
| Modification                   | -                                |
| Distribution                   | -                                |
| **Include license (required)** | -                                |

---

**LLM Reference**: `docs/llm/policies/EXTERNAL_RESOURCES.md`
