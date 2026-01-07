# SEO Guide

## Core Policy

**Privacy-First**: No public resume pages. All resumes private, shared via token-based links only.

## Goals

1. Maximize homepage/platform visibility
2. Protect user privacy (resumes NEVER indexed)
3. Controlled sharing via `/shared/:token`

## URL Policy

| Route              | SEO    | Sitemap | robots.txt   |
| ------------------ | ------ | ------- | ------------ |
| `/`                | Yes    | Yes     | Allow        |
| `/login`           | No     | No      | Disallow     |
| `/register`        | No     | No      | Disallow     |
| `/change-password` | No     | No      | Disallow     |
| `/resume/*`        | **NO** | **NO**  | **Disallow** |
| `/shared/:token`   | No     | No      | Disallow     |
| `/api/*`           | No     | No      | Disallow     |

## robots.txt

Location: `apps/web-main/public/robots.txt`

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

## sitemap.xml

Location: `apps/web-main/public/sitemap.xml`

Only homepage (priority 1.0). Resumes excluded.

## Meta Tags

### SEO Component

Location: `apps/web-main/src/components/SEO.tsx`

```tsx
<SEO
  title="Page Title"
  description="Description"
  keywords={['keyword1', 'keyword2']}
  url="https://www.mygirok.com/page"
  type="profile"
  structuredData={schema}
/>
```

Features: Dynamic title/description, Open Graph, Twitter Card, canonical URL, robots directives, JSON-LD

## Structured Data

Location: `apps/web-main/src/utils/structuredData.ts`

| Schema       | Use             |
| ------------ | --------------- |
| WebSite      | Homepage search |
| Organization | Company info    |

Person/ProfilePage available but NOT used (resumes not indexed)

## Best Practices

### Content

- Unique titles per page
- Meta descriptions: 150-160 chars
- Proper H1-H6 hierarchy
- Descriptive alt text

### Technical

- Mobile-friendly (viewport meta)
- HTTPS all pages
- Canonical URLs
- Valid structured data

### Social

- Open Graph: og:title, og:description, og:image
- Twitter Card: summary_large_image
- Share images: 1200x630px

## Testing

```bash
curl https://www.mygirok.com/robots.txt
curl https://www.mygirok.com/sitemap.xml
curl https://www.mygirok.com/ | grep "meta"
```

### Tools

| Tool                      | Purpose            |
| ------------------------- | ------------------ |
| Google Search Console     | Search performance |
| Google Rich Results Test  | Structured data    |
| PageSpeed Insights        | Core Web Vitals    |
| Facebook Sharing Debugger | Open Graph         |
| Twitter Card Validator    | Twitter Card       |

## Future Enhancements

### Marketing Pages

Add to sitemap: `/about`, `/features`, `/pricing`, `/blog`

### i18n

- hreflang tags
- Language-specific sitemaps
- Geo-targeting

### Performance

- SSR for homepage
- Prerendering marketing pages
- Service workers
- Core Web Vitals optimization

## Monitoring

| Metric          | Tool               |
| --------------- | ------------------ |
| Organic Traffic | Google Analytics   |
| Rankings        | Search Console     |
| CTR             | Search Console     |
| Page Load       | PageSpeed Insights |
| Core Web Vitals | Search Console     |
| Indexed Pages   | Search Console     |
