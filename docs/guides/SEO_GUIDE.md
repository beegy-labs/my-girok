# SEO Guide for My-Girok Web Application

## Overview

This guide outlines the SEO (Search Engine Optimization) strategy and implementation for My-Girok web application.

## SEO Strategy

### Goals
1. **Maximize visibility** of public resume pages (`/resume/:username`)
2. **Improve search rankings** for career and resume-related keywords
3. **Prevent indexing** of private/auth pages
4. **Enhance social sharing** with proper Open Graph and Twitter Card meta tags

## Implementation

### 1. Robots.txt Configuration

Location: `apps/web-main/public/robots.txt`

**Allowed URLs** (for search engine crawling):
- `/` - Homepage
- `/resume/:username` - Public resume pages

**Disallowed URLs** (blocked from search engines):
- `/login`, `/register` - Authentication pages
- `/change-password` - User settings
- `/resume/my` - Private resume list
- `/resume/edit/*` - Resume editing pages
- `/resume/preview/*` - Preview pages
- `/shared/*` - Temporary share links (token-based)
- `/api/*` - API endpoints

### 2. Sitemap.xml

Location: `apps/web-main/public/sitemap.xml`

Current implementation includes:
- Homepage (priority 1.0)
- Static pages (priority 0.5)
- Placeholder for dynamic resume URLs (priority 0.8)

**Future Enhancement**: Generate dynamic sitemap from database
```bash
# Example: Backend service to generate sitemap
GET /api/sitemap.xml
# Returns XML with all public resume URLs
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

#### Person Schema
Used on public resume pages to provide rich search results.

```typescript
generatePersonSchema({
  name: "John Doe",
  jobTitle: "Software Engineer",
  email: "john@example.com",
  url: "https://www.mygirok.com/resume/johndoe",
  alumniOf: ["MIT", "Stanford"],
  worksFor: [{ name: "Google", url: "https://google.com" }]
})
```

#### WebSite Schema
Used on homepage for site-wide search.

```typescript
generateWebsiteSchema()
```

#### Organization Schema
Defines My-Girok as an organization.

```typescript
generateOrganizationSchema()
```

#### ProfilePage Schema
Marks resume pages as profile pages.

```typescript
generateProfilePageSchema(username, name, description)
```

### 5. Page-Specific SEO

#### HomePage (`/`)
- Default meta tags for the platform
- WebSite structured data
- Keywords: resume builder, cv creator, career management
- Priority: 1.0 in sitemap

#### PublicResumePage (`/resume/:username`)
- Dynamic title: "{Name} - Professional Resume"
- Dynamic description from resume summary
- Person structured data
- Keywords: user's name, position, skills
- Priority: 0.8 in sitemap
- Canonical URL to prevent duplicates
- Open Graph image (profile picture)

#### Private Pages
- `noindex, nofollow` in robots meta tag
- Not included in sitemap
- Blocked in robots.txt

## URL Policy Summary

| Route Pattern | Public | SEO Allowed | Sitemap | robots.txt |
|---------------|--------|-------------|---------|------------|
| `/` | Yes | Yes | Yes | Allow |
| `/resume/:username` | Yes | Yes | Yes | Allow |
| `/login` | Yes | No | No | Disallow |
| `/register` | Yes | No | No | Disallow |
| `/change-password` | No | No | No | Disallow |
| `/resume/my` | No | No | No | Disallow |
| `/resume/edit/*` | No | No | No | Disallow |
| `/resume/preview/*` | No | No | No | Disallow |
| `/shared/*` | Public | No | No | Disallow |

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
# Check robots.txt
curl https://www.mygirok.com/robots.txt

# Check sitemap.xml
curl https://www.mygirok.com/sitemap.xml

# View page source and verify meta tags
curl https://www.mygirok.com/resume/username | grep "meta"
```

## Future Enhancements

### Dynamic Sitemap Generation
Create a backend endpoint to generate sitemap from database:
```typescript
// services/personal-service/src/sitemap/sitemap.controller.ts
@Get('sitemap.xml')
async getSitemap() {
  const users = await this.userService.findAllPublicUsers();
  return generateSitemapXML(users);
}
```

### Image Optimization
1. Generate OpenGraph images for resume pages
2. Use CDN for image delivery
3. Implement lazy loading for images

### Internationalization (i18n)
1. Add hreflang tags for multi-language support
2. Create language-specific sitemaps
3. Implement geo-targeting in Search Console

### Performance Optimization
1. Implement Server-Side Rendering (SSR) for critical pages
2. Use prerendering for static resume pages
3. Implement service workers for offline support

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
