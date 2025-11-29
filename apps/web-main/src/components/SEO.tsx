import { Helmet } from 'react-helmet-async';

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  twitterCard?: 'summary' | 'summary_large_image';
  noindex?: boolean;
  nofollow?: boolean;
  canonicalUrl?: string;
  structuredData?: Record<string, unknown>;
}

const defaultSEO = {
  title: 'My-Girok - Professional Resume & Career Management Platform',
  description:
    'Create, manage, and share your professional resume with My-Girok. Build your career profile, track your achievements, and share your professional story with the world.',
  keywords: [
    'resume',
    'cv',
    'curriculum vitae',
    'career',
    'professional profile',
    'job search',
    'portfolio',
    'career management',
  ],
  author: 'My-Girok',
  image: '/og-image.png',
  url: 'https://www.mygirok.com',
  type: 'website' as const,
  twitterCard: 'summary_large_image' as const,
};

export const SEO: React.FC<SEOProps> = ({
  title,
  description = defaultSEO.description,
  keywords = defaultSEO.keywords,
  author = defaultSEO.author,
  image = defaultSEO.image,
  url = defaultSEO.url,
  type = defaultSEO.type,
  twitterCard = defaultSEO.twitterCard,
  noindex = false,
  nofollow = false,
  canonicalUrl,
  structuredData,
}) => {
  const fullTitle = title ? `${title} | My-Girok` : defaultSEO.title;
  const fullImageUrl = image.startsWith('http') ? image : `${defaultSEO.url}${image}`;

  const robotsContent = [
    noindex ? 'noindex' : 'index',
    nofollow ? 'nofollow' : 'follow',
  ].join(', ');

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      <meta name="author" content={author} />
      <meta name="robots" content={robotsContent} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph Meta Tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content="My-Girok" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />
      <meta name="twitter:site" content="@mygirok" />
      <meta name="twitter:creator" content="@mygirok" />

      {/* Additional Meta Tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="language" content="English" />

      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};
