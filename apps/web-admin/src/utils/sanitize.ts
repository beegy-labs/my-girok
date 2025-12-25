// apps/web-admin/src/utils/sanitize.ts

/**
 * Sanitize search input to prevent XSS and limit length
 */
export function sanitizeSearchInput(input: string): string {
  return input
    .trim()
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick=, onerror=, etc.)
    .slice(0, 100); // Limit length
}

/**
 * Sanitize text for safe display (prevent XSS in rendered content)
 */
export function sanitizeForDisplay(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}

/**
 * Validate and sanitize slug format
 */
export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

/**
 * Sanitize URL using whitelist approach (more secure than blacklist)
 * Only allows http://, https://, and relative paths
 * Returns null for invalid/dangerous URLs
 */
export function sanitizeUrl(input: string): string | null {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // Whitelist approach - only allow safe protocols
  const isHttps = lower.startsWith('https://');
  const isHttp = lower.startsWith('http://');
  const isRelative = trimmed.startsWith('/') && !trimmed.startsWith('//');
  const isHashLink = trimmed.startsWith('#');

  if (!isHttps && !isHttp && !isRelative && !isHashLink) {
    return null;
  }

  // Additional check for embedded javascript in URL
  if (lower.includes('javascript:') || lower.includes('data:') || lower.includes('vbscript:')) {
    return null;
  }

  return trimmed;
}

/**
 * Truncate UUID for display (e.g., "abc12345-..." from "abc12345-1234-5678-9abc-def012345678")
 */
export function truncateUuid(uuid: string, length = 8): string {
  if (!uuid || uuid.length <= length) return uuid;
  return `${uuid.slice(0, length)}...`;
}

/**
 * Format date for admin table display
 * Shows date without year if current year, otherwise shows full date
 */
export function formatAdminDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const isCurrentYear = d.getFullYear() === now.getFullYear();

  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(isCurrentYear ? {} : { year: 'numeric' }),
  });
}
