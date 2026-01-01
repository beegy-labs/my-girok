import {
  maskEmail,
  maskPhone,
  maskIpAddress,
  maskName,
  maskPiiFields,
  DEFAULT_PII_MASKING_CONFIG,
} from '../../src/common/utils/pii-masking.util';

describe('PII Masking Utilities', () => {
  describe('maskEmail', () => {
    it('should mask standard email address', () => {
      expect(maskEmail('john.doe@example.com')).toBe('j***@e***.com');
    });

    it('should mask email with subdomain', () => {
      expect(maskEmail('user@mail.example.co.kr')).toBe('u***@m***.example.co.kr');
    });

    it('should handle single character local part', () => {
      expect(maskEmail('a@example.com')).toBe('a***@e***.com');
    });

    it('should handle single character domain', () => {
      expect(maskEmail('test@a.com')).toBe('t***@a***.com');
    });

    it('should return *** for null input', () => {
      expect(maskEmail(null)).toBe('***');
    });

    it('should return *** for undefined input', () => {
      expect(maskEmail(undefined)).toBe('***');
    });

    it('should return *** for empty string', () => {
      expect(maskEmail('')).toBe('***');
    });

    it('should return *** for invalid email (no @)', () => {
      expect(maskEmail('invalid-email')).toBe('***');
    });

    it('should handle email without domain extension', () => {
      expect(maskEmail('user@localhost')).toBe('u***@l***');
    });
  });

  describe('maskPhone', () => {
    it('should mask Korean phone number with dashes', () => {
      expect(maskPhone('010-1234-5678')).toBe('010-****-5678');
    });

    it('should mask international phone number', () => {
      expect(maskPhone('+82-10-1234-5678')).toBe('+82-****-****-5678');
    });

    it('should mask phone number without separators', () => {
      expect(maskPhone('01012345678')).toBe('010****5678');
    });

    it('should return *** for null input', () => {
      expect(maskPhone(null)).toBe('***');
    });

    it('should return *** for undefined input', () => {
      expect(maskPhone(undefined)).toBe('***');
    });

    it('should return *** for empty string', () => {
      expect(maskPhone('')).toBe('***');
    });

    it('should return *** for very short phone', () => {
      expect(maskPhone('123')).toBe('***');
    });

    it('should handle phone with spaces', () => {
      expect(maskPhone('010 1234 5678')).toBe('010-****-5678');
    });

    it('should handle landline format', () => {
      expect(maskPhone('02-123-4567')).toBe('02-****-4567');
    });
  });

  describe('maskIpAddress', () => {
    it('should mask IPv4 address', () => {
      expect(maskIpAddress('192.168.1.100')).toBe('192.168.***');
    });

    it('should mask private IPv4', () => {
      expect(maskIpAddress('10.0.0.1')).toBe('10.0.***');
    });

    it('should mask IPv6 address', () => {
      expect(maskIpAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe('2001:0db8:***');
    });

    it('should return *** for null input', () => {
      expect(maskIpAddress(null)).toBe('***');
    });

    it('should return *** for undefined input', () => {
      expect(maskIpAddress(undefined)).toBe('***');
    });

    it('should return *** for empty string', () => {
      expect(maskIpAddress('')).toBe('***');
    });

    it('should return *** for invalid IP', () => {
      expect(maskIpAddress('invalid-ip')).toBe('***');
    });

    it('should handle localhost IPv4', () => {
      expect(maskIpAddress('127.0.0.1')).toBe('127.0.***');
    });
  });

  describe('maskName', () => {
    it('should mask full name', () => {
      expect(maskName('John Doe')).toBe('J*** D***');
    });

    it('should mask Korean name', () => {
      expect(maskName('김철수')).toBe('김***');
    });

    it('should mask single name', () => {
      expect(maskName('Alice')).toBe('A***');
    });

    it('should mask name with multiple parts', () => {
      expect(maskName('John Michael Doe')).toBe('J*** M*** D***');
    });

    it('should return *** for null input', () => {
      expect(maskName(null)).toBe('***');
    });

    it('should return *** for undefined input', () => {
      expect(maskName(undefined)).toBe('***');
    });

    it('should return *** for empty string', () => {
      expect(maskName('')).toBe('***');
    });

    it('should handle extra whitespace', () => {
      expect(maskName('John   Doe')).toBe('J*** D***');
    });
  });

  describe('maskPiiFields', () => {
    it('should mask all default PII fields', () => {
      const obj = {
        email: 'test@example.com',
        phone: '010-1234-5678',
        ipAddress: '192.168.1.100',
        name: 'John Doe',
        otherField: 'unchanged',
      };

      const result = maskPiiFields(obj);

      expect(result.email).toBe('t***@e***.com');
      expect(result.phone).toBe('010-****-5678');
      expect(result.ipAddress).toBe('192.168.***');
      expect(result.name).toBe('J*** D***');
      expect(result.otherField).toBe('unchanged');
    });

    it('should mask custom fields when specified', () => {
      const obj = {
        userEmail: 'test@example.com',
        userPhone: '010-1234-5678',
      };

      const result = maskPiiFields(obj, ['userEmail', 'userPhone']);

      expect(result.userEmail).toBe('t***@e***.com');
      expect(result.userPhone).toBe('010-****-5678');
    });

    it('should not modify original object', () => {
      const obj = {
        email: 'test@example.com',
      };

      const result = maskPiiFields(obj);

      expect(obj.email).toBe('test@example.com');
      expect(result.email).toBe('t***@e***.com');
    });

    it('should handle object with no PII fields', () => {
      const obj = {
        id: '123',
        status: 'active',
      };

      const result = maskPiiFields(obj);

      expect(result).toEqual(obj);
    });

    it('should handle null/undefined values in fields', () => {
      const obj = {
        email: null as string | null,
        phone: undefined as string | undefined,
        name: 'Test',
      };

      const result = maskPiiFields(obj as Record<string, unknown>);

      expect(result.email).toBeNull();
      expect(result.phone).toBeUndefined();
      expect(result.name).toBe('T***');
    });

    it('should handle phoneNumber field variation', () => {
      const obj = {
        phoneNumber: '010-1234-5678',
      };

      const result = maskPiiFields(obj);

      expect(result.phoneNumber).toBe('010-****-5678');
    });

    it('should handle phone_number snake_case field', () => {
      const obj = {
        phone_number: '010-1234-5678',
      };

      const result = maskPiiFields(obj);

      expect(result.phone_number).toBe('010-****-5678');
    });

    it('should handle ip_address snake_case field', () => {
      const obj = {
        ip_address: '192.168.1.100',
      };

      const result = maskPiiFields(obj);

      expect(result.ip_address).toBe('192.168.***');
    });
  });

  describe('DEFAULT_PII_MASKING_CONFIG', () => {
    it('should have expected body fields', () => {
      expect(DEFAULT_PII_MASKING_CONFIG.bodyFields).toContain('email');
      expect(DEFAULT_PII_MASKING_CONFIG.bodyFields).toContain('phone');
      expect(DEFAULT_PII_MASKING_CONFIG.bodyFields).toContain('phoneNumber');
      expect(DEFAULT_PII_MASKING_CONFIG.bodyFields).toContain('name');
      expect(DEFAULT_PII_MASKING_CONFIG.bodyFields).toContain('ipAddress');
    });

    it('should have expected query fields', () => {
      expect(DEFAULT_PII_MASKING_CONFIG.queryFields).toContain('email');
      expect(DEFAULT_PII_MASKING_CONFIG.queryFields).toContain('phone');
    });

    it('should have autoDetect enabled', () => {
      expect(DEFAULT_PII_MASKING_CONFIG.autoDetect).toBe(true);
    });

    it('should have empty param fields', () => {
      expect(DEFAULT_PII_MASKING_CONFIG.paramFields).toEqual([]);
    });
  });
});
