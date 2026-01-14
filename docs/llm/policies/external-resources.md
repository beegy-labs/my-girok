# External Resources

## Rule

**NEVER use external CDN in production. All resources self-hosted.**

## Why

| Reason      | Benefit                 |
| ----------- | ----------------------- |
| Reliability | No CDN dependency       |
| Privacy     | GDPR/CCPA compliance    |
| Performance | No external DNS         |
| Security    | No supply chain attacks |
| Offline     | PWA support             |

## Fonts

| Font             | License | Location                                       |
| ---------------- | ------- | ---------------------------------------------- |
| Inter            | OFL 1.1 | packages/design-tokens/fonts/inter/            |
| Playfair Display | OFL 1.1 | packages/design-tokens/fonts/playfair-display/ |
| Pretendard       | OFL 1.1 | packages/design-tokens/fonts/pretendard/       |

### Usage

```css
@import '@my-girok/design-tokens/tokens.css';
/* or */
@import '@my-girok/design-tokens/fonts/inter.css';
```

### PDF

```typescript
import PretendardRegular from '@my-girok/design-tokens/fonts/pretendard/Pretendard-Regular.otf';
```

## JS Libraries

| Resource   | Location                                |
| ---------- | --------------------------------------- |
| pdfjs-dist | apps/web-main/public/pdf.worker.min.mjs |

## Allowed External

| Service         | Domain               | Reason           |
| --------------- | -------------------- | ---------------- |
| API Backend     | my-api-dev.girok.dev | Our infra        |
| OAuth providers | Various              | Runtime required |

## Adding Fonts

### 1. License Check

```yaml
allowed: [OFL, Apache 2.0, MIT]
forbidden: [Commercial, Restricted]
```

### 2. Download

```bash
mkdir -p packages/design-tokens/fonts/<font-name>
curl -L "<url>" -o packages/design-tokens/fonts/<font-name>/<weight>.ttf
```

### 3. CSS

```css
@font-face {
  font-family: '<Font>';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./<font>/<weight>.ttf') format('truetype');
}
```

### 4. License

Update packages/design-tokens/fonts/LICENSE

### 5. Export

```json
{ "exports": { "./fonts/<font>.css": "./fonts/<font>.css" } }
```

## Migration Checklist

- [ ] Download files
- [ ] Verify license
- [ ] Add to package
- [ ] Update imports
- [ ] Test build
- [ ] Update CSP
- [ ] Remove CDN URLs

## CI Check

```bash
grep -r "fonts.googleapis.com" --include="*.html" --include="*.css"
grep -rE "(cdn\.|unpkg|jsdelivr|cloudflare)" --include="*.tsx" --include="*.ts"
# Should return empty
```

## OFL Compliance

| Allowed                    | Not Allowed      |
| -------------------------- | ---------------- |
| Commercial use             | Sell fonts alone |
| Modification               |                  |
| Distribution               |                  |
| Include license (required) |                  |
