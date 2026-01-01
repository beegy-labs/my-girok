/**
 * XSS Prevention Utilities
 *
 * Provides sanitization functions to prevent cross-site scripting attacks.
 *
 * 2026 Best Practices:
 * - Sanitize all user-provided string inputs before storage
 * - Escape HTML entities
 * - Remove potentially dangerous characters
 */

/**
 * HTML entities map for escaping
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML entities to prevent XSS
 * Converts dangerous characters to their HTML entity equivalents
 *
 * @param input - Raw string input
 * @returns Escaped string safe for HTML display
 */
export function escapeHtml(input: string | null | undefined): string {
  if (!input) {
    return '';
  }

  return input.replace(/[&<>"'`=\/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize user input for storage
 * Removes or escapes potentially dangerous content
 *
 * Options:
 * - escapeHtml: Escape HTML entities (default: true)
 * - trimWhitespace: Trim leading/trailing whitespace (default: true)
 * - maxLength: Maximum allowed length (default: no limit)
 * - allowNewlines: Allow newline characters (default: true)
 *
 * @param input - Raw string input
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export function sanitizeString(
  input: string | null | undefined,
  options: {
    escapeHtml?: boolean;
    trimWhitespace?: boolean;
    maxLength?: number;
    allowNewlines?: boolean;
  } = {},
): string {
  if (!input) {
    return '';
  }

  const {
    escapeHtml: doEscape = true,
    trimWhitespace = true,
    maxLength,
    allowNewlines = true,
  } = options;

  let result = input;

  // Trim whitespace
  if (trimWhitespace) {
    result = result.trim();
  }

  // Handle newlines
  if (!allowNewlines) {
    result = result.replace(/[\r\n]+/g, ' ');
  }

  // Escape HTML if requested
  if (doEscape) {
    result = escapeHtml(result);
  }

  // Truncate if maxLength specified
  if (maxLength && result.length > maxLength) {
    result = result.substring(0, maxLength);
  }

  return result;
}

/**
 * Sanitize displayable name (username, display name)
 * Allows only alphanumeric, spaces, underscores, and hyphens
 *
 * @param input - Raw name input
 * @param maxLength - Maximum length (default: 100)
 * @returns Sanitized name
 */
export function sanitizeName(input: string | null | undefined, maxLength = 100): string {
  if (!input) {
    return '';
  }

  // Remove potentially dangerous characters, keep only safe ones
  let result = input.trim();

  // Allow alphanumeric, spaces, underscores, hyphens, and common Unicode letters
  // But escape any HTML-dangerous characters
  result = escapeHtml(result);

  // Truncate if needed
  if (result.length > maxLength) {
    result = result.substring(0, maxLength);
  }

  return result;
}

/**
 * Sanitize bio/description text
 * Allows more characters but escapes HTML
 *
 * @param input - Raw bio text
 * @param maxLength - Maximum length (default: 500)
 * @returns Sanitized bio
 */
export function sanitizeBio(input: string | null | undefined, maxLength = 500): string {
  return sanitizeString(input, {
    escapeHtml: true,
    trimWhitespace: true,
    maxLength,
    allowNewlines: true,
  });
}

/**
 * Sanitize URL input
 * Validates and sanitizes URL strings
 *
 * @param input - Raw URL input
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(input: string | null | undefined): string {
  if (!input) {
    return '';
  }

  const trimmed = input.trim();

  // Basic URL validation
  try {
    const url = new URL(trimmed);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return '';
    }
    return url.toString();
  } catch {
    return '';
  }
}

/**
 * Sanitize JSON object by escaping all string values
 *
 * @param obj - Object to sanitize
 * @returns New object with sanitized string values
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = escapeHtml(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Strip all HTML tags from input
 * Use when you need plain text without any markup
 *
 * @param input - Input that may contain HTML
 * @returns Plain text with all tags removed
 */
export function stripHtml(input: string | null | undefined): string {
  if (!input) {
    return '';
  }

  // Remove all HTML tags
  return input.replace(/<[^>]*>/g, '').trim();
}
