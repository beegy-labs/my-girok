import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  sanitizeString,
  sanitizeName,
  sanitizeBio,
  sanitizeUrl,
  sanitizeObject,
  stripHtml,
} from './sanitize.util';

describe('SanitizeUtil', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;',
      );
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape quotes', () => {
      expect(escapeHtml('He said "hello"')).toBe('He said &quot;hello&quot;');
      expect(escapeHtml("It's fine")).toBe('It&#x27;s fine');
    });

    it('should escape backticks', () => {
      expect(escapeHtml('`code`')).toBe('&#x60;code&#x60;');
    });

    it('should handle null and undefined', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should preserve safe characters', () => {
      expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
    });
  });

  describe('sanitizeString', () => {
    it('should escape HTML and trim whitespace', () => {
      expect(sanitizeString('  <b>Hello</b>  ')).toBe('&lt;b&gt;Hello&lt;&#x2F;b&gt;');
    });

    it('should truncate to max length', () => {
      expect(sanitizeString('Hello World', { maxLength: 5 })).toBe('Hello');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
    });
  });

  describe('sanitizeName', () => {
    it('should sanitize and limit name length', () => {
      const longName = 'A'.repeat(150);
      expect(sanitizeName(longName).length).toBeLessThanOrEqual(100);
    });

    it('should escape HTML in names', () => {
      expect(sanitizeName('<script>alert(1)</script>')).toBe(
        '&lt;script&gt;alert(1)&lt;&#x2F;script&gt;',
      );
    });

    it('should allow custom max length', () => {
      expect(sanitizeName('Hello World', 5)).toBe('Hello');
    });
  });

  describe('sanitizeBio', () => {
    it('should sanitize and limit bio length', () => {
      const longBio = 'A'.repeat(600);
      expect(sanitizeBio(longBio).length).toBeLessThanOrEqual(500);
    });

    it('should escape HTML in bio', () => {
      expect(sanitizeBio('I love <b>coding</b>')).toBe('I love &lt;b&gt;coding&lt;&#x2F;b&gt;');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow http URLs', () => {
      // Note: URL() normalizes to add trailing slash
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
    });

    it('should allow https URLs', () => {
      expect(sanitizeUrl('https://example.com/path?query=1')).toBe(
        'https://example.com/path?query=1',
      );
    });

    it('should block javascript URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    });

    it('should block data URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    });

    it('should block vbscript URLs', () => {
      expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeUrl(null)).toBe('');
      expect(sanitizeUrl(undefined)).toBe('');
    });

    it('should return empty for relative URLs (only absolute URLs allowed)', () => {
      // sanitizeUrl uses URL() which requires absolute URLs with protocol
      expect(sanitizeUrl('/path/to/resource')).toBe('');
    });

    it('should handle URLs with encoded characters', () => {
      expect(sanitizeUrl('https://example.com/%3Cscript%3E')).toBe(
        'https://example.com/%3Cscript%3E',
      );
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string values in object', () => {
      const input = {
        name: '<script>alert(1)</script>',
        bio: 'Hello <b>World</b>',
        age: 25,
        nested: {
          value: '<img src=x onerror=alert(1)>',
        },
      };

      const result = sanitizeObject(input);

      expect(result.name).toBe('&lt;script&gt;alert(1)&lt;&#x2F;script&gt;');
      expect(result.bio).toBe('Hello &lt;b&gt;World&lt;&#x2F;b&gt;');
      expect(result.age).toBe(25);
      expect(result.nested.value).toBe('&lt;img src&#x3D;x onerror&#x3D;alert(1)&gt;');
    });

    it('should handle arrays', () => {
      const input = {
        tags: ['<script>', 'normal', '<b>bold</b>'],
      };

      const result = sanitizeObject(input);

      expect(result.tags).toEqual(['&lt;script&gt;', 'normal', '&lt;b&gt;bold&lt;&#x2F;b&gt;']);
    });

    it('should handle null values', () => {
      const input = {
        name: null,
        bio: 'test',
      };

      const result = sanitizeObject(input);

      expect(result.name).toBeNull();
      expect(result.bio).toBe('test');
    });

    it('should return non-objects as-is', () => {
      expect(sanitizeObject('string' as never)).toBe('string');
      expect(sanitizeObject(123 as never)).toBe(123);
      expect(sanitizeObject(null as never)).toBeNull();
    });
  });

  describe('stripHtml', () => {
    it('should remove HTML tags', () => {
      expect(stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World');
    });

    it('should remove script tags and content', () => {
      expect(stripHtml('<script>alert(1)</script>Hello')).toBe('Hello');
    });

    it('should handle nested tags', () => {
      expect(stripHtml('<div><span><a href="#">Link</a></span></div>')).toBe('Link');
    });

    it('should handle null and undefined', () => {
      expect(stripHtml(null)).toBe('');
      expect(stripHtml(undefined)).toBe('');
    });

    it('should preserve text content', () => {
      expect(stripHtml('Plain text without HTML')).toBe('Plain text without HTML');
    });

    it('should handle malformed HTML', () => {
      expect(stripHtml('<div>Unclosed')).toBe('Unclosed');
      expect(stripHtml('Text<br>with<br/>breaks')).toBe('Textwithbreaks');
    });
  });
});
