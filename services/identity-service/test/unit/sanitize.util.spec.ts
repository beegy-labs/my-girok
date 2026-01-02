import {
  escapeHtml,
  sanitizeString,
  sanitizeName,
  sanitizeBio,
  sanitizeUrl,
  sanitizeObject,
  stripHtml,
} from '../../src/common/utils/sanitize.util';

describe('Sanitize Utilities', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("XSS")</script>';
      const escaped = escapeHtml(input);

      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
    });

    it('should escape ampersand', () => {
      const input = 'Tom & Jerry';
      const escaped = escapeHtml(input);

      expect(escaped).toBe('Tom &amp; Jerry');
    });

    it('should escape quotes', () => {
      const input = `He said "Hello" and 'Goodbye'`;
      const escaped = escapeHtml(input);

      expect(escaped).toBe('He said &quot;Hello&quot; and &#x27;Goodbye&#x27;');
    });

    it('should escape backticks', () => {
      const input = '`template literal`';
      const escaped = escapeHtml(input);

      expect(escaped).toBe('&#x60;template literal&#x60;');
    });

    it('should escape equals sign', () => {
      const input = 'a=b';
      const escaped = escapeHtml(input);

      expect(escaped).toBe('a&#x3D;b');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });

    it('should leave safe strings unchanged', () => {
      const input = 'Hello World 123';
      const escaped = escapeHtml(input);

      expect(escaped).toBe('Hello World 123');
    });
  });

  describe('sanitizeString', () => {
    it('should escape HTML by default', () => {
      const input = '<script>alert("XSS")</script>';
      const sanitized = sanitizeString(input);

      expect(sanitized).not.toContain('<script>');
    });

    it('should trim whitespace by default', () => {
      const input = '  hello world  ';
      const sanitized = sanitizeString(input);

      expect(sanitized).toBe('hello world');
    });

    it('should truncate to maxLength', () => {
      const input = 'This is a very long string';
      const sanitized = sanitizeString(input, { maxLength: 10 });

      expect(sanitized).toBe('This is a ');
      expect(sanitized.length).toBe(10);
    });

    it('should preserve newlines by default', () => {
      const input = 'line1\nline2\r\nline3';
      const sanitized = sanitizeString(input);

      expect(sanitized).toContain('\n');
      expect(sanitized).toContain('\r\n');
    });

    it('should remove newlines when allowNewlines is false', () => {
      const input = 'line1\nline2\r\nline3';
      const sanitized = sanitizeString(input, { allowNewlines: false });

      expect(sanitized).toBe('line1 line2 line3');
    });

    it('should skip HTML escaping when disabled', () => {
      const input = '<b>bold</b>';
      const sanitized = sanitizeString(input, { escapeHtml: false });

      expect(sanitized).toBe('<b>bold</b>');
    });

    it('should skip trim when disabled', () => {
      const input = '  spaced  ';
      const sanitized = sanitizeString(input, { trimWhitespace: false });

      expect(sanitized).toBe('  spaced  ');
    });

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
    });
  });

  describe('sanitizeName', () => {
    it('should escape HTML in name', () => {
      const input = '<script>alert("XSS")</script>Test User';
      const sanitized = sanitizeName(input);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Test User');
    });

    it('should trim whitespace', () => {
      const input = '  John Doe  ';
      const sanitized = sanitizeName(input);

      expect(sanitized).toBe('John Doe');
    });

    it('should truncate to maxLength', () => {
      const longName = 'A'.repeat(150);
      const sanitized = sanitizeName(longName);

      expect(sanitized.length).toBe(100);
    });

    it('should allow custom maxLength', () => {
      const input = 'John Doe';
      const sanitized = sanitizeName(input, 5);

      expect(sanitized).toBe('John ');
    });

    it('should handle Unicode characters', () => {
      const input = '홍길동';
      const sanitized = sanitizeName(input);

      expect(sanitized).toBe('홍길동');
    });

    it('should handle empty string', () => {
      expect(sanitizeName('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(sanitizeName(null)).toBe('');
      expect(sanitizeName(undefined)).toBe('');
    });
  });

  describe('sanitizeBio', () => {
    it('should escape HTML in bio', () => {
      const input = '<img src=x onerror=alert("XSS")>Bio content';
      const sanitized = sanitizeBio(input);

      expect(sanitized).not.toContain('<img');
    });

    it('should preserve newlines', () => {
      const input = 'Line 1\nLine 2\nLine 3';
      const sanitized = sanitizeBio(input);

      expect(sanitized).toContain('\n');
    });

    it('should truncate to default 500 chars', () => {
      const longBio = 'A'.repeat(600);
      const sanitized = sanitizeBio(longBio);

      expect(sanitized.length).toBe(500);
    });

    it('should allow custom maxLength', () => {
      const input = 'Short bio';
      const sanitized = sanitizeBio(input, 5);

      expect(sanitized).toBe('Short');
    });

    it('should handle empty string', () => {
      expect(sanitizeBio('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(sanitizeBio(null)).toBe('');
      expect(sanitizeBio(undefined)).toBe('');
    });
  });

  describe('sanitizeUrl', () => {
    it('should accept valid HTTP URLs', () => {
      const input = 'http://example.com/path';
      const sanitized = sanitizeUrl(input);

      expect(sanitized).toBe('http://example.com/path');
    });

    it('should accept valid HTTPS URLs', () => {
      const input = 'https://example.com/path?query=value';
      const sanitized = sanitizeUrl(input);

      expect(sanitized).toBe('https://example.com/path?query=value');
    });

    it('should reject javascript: protocol', () => {
      const input = 'javascript:alert("XSS")';
      const sanitized = sanitizeUrl(input);

      expect(sanitized).toBe('');
    });

    it('should reject data: protocol', () => {
      const input = 'data:text/html,<script>alert("XSS")</script>';
      const sanitized = sanitizeUrl(input);

      expect(sanitized).toBe('');
    });

    it('should reject file: protocol', () => {
      const input = 'file:///etc/passwd';
      const sanitized = sanitizeUrl(input);

      expect(sanitized).toBe('');
    });

    it('should reject invalid URLs', () => {
      const input = 'not a url';
      const sanitized = sanitizeUrl(input);

      expect(sanitized).toBe('');
    });

    it('should trim whitespace', () => {
      const input = '  https://example.com  ';
      const sanitized = sanitizeUrl(input);

      expect(sanitized).toBe('https://example.com/');
    });

    it('should handle empty string', () => {
      expect(sanitizeUrl('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(sanitizeUrl(null)).toBe('');
      expect(sanitizeUrl(undefined)).toBe('');
    });
  });

  describe('sanitizeObject', () => {
    it('should escape string values in object', () => {
      const obj = {
        name: '<script>alert("XSS")</script>',
        age: 25,
      };

      const sanitized = sanitizeObject(obj);

      expect(sanitized.name).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
      expect(sanitized.age).toBe(25);
    });

    it('should handle nested objects', () => {
      const obj = {
        user: {
          name: '<b>Test</b>',
          profile: {
            bio: '<script>bad</script>',
          },
        },
      };

      const sanitized = sanitizeObject(obj);

      expect((sanitized.user as Record<string, unknown>).name).toBe('&lt;b&gt;Test&lt;&#x2F;b&gt;');
      expect(
        ((sanitized.user as Record<string, unknown>).profile as Record<string, unknown>).bio,
      ).toBe('&lt;script&gt;bad&lt;&#x2F;script&gt;');
    });

    it('should preserve non-string values', () => {
      const obj = {
        count: 42,
        active: true,
        data: null,
        tags: ['tag1', 'tag2'],
      };

      const sanitized = sanitizeObject(obj);

      expect(sanitized.count).toBe(42);
      expect(sanitized.active).toBe(true);
      expect(sanitized.data).toBe(null);
      expect(sanitized.tags).toEqual(['tag1', 'tag2']);
    });

    it('should handle empty object', () => {
      const sanitized = sanitizeObject({});

      expect(sanitized).toEqual({});
    });

    it('should handle null/undefined', () => {
      expect(sanitizeObject(null as unknown as Record<string, unknown>)).toBe(null);
      expect(sanitizeObject(undefined as unknown as Record<string, unknown>)).toBe(undefined);
    });

    it('should handle non-object input', () => {
      expect(sanitizeObject('string' as unknown as Record<string, unknown>)).toBe('string');
      expect(sanitizeObject(123 as unknown as Record<string, unknown>)).toBe(123);
    });
  });

  describe('stripHtml', () => {
    it('should remove all HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const stripped = stripHtml(input);

      expect(stripped).toBe('Hello World');
    });

    it('should remove script tags and content', () => {
      const input = '<script>alert("XSS")</script>Safe content';
      const stripped = stripHtml(input);

      expect(stripped).toBe('Safe content');
    });

    it('should remove self-closing tags', () => {
      const input = 'Hello<br/>World<img src="x"/>';
      const stripped = stripHtml(input);

      expect(stripped).toBe('HelloWorld');
    });

    it('should remove tags with attributes', () => {
      const input = '<a href="http://evil.com" onclick="steal()">Click me</a>';
      const stripped = stripHtml(input);

      expect(stripped).toBe('Click me');
    });

    it('should trim result', () => {
      const input = '  <p>Content</p>  ';
      const stripped = stripHtml(input);

      expect(stripped).toBe('Content');
    });

    it('should handle empty string', () => {
      expect(stripHtml('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(stripHtml(null)).toBe('');
      expect(stripHtml(undefined)).toBe('');
    });

    it('should leave plain text unchanged', () => {
      const input = 'Just plain text';
      const stripped = stripHtml(input);

      expect(stripped).toBe('Just plain text');
    });
  });
});
