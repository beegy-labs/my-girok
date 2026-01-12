import { describe, it, expect } from 'vitest';
import {
  PRIVACY_PRESET_RULES,
  PII_DETECTION_PATTERNS,
  DEFAULT_PRIVACY_SETTINGS,
} from './privacy-rules.config';

describe('Privacy Rules Configuration', () => {
  describe('PRIVACY_PRESET_RULES', () => {
    it('should export an array of preset rules', () => {
      expect(Array.isArray(PRIVACY_PRESET_RULES)).toBe(true);
      expect(PRIVACY_PRESET_RULES.length).toBeGreaterThan(0);
    });

    it('should have all required fields for each preset rule', () => {
      PRIVACY_PRESET_RULES.forEach((rule) => {
        expect(rule).toHaveProperty('label');
        expect(rule).toHaveProperty('selector');
        expect(rule).toHaveProperty('maskType');
        expect(typeof rule.label).toBe('string');
        expect(typeof rule.selector).toBe('string');
        expect(['block', 'blur', 'redact']).toContain(rule.maskType);
      });
    });

    it('should include common sensitive field presets', () => {
      const labels = PRIVACY_PRESET_RULES.map((r) => r.label);
      expect(labels).toContain('Passwords');
      expect(labels).toContain('Email Fields');
      expect(labels).toContain('Credit Card Fields');
      expect(labels).toContain('SSN Fields');
    });

    it('should use valid CSS selectors', () => {
      PRIVACY_PRESET_RULES.forEach((rule) => {
        expect(rule.selector.length).toBeGreaterThan(0);
        // Basic validation: should not be empty and should be a string
        expect(typeof rule.selector).toBe('string');
      });
    });

    it('should use appropriate mask types for sensitive data', () => {
      const passwordRule = PRIVACY_PRESET_RULES.find((r) => r.label === 'Passwords');
      const creditCardRule = PRIVACY_PRESET_RULES.find((r) => r.label === 'Credit Card Fields');
      const ssnRule = PRIVACY_PRESET_RULES.find((r) => r.label === 'SSN Fields');

      // Passwords, credit cards, and SSN should be blocked (most secure)
      expect(passwordRule?.maskType).toBe('block');
      expect(creditCardRule?.maskType).toBe('block');
      expect(ssnRule?.maskType).toBe('block');
    });
  });

  describe('PII_DETECTION_PATTERNS', () => {
    it('should export patterns for common PII types', () => {
      expect(PII_DETECTION_PATTERNS).toHaveProperty('email');
      expect(PII_DETECTION_PATTERNS).toHaveProperty('phone');
      expect(PII_DETECTION_PATTERNS).toHaveProperty('creditCard');
      expect(PII_DETECTION_PATTERNS).toHaveProperty('ssn');
    });

    it('should have valid regex patterns', () => {
      Object.values(PII_DETECTION_PATTERNS).forEach((pattern) => {
        expect(pattern.pattern).toBeInstanceOf(RegExp);
        expect(typeof pattern.label).toBe('string');
        expect(typeof pattern.description).toBe('string');
      });
    });

    it('should detect valid email addresses', () => {
      const emailPattern = PII_DETECTION_PATTERNS.email.pattern;

      expect('test@example.com'.match(emailPattern)).toBeTruthy();
      expect('user.name+tag@example.co.uk'.match(emailPattern)).toBeTruthy();
      expect('not-an-email'.match(emailPattern)).toBeFalsy();
    });

    it('should detect valid phone numbers', () => {
      const phonePattern = PII_DETECTION_PATTERNS.phone.pattern;

      expect('123-456-7890'.match(phonePattern)).toBeTruthy();
      expect('1234567890'.match(phonePattern)).toBeTruthy();
      expect('123.456.7890'.match(phonePattern)).toBeTruthy();
      expect('12345'.match(phonePattern)).toBeFalsy();
    });

    it('should detect valid credit card numbers', () => {
      const ccPattern = PII_DETECTION_PATTERNS.creditCard.pattern;

      expect('1234-5678-9012-3456'.match(ccPattern)).toBeTruthy();
      expect('1234 5678 9012 3456'.match(ccPattern)).toBeTruthy();
      expect('1234567890123456'.match(ccPattern)).toBeTruthy();
      expect('1234'.match(ccPattern)).toBeFalsy();
    });

    it('should detect valid SSN format', () => {
      const ssnPattern = PII_DETECTION_PATTERNS.ssn.pattern;

      expect('123-45-6789'.match(ssnPattern)).toBeTruthy();
      expect('12345678'.match(ssnPattern)).toBeFalsy();
      expect('123456789'.match(ssnPattern)).toBeFalsy();
    });
  });

  describe('DEFAULT_PRIVACY_SETTINGS', () => {
    it('should have enablePiiDetection enabled by default', () => {
      expect(DEFAULT_PRIVACY_SETTINGS.enablePiiDetection).toBe(true);
    });

    it('should include essential patterns in enabledPatterns', () => {
      expect(Array.isArray(DEFAULT_PRIVACY_SETTINGS.enabledPatterns)).toBe(true);
      expect(DEFAULT_PRIVACY_SETTINGS.enabledPatterns).toContain('email');
      expect(DEFAULT_PRIVACY_SETTINGS.enabledPatterns).toContain('phone');
      expect(DEFAULT_PRIVACY_SETTINGS.enabledPatterns).toContain('creditCard');
    });

    it('should have a valid default mask type', () => {
      expect(['block', 'blur', 'redact']).toContain(DEFAULT_PRIVACY_SETTINGS.defaultMaskType);
    });

    it('should use redact as default mask type for balance between security and usability', () => {
      expect(DEFAULT_PRIVACY_SETTINGS.defaultMaskType).toBe('redact');
    });
  });

  describe('Configuration Integration', () => {
    it('should have consistent structure across presets and patterns', () => {
      // Verify that all preset rules reference valid mask types
      const validMaskTypes = ['block', 'blur', 'redact'];

      PRIVACY_PRESET_RULES.forEach((rule) => {
        expect(validMaskTypes).toContain(rule.maskType);
      });
    });

    it('should provide comprehensive PII coverage', () => {
      // Ensure we have presets for all major PII pattern types
      const patternTypes = Object.keys(PII_DETECTION_PATTERNS);

      patternTypes.forEach((type) => {
        // Should have either a direct preset or be covered by pattern detection
        const hasDirectPreset = PRIVACY_PRESET_RULES.some((rule) =>
          rule.label.toLowerCase().includes(type.toLowerCase()),
        );
        const hasPatternDetection = DEFAULT_PRIVACY_SETTINGS.enablePiiDetection;

        expect(hasDirectPreset || hasPatternDetection).toBe(true);
      });
    });
  });
});
