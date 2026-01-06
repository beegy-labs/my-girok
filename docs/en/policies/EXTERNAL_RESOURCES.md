# External Resources Policy

> All external resources MUST be self-hosted locally to ensure reliability, privacy, and performance.

## Policy Overview

### Why Local Hosting?

1. **Reliability**: No dependency on third-party CDN availability
2. **Privacy**: No data leakage to external services (GDPR/CCPA compliance)
3. **Performance**: Reduced latency, no DNS lookups to external domains
4. **Security**: Control over resource integrity, no supply chain attacks
5. **Offline Support**: Resources available without internet (PWA scenarios)

### Golden Rule

> **NEVER use external CDN links in production code.**
>
> All fonts, scripts, and assets MUST be stored in the repository and bundled at build time.

---

## Resource Categories

### 1. Fonts

| Status | Resource         | License | Location                                         |
| ------ | ---------------- | ------- | ------------------------------------------------ |
| ✅     | Inter            | OFL 1.1 | `packages/design-tokens/fonts/inter/`            |
| ✅     | Playfair Display | OFL 1.1 | `packages/design-tokens/fonts/playfair-display/` |
| ✅     | Pretendard       | OFL 1.1 | `packages/design-tokens/fonts/pretendard/`       |

**Usage:**

```css
/* Fonts are auto-loaded via design-tokens */
@import '@my-girok/design-tokens/tokens.css';

/* Or import specific font */
@import '@my-girok/design-tokens/fonts/inter.css';
@import '@my-girok/design-tokens/fonts/pretendard.css';
```

**For PDF generation (React PDF):**

```typescript
// Import font files directly (Vite resolves to URLs)
import PretendardRegular from '@my-girok/design-tokens/fonts/pretendard/Pretendard-Regular.otf';
```

### 2. JavaScript Libraries

| Status | Resource   | Usage              | Location                                  |
| ------ | ---------- | ------------------ | ----------------------------------------- |
| ✅     | pdfjs-dist | PDF preview worker | `apps/web-main/public/pdf.worker.min.mjs` |

### 3. Allowed External Services

These are intentionally external (self-hosted services or required integrations):

| Service          | Domain               | Purpose           | Notes                     |
| ---------------- | -------------------- | ----------------- | ------------------------- |
| Rybbit Analytics | rybbit.girok.dev     | Privacy analytics | Self-hosted, never remove |
| API Backend      | my-api-dev.girok.dev | API calls         | Our infrastructure        |

---

## Adding New Fonts

### Step 1: Check License

Only use fonts with permissive licenses:

- ✅ OFL (Open Font License) - Best for web
- ✅ Apache 2.0
- ✅ MIT
- ❌ Commercial/Restricted licenses

### Step 2: Download Font Files

```bash
# Create directory
mkdir -p packages/design-tokens/fonts/<font-name>

# Download from Google Fonts or official source
curl -L "<font-url>" -o packages/design-tokens/fonts/<font-name>/<weight>.ttf
```

### Step 3: Create CSS File

```css
/* packages/design-tokens/fonts/<font-name>.css */
@font-face {
  font-family: '<Font Name>';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./<font-name>/<weight>.ttf') format('truetype');
}
```

### Step 4: Add LICENSE

Update `packages/design-tokens/fonts/LICENSE` with:

- Copyright holder
- License type
- Source URL
- Reserved font names

### Step 5: Export in package.json

```json
{
  "exports": {
    "./fonts/<font-name>.css": "./fonts/<font-name>.css"
  }
}
```

---

## Migrating External Resources

### Current Migration Backlog

All external resources have been migrated to local storage.

| Resource         | Status | Location                                         |
| ---------------- | ------ | ------------------------------------------------ |
| Inter            | ✅     | `packages/design-tokens/fonts/inter/`            |
| Playfair Display | ✅     | `packages/design-tokens/fonts/playfair-display/` |
| Pretendard       | ✅     | `packages/design-tokens/fonts/pretendard/`       |
| pdfjs-dist       | ✅     | `apps/web-main/public/pdf.worker.min.mjs`        |

### Migration Checklist

- [ ] Download resource files
- [ ] Verify license compatibility
- [ ] Add to appropriate package
- [ ] Update imports/references
- [ ] Test build and runtime
- [ ] Update CSP headers if needed
- [ ] Remove old CDN URLs

---

## Code Review Checklist

When reviewing PRs, check for:

1. **No external CDN links** in HTML, CSS, or JS files
2. **License file included** for new fonts/resources
3. **Package exports updated** for new resources
4. **CSP headers** don't reference new external domains
5. **Build works offline** after changes

### Grep Commands for CI

```bash
# Find external font references
grep -r "fonts.googleapis.com" --include="*.html" --include="*.css"

# Find CDN references
grep -rE "(cdn\.|unpkg|jsdelivr|cloudflare)" --include="*.tsx" --include="*.ts" --include="*.html"

# Should return empty for production code (test files are exceptions)
```

---

## License Compliance

### SIL Open Font License (OFL) Requirements

1. ✅ **Commercial use**: Allowed
2. ✅ **Modification**: Allowed
3. ✅ **Distribution**: Allowed with software
4. ❌ **Selling fonts alone**: Not allowed
5. ✅ **Include license**: Required (fonts/LICENSE file)

### Attribution

Font licenses and copyright notices are maintained in:

- `packages/design-tokens/fonts/LICENSE`

---

## Exceptions

The following external resources are **allowed** and intentional:

| Resource         | Reason                                    |
| ---------------- | ----------------------------------------- |
| rybbit.girok.dev | Self-hosted analytics, our infrastructure |
| OAuth providers  | Required for social login (runtime only)  |
| API endpoints    | Our backend services                      |

---

## Related Documentation

- `.ai/packages/design-tokens.md` - Font usage guide
- `.ai/ssot.md` - SSOT patterns
- `docs/policies/SECURITY.md` - CSP configuration
