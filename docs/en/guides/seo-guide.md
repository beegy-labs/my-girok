# SEO Guide

> Privacy-first SEO strategy with controlled content indexing

## Core Policy

**Privacy-First Approach**: No public resume pages. All resumes are private and shared only via token-based links that are not indexed by search engines.

## SEO Goals

1. **Maximize Platform Visibility**: Drive organic traffic to homepage and marketing pages
2. **Protect User Privacy**: Ensure resumes are NEVER indexed by search engines
3. **Controlled Sharing**: Use `/shared/:token` links that expire and are not crawlable

## URL Indexing Policy

| Route              | SEO    | In Sitemap | robots.txt   |
| ------------------ | ------ | ---------- | ------------ |
| `/`                | Yes    | Yes        | Allow        |
| `/login`           | No     | No         | Disallow     |
| `/register`        | No     | No         | Disallow     |
| `/change-password` | No     | No         | Disallow     |
| `/resume/*`        | **NO** | **NO**     | **Disallow** |
| `/shared/:token`   | No     | No         | Disallow     |
| `/api/*`           | No     | No         | Disallow     |

## robots.txt Configuration

Location: `apps/web-girok/public/robots.txt`

```
User-agent: *
Allow: /
Disallow: /login
Disallow: /register
Disallow: /change-password
Disallow: /resume/
Disallow: /shared/
Disallow: /api/
```

## sitemap.xml Configuration

Location: `apps/web-girok/public/sitemap.xml`

Only includes homepage with priority 1.0. All resume-related pages are excluded.

## Meta Tags Implementation

### SEO Component

Location: `apps/web-girok/src/components/SEO.tsx`

```tsx
<SEO
  title="Page Title"
  description="Page description for search results"
  keywords={['keyword1', 'keyword2']}
  url="https://www.mygirok.com/page"
  type="profile"
  structuredData={schema}
/>
```

### Features

- Dynamic title and description
- Open Graph tags for social sharing
- Twitter Card support
- Canonical URL management
- Robots directives
- JSON-LD structured data

## Structured Data

Location: `apps/web-girok/src/utils/structuredData.ts`

| Schema Type        | Use Case                                     |
| ------------------ | -------------------------------------------- |
| WebSite            | Homepage with search functionality           |
| Organization       | Company information                          |
| Person/ProfilePage | Available but NOT used (resumes not indexed) |

## Best Practices

### Content Optimization

- Unique titles for each page
- Meta descriptions: 150-160 characters
- Proper heading hierarchy (H1-H6)
- Descriptive alt text for images

### Technical SEO

- Mobile-friendly design (viewport meta tag)
- HTTPS on all pages
- Canonical URLs to prevent duplicate content
- Valid structured data (test with Google tools)

### Social Sharing

- Open Graph: `og:title`, `og:description`, `og:image`
- Twitter Card: `summary_large_image` format
- Share images: 1200x630px recommended

## Testing Commands

```bash
# Verify robots.txt
curl https://www.mygirok.com/robots.txt

# Verify sitemap
curl https://www.mygirok.com/sitemap.xml

# Check meta tags
curl https://www.mygirok.com/ | grep "meta"
```

## Testing Tools

| Tool                      | Purpose                     |
| ------------------------- | --------------------------- |
| Google Search Console     | Monitor search performance  |
| Google Rich Results Test  | Validate structured data    |
| PageSpeed Insights        | Check Core Web Vitals       |
| Facebook Sharing Debugger | Test Open Graph tags        |
| Twitter Card Validator    | Test Twitter Card rendering |

## Future Enhancements

### Marketing Pages

When adding new public pages, include in sitemap:

- `/about`
- `/features`
- `/pricing`
- `/blog`

### Internationalization

- Add hreflang tags for language variants
- Create language-specific sitemaps
- Implement geo-targeting

### Performance

- Server-side rendering for homepage
- Prerendering for marketing pages
- Service worker caching
- Core Web Vitals optimization

## Monitoring Metrics

| Metric             | Tool                  |
| ------------------ | --------------------- |
| Organic Traffic    | Google Analytics      |
| Search Rankings    | Google Search Console |
| Click-Through Rate | Google Search Console |
| Page Load Time     | PageSpeed Insights    |
| Core Web Vitals    | Google Search Console |
| Indexed Pages      | Google Search Console |

---

**LLM Reference**: `docs/llm/guides/SEO_GUIDE.md`
