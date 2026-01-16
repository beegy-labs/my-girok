/**
 * Structured Data (JSON-LD) generators for SEO
 * @see https://schema.org/
 */

export interface PersonSchema {
  name: string;
  jobTitle?: string;
  email?: string;
  telephone?: string;
  url?: string;
  image?: string;
  description?: string;
  alumniOf?: string[];
  worksFor?: {
    name: string;
    url?: string;
  }[];
}

/**
 * Generate Person schema for resume pages
 * @see https://schema.org/Person
 */
export const generatePersonSchema = (person: PersonSchema) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    ...(person.jobTitle && { jobTitle: person.jobTitle }),
    ...(person.email && { email: person.email }),
    ...(person.telephone && { telephone: person.telephone }),
    ...(person.url && { url: person.url }),
    ...(person.image && { image: person.image }),
    ...(person.description && { description: person.description }),
    ...(person.alumniOf &&
      person.alumniOf.length > 0 && {
        alumniOf: person.alumniOf.map((school) => ({
          '@type': 'EducationalOrganization',
          name: school,
        })),
      }),
    ...(person.worksFor &&
      person.worksFor.length > 0 && {
        worksFor: person.worksFor.map((org) => ({
          '@type': 'Organization',
          name: org.name,
          ...(org.url && { url: org.url }),
        })),
      }),
  };
};

/**
 * Generate Organization schema for company pages
 * @see https://schema.org/Organization
 */
export const generateOrganizationSchema = () => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'My-Girok',
    url: 'https://www.mygirok.com',
    logo: 'https://www.mygirok.com/logo.png',
    description:
      'Professional resume and career management platform. Create, manage, and share your professional profile.',
    sameAs: [
      'https://twitter.com/mygirok',
      'https://linkedin.com/company/mygirok',
      'https://github.com/beegy-labs/my-girok',
    ],
  };
};

/**
 * Generate WebSite schema for homepage
 * @see https://schema.org/WebSite
 */
export const generateWebsiteSchema = () => {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'My-Girok',
    url: 'https://www.mygirok.com',
    description:
      'Professional resume and career management platform. Create, manage, and share your professional profile.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://www.mygirok.com/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };
};

/**
 * Generate BreadcrumbList schema for navigation
 * @see https://schema.org/BreadcrumbList
 */
export const generateBreadcrumbSchema = (items: { name: string; url: string }[]) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
};

/**
 * Generate ProfilePage schema for resume pages
 * @see https://schema.org/ProfilePage
 */
export const generateProfilePageSchema = (username: string, name: string, description?: string) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    dateCreated: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    mainEntity: {
      '@type': 'Person',
      name: name,
      url: `https://www.mygirok.com/resume/${username}`,
      ...(description && { description }),
    },
  };
};
