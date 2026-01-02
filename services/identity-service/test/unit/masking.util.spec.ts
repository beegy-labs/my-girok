import {
  maskUuid,
  maskEmail,
  maskIpAddress,
  maskToken,
  maskSensitiveData,
  createSafeLogContext,
  SENSITIVE_KEYS,
} from '../../src/common/utils/masking.util';

describe('Masking Utilities', () => {
  describe('maskUuid', () => {
    it('should mask standard UUID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const masked = maskUuid(uuid);

      expect(masked).toBe('550e8400-****-****-****-********0000');
    });

    it('should handle short UUIDs', () => {
      const shortUuid = '12345678';
      const masked = maskUuid(shortUuid);

      expect(masked).toBe('****');
    });

    it('should handle empty string', () => {
      const masked = maskUuid('');

      expect(masked).toBe('****');
    });

    it('should handle null/undefined', () => {
      expect(maskUuid(null as unknown as string)).toBe('****');
      expect(maskUuid(undefined as unknown as string)).toBe('****');
    });
  });

  describe('maskEmail', () => {
    it('should mask standard email', () => {
      const email = 'user@example.com';
      const masked = maskEmail(email);

      expect(masked).toBe('us***@example.com');
    });

    it('should mask short local part', () => {
      const email = 'ab@example.com';
      const masked = maskEmail(email);

      expect(masked).toBe('**@example.com');
    });

    it('should mask single character local part', () => {
      const email = 'a@example.com';
      const masked = maskEmail(email);

      expect(masked).toBe('*@example.com');
    });

    it('should handle email without @', () => {
      const masked = maskEmail('notanemail');

      expect(masked).toBe('***@***');
    });

    it('should handle empty string', () => {
      const masked = maskEmail('');

      expect(masked).toBe('***@***');
    });

    it('should handle null/undefined', () => {
      expect(maskEmail(null as unknown as string)).toBe('***@***');
      expect(maskEmail(undefined as unknown as string)).toBe('***@***');
    });
  });

  describe('maskIpAddress', () => {
    describe('IPv4', () => {
      it('should mask last 2 octets', () => {
        const ip = '192.168.1.100';
        const masked = maskIpAddress(ip);

        expect(masked).toBe('192.168.0.0');
      });

      it('should handle localhost', () => {
        const masked = maskIpAddress('127.0.0.1');

        expect(masked).toBe('127.0.0.0');
      });

      it('should handle malformed IPv4', () => {
        const masked = maskIpAddress('192.168');

        expect(masked).toBe('0.0.0.0');
      });
    });

    describe('IPv6', () => {
      it('should mask last 80 bits', () => {
        const ip = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
        const masked = maskIpAddress(ip);

        expect(masked).toBe('2001:db8:85a3::');
      });

      it('should handle compressed IPv6', () => {
        const ip = '2001:db8::1';
        const masked = maskIpAddress(ip);

        expect(masked).toBe('2001:db8:0::');
      });

      it('should handle loopback', () => {
        const masked = maskIpAddress('::1');

        expect(masked).toBe('0:0:0::');
      });
    });

    describe('IPv4-mapped IPv6', () => {
      it('should mask IPv4 portion', () => {
        const ip = '::ffff:192.168.1.1';
        const masked = maskIpAddress(ip);

        expect(masked).toBe('::ffff:192.168.0.0');
      });
    });

    it('should handle empty string', () => {
      const masked = maskIpAddress('');

      expect(masked).toBe('0.0.0.0');
    });

    it('should handle null/undefined', () => {
      expect(maskIpAddress(null as unknown as string)).toBe('0.0.0.0');
      expect(maskIpAddress(undefined as unknown as string)).toBe('0.0.0.0');
    });
  });

  describe('maskToken', () => {
    it('should show first 8 characters', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
      const masked = maskToken(token);

      expect(masked).toBe('eyJhbGci...');
    });

    it('should handle short token', () => {
      const token = 'short';
      const masked = maskToken(token);

      expect(masked).toBe('********');
    });

    it('should handle empty string', () => {
      const masked = maskToken('');

      expect(masked).toBe('********');
    });

    it('should handle null/undefined', () => {
      expect(maskToken(null as unknown as string)).toBe('********');
      expect(maskToken(undefined as unknown as string)).toBe('********');
    });
  });

  describe('maskSensitiveData', () => {
    it('should mask password fields', () => {
      const data = {
        username: 'testuser',
        password: 'secretPassword123',
        currentPassword: 'oldPassword',
        newPassword: 'newPassword',
      };

      const masked = maskSensitiveData(data);

      expect(masked.username).toBe('testuser');
      expect(masked.password).toBe('[REDACTED]');
      expect(masked.currentPassword).toBe('[REDACTED]');
      expect(masked.newPassword).toBe('[REDACTED]');
    });

    it('should mask token fields', () => {
      const data = {
        userId: '123',
        accessToken: 'jwt-token-here',
        refreshToken: 'refresh-token-here',
      };

      const masked = maskSensitiveData(data);

      expect(masked.userId).toBe('123');
      expect(masked.accessToken).toBe('[REDACTED]');
      expect(masked.refreshToken).toBe('[REDACTED]');
    });

    it('should mask secret fields', () => {
      const data = {
        accountId: '123',
        mfaSecret: 'JBSWY3DPEHPK3PXP',
        apiKey: 'api-key-12345',
      };

      const masked = maskSensitiveData(data);

      expect(masked.accountId).toBe('123');
      expect(masked.mfaSecret).toBe('[REDACTED]');
      expect(masked.apiKey).toBe('[REDACTED]');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          name: 'Test',
          password: 'secret',
          profile: {
            email: 'test@example.com',
            token: 'user-token',
          },
        },
      };

      const masked = maskSensitiveData(data);

      expect((masked.user as Record<string, unknown>).name).toBe('Test');
      expect((masked.user as Record<string, unknown>).password).toBe('[REDACTED]');
      expect(
        ((masked.user as Record<string, unknown>).profile as Record<string, unknown>).email,
      ).toBe('test@example.com');
      expect(
        ((masked.user as Record<string, unknown>).profile as Record<string, unknown>).token,
      ).toBe('[REDACTED]');
    });

    it('should handle arrays of objects', () => {
      const data = {
        users: [
          { id: '1', password: 'pass1' },
          { id: '2', password: 'pass2' },
        ],
      };

      const masked = maskSensitiveData(data);
      const users = masked.users as Array<Record<string, unknown>>;

      expect(users[0].id).toBe('1');
      expect(users[0].password).toBe('[REDACTED]');
      expect(users[1].id).toBe('2');
      expect(users[1].password).toBe('[REDACTED]');
    });

    it('should handle arrays of primitives', () => {
      const data = {
        tags: ['tag1', 'tag2'],
        password: 'secret',
      };

      const masked = maskSensitiveData(data);

      expect(masked.tags).toEqual(['tag1', 'tag2']);
      expect(masked.password).toBe('[REDACTED]');
    });

    it('should accept additional fields to mask', () => {
      const data = {
        username: 'testuser',
        customSecret: 'my-secret',
        normalField: 'normal',
      };

      const masked = maskSensitiveData(data, ['customSecret']);

      expect(masked.username).toBe('testuser');
      expect(masked.customSecret).toBe('[REDACTED]');
      expect(masked.normalField).toBe('normal');
    });

    it('should be case-insensitive', () => {
      const data = {
        PASSWORD: 'secret1',
        Password: 'secret2',
        password: 'secret3',
      };

      const masked = maskSensitiveData(data);

      expect(masked.PASSWORD).toBe('[REDACTED]');
      expect(masked.Password).toBe('[REDACTED]');
      expect(masked.password).toBe('[REDACTED]');
    });

    it('should handle null/undefined', () => {
      expect(maskSensitiveData(null as unknown as Record<string, unknown>)).toBe(null);
      expect(maskSensitiveData(undefined as unknown as Record<string, unknown>)).toBe(undefined);
    });

    it('should handle non-object input', () => {
      expect(maskSensitiveData('string' as unknown as Record<string, unknown>)).toBe('string');
      expect(maskSensitiveData(123 as unknown as Record<string, unknown>)).toBe(123);
    });
  });

  describe('createSafeLogContext', () => {
    it('should mask accountId, email, and ipAddress', () => {
      const data = {
        accountId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        ipAddress: '192.168.1.100',
        action: 'login',
      };

      const context = createSafeLogContext(data);

      expect(context.accountId).toBe('550e8400-****-****-****-********0000');
      expect(context.email).toBe('us***@example.com');
      expect(context.ipAddress).toBe('192.168.0.0');
      expect(context.action).toBe('login');
    });

    it('should exclude sensitive fields', () => {
      const data = {
        accountId: '550e8400-e29b-41d4-a716-446655440000',
        password: 'secret',
        action: 'login',
      };

      const context = createSafeLogContext(data);

      expect(context.accountId).toBeDefined();
      expect(context.password).toBeUndefined();
      expect(context.action).toBe('login');
    });

    it('should handle partial data', () => {
      const context = createSafeLogContext({
        email: 'test@example.com',
      });

      expect(context.email).toBe('te***@example.com');
      expect(context.accountId).toBeUndefined();
      expect(context.ipAddress).toBeUndefined();
    });
  });

  describe('SENSITIVE_KEYS', () => {
    it('should include common password fields', () => {
      expect(SENSITIVE_KEYS).toContain('password');
      expect(SENSITIVE_KEYS).toContain('currentPassword');
      expect(SENSITIVE_KEYS).toContain('newPassword');
      expect(SENSITIVE_KEYS).toContain('passwordHash');
    });

    it('should include token fields', () => {
      expect(SENSITIVE_KEYS).toContain('token');
      expect(SENSITIVE_KEYS).toContain('accessToken');
      expect(SENSITIVE_KEYS).toContain('refreshToken');
    });

    it('should include secret fields', () => {
      expect(SENSITIVE_KEYS).toContain('secret');
      expect(SENSITIVE_KEYS).toContain('mfaSecret');
      expect(SENSITIVE_KEYS).toContain('apiKey');
      expect(SENSITIVE_KEYS).toContain('privateKey');
    });

    it('should include session fields', () => {
      expect(SENSITIVE_KEYS).toContain('sessionId');
      expect(SENSITIVE_KEYS).toContain('jti');
    });

    it('should include backup code fields', () => {
      expect(SENSITIVE_KEYS).toContain('backupCode');
      expect(SENSITIVE_KEYS).toContain('backupCodes');
    });
  });
});
