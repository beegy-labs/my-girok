# SEO Guide for My-Girok Web Application

## Overview

This guide outlines the SEO (Search Engine Optimization) strategy and implementation for My-Girok web application.

## SEO Strategy

### Core Policy: Privacy-First Resume Management

**CRITICAL**: My-Girok does NOT have public resume pages. All resumes are private and only shared via secure token-based links.

### Goals
1. **Maximize visibility** of the homepage and platform features
2. **Protect user privacy** - ensure resumes NEVER appear in search engines
3. **Prevent indexing** of all resume and user data pages
4. **Enable controlled sharing** via token-based links (`/shared/:token`)

## Implementation

### 1. Robots.txt Configuration

Location: `apps/web-main/public/robots.txt`

**Allowed URLs** (for search engine crawling):
- `/` - Homepage only

**Disallowed URLs** (blocked from search engines):
- `/login`, `/register` - Authentication pages
- `/change-password` - User settings
- `/resume/*` - **ALL resume routes (resumes are NEVER public)**
- `/shared/*` - Token-based share links (private sharing only)
- `/api/*` - API endpoints

**Resume Privacy Policy**:
- No public resume pages exist (`/resume/:username` is NOT for SEO)
- Resumes can only be accessed by:
  1. Authenticated owner (`/resume/my`, `/resume/edit`)
  2. Token-based sharing (`/shared/:token`)
- All resume routes are blocked in robots.txt
- Resumes should NEVER appear in search engine results

### 2. Sitemap.xml

Location: `apps/web-main/public/sitemap.xml`

Current implementation includes:
- Homepage (priority 1.0)

**Note**: Resume pages are intentionally excluded from sitemap.

**Future Enhancement**: Add static marketing pages when available
```xml
<!-- Example: Future marketing pages -->
<url>
  <loc>https://www.mygirok.com/about</loc>
  <priority>0.7</priority>
</url>
<url>
  <loc>https://www.mygirok.com/features</loc>
  <priority>0.7</priority>
</url>
```

### 3. Meta Tags Implementation

#### Base Meta Tags (index.html)
- Title, description, keywords
- Open Graph tags for social sharing
- Twitter Card tags
- Favicon and app icons
- Theme colors for mobile browsers

#### Dynamic Meta Tags (react-helmet-async)

**SEO Component**: `apps/web-main/src/components/SEO.tsx`

Features:
- Dynamic title and description
- Keywords management
- Open Graph protocol support
- Twitter Card support
- Canonical URL
- Robots directives (noindex, nofollow)
- Structured Data (JSON-LD)

**Usage Example**:
```tsx
import { SEO } from '../components/SEO';

<SEO
  title="John Doe - Software Engineer"
  description="View John Doe's professional resume..."
  keywords={['software engineer', 'resume', 'portfolio']}
  url="https://www.mygirok.com/resume/johndoe"
  type="profile"
  structuredData={personSchema}
/>
```

### 4. Structured Data (JSON-LD)

Location: `apps/web-main/src/utils/structuredData.ts`

**Implemented Schemas**:

#### WebSite Schema
Used on homepage for site-wide search and platform visibility.

```typescript
generateWebsiteSchema()
```

Features:
- Site name and description
- Search action configuration
- Platform metadata

#### Organization Schema
Defines My-Girok as an organization.

```typescript
generateOrganizationSchema()
```

Features:
- Company information
- Social media links
- Brand identity

**Note**: Person and ProfilePage schemas are available but NOT used, as resumes are not indexed.

### 5. Page-Specific SEO

#### HomePage (`/`)
- Default meta tags for the platform
- WebSite structured data
- Organization structured data
- Keywords: resume builder, cv creator, career management, private resume sharing
- Priority: 1.0 in sitemap (only page in sitemap)
- Open Graph and Twitter Card for social sharing

#### Private Pages (ALL resume routes)
- NO SEO implementation
- Blocked in robots.txt
- Not included in sitemap
- Access controlled by:
  - Authentication (owner only)
  - Token-based sharing (temporary access)

## URL Policy Summary

| Route Pattern | Access | SEO Allowed | Sitemap | robots.txt | Purpose |
|---------------|--------|-------------|---------|------------|---------|
| `/` | Public | Yes | Yes | Allow | Homepage/landing |
| `/login` | Public | No | No | Disallow | Authentication |
| `/register` | Public | No | No | Disallow | User registration |
| `/change-password` | Private | No | No | Disallow | User settings |
| `/resume/*` | **ALL BLOCKED** | **NO** | **NO** | **Disallow** | **Privacy protection** |
| `/resume/my` | Private (auth) | No | No | Disallow | User's resume list |
| `/resume/edit/*` | Private (auth) | No | No | Disallow | Resume editing |
| `/resume/preview/*` | Private (auth) | No | No | Disallow | Print preview |
| `/resume/:username` | Protected | No | No | Disallow | Resume viewing (not public) |
| `/shared/:token` | Token-based | No | No | Disallow | Temporary sharing |

**Key Policy Notes**:
- Only homepage (`/`) is indexed by search engines
- ALL resume routes (`/resume/*`) are blocked, including `/resume/:username`
- Resumes are NEVER publicly accessible or indexed
- Sharing is only via secure token links (`/shared/:token`)
- Token links are also excluded from search indexing

## Best Practices

### Content Optimization
1. **Unique Titles**: Each page should have a unique `<title>` tag
2. **Meta Descriptions**: 150-160 characters, compelling and descriptive
3. **Keywords**: Use relevant keywords naturally in content
4. **Headings**: Proper H1-H6 hierarchy
5. **Image Alt Text**: Descriptive alt attributes for all images

### Technical SEO
1. **Mobile-Friendly**: Responsive design with viewport meta tag
2. **Page Speed**: Optimize images, lazy loading, code splitting
3. **HTTPS**: Ensure all pages use HTTPS
4. **Canonical URLs**: Prevent duplicate content issues
5. **XML Sitemap**: Keep sitemap updated with new resume pages
6. **Structured Data**: Validate with Google's Rich Results Test

### Social Media Optimization
1. **Open Graph**: Complete og:title, og:description, og:image
2. **Twitter Cards**: Use summary_large_image for better engagement
3. **Share Images**: Create 1200x630px images for social sharing

## Testing & Validation

### Tools to Use
1. **Google Search Console**: Monitor search performance
2. **Google Rich Results Test**: Validate structured data
3. **PageSpeed Insights**: Check page speed and Core Web Vitals
4. **Facebook Sharing Debugger**: Test Open Graph tags
5. **Twitter Card Validator**: Test Twitter Card rendering

### Manual Testing
```bash
# Check robots.txt (verify resume routes are blocked)
curl https://www.mygirok.com/robots.txt

# Check sitemap.xml (should only contain homepage)
curl https://www.mygirok.com/sitemap.xml

# View homepage source and verify meta tags
curl https://www.mygirok.com/ | grep "meta"

# Verify resume routes are not indexed
# Expected: robots.txt should disallow /resume/*
grep "Disallow: /resume/" robots.txt
```

## Future Enhancements

### Marketing Pages
Add static marketing pages to sitemap when available:
- `/about` - About My-Girok
- `/features` - Platform features
- `/pricing` - Pricing information
- `/blog` - Content marketing

### Image Optimization
1. Generate OpenGraph images for homepage and marketing pages
2. Use CDN for image delivery
3. Implement lazy loading for images
4. Add proper alt text for accessibility

### Internationalization (i18n)
1. Add hreflang tags for multi-language support
2. Create language-specific sitemaps
3. Implement geo-targeting in Search Console

### Performance Optimization
1. Implement Server-Side Rendering (SSR) for homepage
2. Use prerendering for marketing pages
3. Implement service workers for offline support
4. Optimize Core Web Vitals

## Monitoring

### Key Metrics to Track
1. **Organic Traffic**: Google Analytics
2. **Search Rankings**: Google Search Console
3. **Click-Through Rate (CTR)**: Search Console
4. **Page Load Time**: PageSpeed Insights
5. **Core Web Vitals**: Search Console
6. **Indexed Pages**: Google Search Console

### Regular Audits
- Monthly SEO audit using tools like Screaming Frog
- Quarterly content review and optimization
- Monitor and fix broken links
- Check for duplicate content issues

## References

- [Google Search Central](https://developers.google.com/search)
- [Schema.org Documentation](https://schema.org/)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Card Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Web.dev SEO Guide](https://web.dev/learn/seo/)

---

**Last Updated**: 2025-01-17
