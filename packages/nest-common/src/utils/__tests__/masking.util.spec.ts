import {
  maskEmail,
  maskPhone,
  maskName,
  maskUuid,
  maskIpAddress,
  maskCreditCard,
  maskBirthDate,
  maskAddress,
  maskText,
  maskObject,
  createMaskedUserLog,
  DEFAULT_PII_FIELDS,
} from '../masking.util';

describe('PII Masking Utilities', () => {
  describe('maskEmail', () => {
    it('should mask email address correctly', () => {
      expect(maskEmail('user@example.com')).toBe('u***@example.com');
      expect(maskEmail('john.doe@company.org')).toBe('j***@company.org');
    });

    it('should handle single character local part', () => {
      expect(maskEmail('a@example.com')).toBe('a***@example.com');
    });

    it('should handle long email addresses', () => {
      expect(maskEmail('verylongemail@subdomain.example.com')).toBe('v***@subdomain.example.com');
    });

    it('should return empty string for invalid input', () => {
      expect(maskEmail('')).toBe('');
      expect(maskEmail(null as unknown as string)).toBe('');
      expect(maskEmail(undefined as unknown as string)).toBe('');
    });

    it('should handle email without @ symbol', () => {
      expect(maskEmail('notanemail')).toBe('n********l');
    });
  });

  describe('maskPhone', () => {
    it('should mask international phone numbers', () => {
      expect(maskPhone('+821012345678')).toBe('+820***5678');
      expect(maskPhone('+14155551234')).toBe('+140***1234');
    });

    it('should mask domestic phone numbers', () => {
      expect(maskPhone('01012345678')).toBe('010-***-5678');
      expect(maskPhone('010-1234-5678')).toBe('010-***-5678');
    });

    it('should handle short phone numbers', () => {
      expect(maskPhone('1234')).toBe('****');
      expect(maskPhone('12345678')).toBe('123-***-5678');
    });

    it('should return empty string for invalid input', () => {
      expect(maskPhone('')).toBe('');
      expect(maskPhone(null as unknown as string)).toBe('');
    });

    it('should handle phone numbers with various separators', () => {
      expect(maskPhone('(010) 1234-5678')).toBe('010-***-5678');
      expect(maskPhone('010.1234.5678')).toBe('010-***-5678');
    });
  });

  describe('maskName', () => {
    it('should mask Western names', () => {
      expect(maskName('John Doe')).toBe('J*** D***');
      expect(maskName('Jane Smith')).toBe('J*** S***');
    });

    it('should mask Korean names', () => {
      expect(maskName('김철수')).toBe('김**');
      expect(maskName('홍길동')).toBe('홍**');
      expect(maskName('박')).toBe('박');
    });

    it('should handle single word names', () => {
      expect(maskName('Madonna')).toBe('M***');
      expect(maskName('J')).toBe('J***');
    });

    it('should handle multi-part names', () => {
      expect(maskName('John Michael Doe')).toBe('J*** M*** D***');
    });

    it('should return empty string for invalid input', () => {
      expect(maskName('')).toBe('');
      expect(maskName(null as unknown as string)).toBe('');
    });

    it('should trim whitespace', () => {
      expect(maskName('  John Doe  ')).toBe('J*** D***');
    });
  });

  describe('maskUuid', () => {
    it('should mask UUID showing first and last 4 chars', () => {
      expect(maskUuid('01935c6d-c2d0-7abc-8def-1234567890ab')).toBe('0193****90ab');
    });

    it('should handle UUID without hyphens', () => {
      expect(maskUuid('01935c6dc2d07abc8def1234567890ab')).toBe('0193****90ab');
    });

    it('should handle short UUIDs', () => {
      expect(maskUuid('12345678')).toBe('1234****5678');
      expect(maskUuid('1234567')).toBe('****');
    });

    it('should return empty string for invalid input', () => {
      expect(maskUuid('')).toBe('');
      expect(maskUuid(null as unknown as string)).toBe('');
    });
  });

  describe('maskIpAddress', () => {
    it('should mask IPv4 addresses', () => {
      expect(maskIpAddress('192.168.1.100')).toBe('192.168.x.x');
      expect(maskIpAddress('10.0.0.1')).toBe('10.0.x.x');
    });

    it('should mask IPv6 addresses', () => {
      expect(maskIpAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe('2001:0db8:****:****');
    });

    it('should handle invalid IPv4 format', () => {
      expect(maskIpAddress('192.168')).toBe('x.x.x.x');
    });

    it('should return empty string for invalid input', () => {
      expect(maskIpAddress('')).toBe('');
      expect(maskIpAddress(null as unknown as string)).toBe('');
    });
  });

  describe('maskCreditCard', () => {
    it('should mask credit card numbers (PCI-DSS compliant)', () => {
      expect(maskCreditCard('4111111111111111')).toBe('4111-****-****-1111');
    });

    it('should handle credit card with separators', () => {
      expect(maskCreditCard('4111-1111-1111-1111')).toBe('4111-****-****-1111');
      expect(maskCreditCard('4111 1111 1111 1111')).toBe('4111-****-****-1111');
    });

    it('should handle short card numbers', () => {
      expect(maskCreditCard('1234567')).toBe('****-****-****-****');
    });

    it('should return empty string for invalid input', () => {
      expect(maskCreditCard('')).toBe('');
      expect(maskCreditCard(null as unknown as string)).toBe('');
    });
  });

  describe('maskBirthDate', () => {
    it('should mask birth date showing only year', () => {
      expect(maskBirthDate('1990-05-15')).toBe('1990-**-**');
      expect(maskBirthDate('2000-12-25')).toBe('2000-**-**');
    });

    it('should handle different date formats', () => {
      expect(maskBirthDate('1990/05/15')).toBe('1990-**-**');
    });

    it('should extract year from various formats', () => {
      expect(maskBirthDate('May 15, 1990')).toBe('1990-**-**');
    });

    it('should return masked placeholder for invalid dates', () => {
      expect(maskBirthDate('invalid')).toBe('****-**-**');
    });

    it('should return empty string for invalid input', () => {
      expect(maskBirthDate('')).toBe('');
      expect(maskBirthDate(null as unknown as string)).toBe('');
    });
  });

  describe('maskAddress', () => {
    it('should mask Western addresses', () => {
      expect(maskAddress('123 Main St, Seattle, WA')).toBe('*** Seattle, WA');
    });

    it('should mask Korean addresses', () => {
      expect(maskAddress('서울시 강남구 역삼동 123-45')).toBe('서울시 강남구 ***');
    });

    it('should handle single part addresses', () => {
      expect(maskAddress('123 Main Street')).toBe('123 ***');
    });

    it('should return empty string for invalid input', () => {
      expect(maskAddress('')).toBe('');
      expect(maskAddress(null as unknown as string)).toBe('');
    });
  });

  describe('maskText', () => {
    it('should mask text with default options', () => {
      expect(maskText('sensitive data')).toBe('s************a');
    });

    it('should respect custom options', () => {
      expect(maskText('hello', { showStart: 2, showEnd: 1 })).toBe('he**o');
      expect(maskText('secret', { maskChar: '#' })).toBe('s####t');
    });

    it('should handle short text', () => {
      expect(maskText('ab')).toBe('**');
      expect(maskText('a')).toBe('*');
    });

    it('should return empty string for invalid input', () => {
      expect(maskText('')).toBe('');
      expect(maskText(null as unknown as string)).toBe('');
    });
  });

  describe('maskObject', () => {
    it('should mask PII fields in object', () => {
      const input = {
        email: 'user@example.com',
        name: 'John Doe',
        phone: '+821012345678',
        age: 30,
      };

      const result = maskObject(input);

      expect(result.email).toBe('u***@example.com');
      expect(result.name).toBe('J*** D***');
      expect(result.phone).toBe('+820***5678');
      expect(result.age).toBe(30);
    });

    it('should mask nested objects', () => {
      const input = {
        user: {
          email: 'user@example.com',
          profile: {
            name: 'John Doe',
          },
        },
      };

      const result = maskObject(input);

      expect((result.user as any).email).toBe('u***@example.com');
      expect((result.user as any).profile.name).toBe('J*** D***');
    });

    it('should mask arrays', () => {
      const input = {
        users: [{ email: 'user1@example.com' }, { email: 'user2@example.com' }],
      };

      const result = maskObject(input);

      expect((result.users as any[])[0].email).toBe('u***@example.com');
      expect((result.users as any[])[1].email).toBe('u***@example.com');
    });

    it('should use custom maskers', () => {
      const input = {
        customField: 'secret value',
      };

      const result = maskObject(input, {
        fieldsToMask: ['customField'],
        customMaskers: {
          customField: () => '[REDACTED]',
        },
      });

      expect(result.customField).toBe('[REDACTED]');
    });

    it('should respect maxDepth option', () => {
      const deepObject: Record<string, unknown> = { level: 1, email: 'deep@example.com' };
      let current: Record<string, unknown> = deepObject;
      for (let i = 2; i <= 15; i++) {
        current.nested = { level: i, email: `level${i}@example.com` };
        current = current.nested as Record<string, unknown>;
      }

      const result = maskObject(deepObject, { maxDepth: 5 });

      // First few levels should be masked
      expect(result.email).toBe('d***@example.com');
    });

    it('should handle null and undefined values', () => {
      const input = {
        email: null,
        name: undefined,
        phone: '+821012345678',
      };

      const result = maskObject(input as Record<string, unknown>);

      expect(result.email).toBeNull();
      expect(result.name).toBeUndefined();
      expect(result.phone).toBe('+820***5678');
    });

    it('should preserve Date objects', () => {
      const date = new Date('2024-01-01');
      const input = {
        createdAt: date,
      };

      const result = maskObject(input);

      expect(result.createdAt).toEqual(date);
    });
  });

  describe('createMaskedUserLog', () => {
    it('should create masked user log data', () => {
      const userData = {
        id: '01935c6d-c2d0-7abc-8def-1234567890ab',
        email: 'user@example.com',
        name: 'John Doe',
        phone: '+821012345678',
        ipAddress: '192.168.1.100',
      };

      const result = createMaskedUserLog(userData);

      expect(result.id).toBe('0193****90ab');
      expect(result.email).toBe('u***@example.com');
      expect(result.name).toBe('J*** D***');
      expect(result.phone).toBe('+820***5678');
      expect(result.ipAddress).toBe('192.168.x.x');
    });

    it('should handle partial user data', () => {
      const userData = {
        email: 'user@example.com',
      };

      const result = createMaskedUserLog(userData);

      expect(result.email).toBe('u***@example.com');
      expect(result.id).toBeUndefined();
    });

    it('should truncate long user agent strings', () => {
      const longUserAgent = 'a'.repeat(150);
      const userData = {
        userAgent: longUserAgent,
      };

      const result = createMaskedUserLog(userData);

      expect(result.userAgent).toBe('a'.repeat(100) + '...');
    });

    it('should mask additional PII fields', () => {
      const userData = {
        email: 'user@example.com',
        password: 'secret123',
        birthDate: '1990-05-15',
      };

      const result = createMaskedUserLog(userData);

      expect(result.email).toBe('u***@example.com');
      expect(result.password).toBe('********');
      expect(result.birthDate).toBe('1990-**-**');
    });
  });

  describe('DEFAULT_PII_FIELDS', () => {
    it('should include common PII field names', () => {
      expect(DEFAULT_PII_FIELDS).toContain('email');
      expect(DEFAULT_PII_FIELDS).toContain('phone');
      expect(DEFAULT_PII_FIELDS).toContain('name');
      expect(DEFAULT_PII_FIELDS).toContain('password');
      expect(DEFAULT_PII_FIELDS).toContain('ssn');
      expect(DEFAULT_PII_FIELDS).toContain('creditCard');
      expect(DEFAULT_PII_FIELDS).toContain('ipAddress');
    });
  });
});
