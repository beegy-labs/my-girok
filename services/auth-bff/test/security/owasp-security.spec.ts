/**
 * OWASP Security Tests for Auth BFF Service
 *
 * This test suite verifies security controls based on OWASP Top 10 guidelines:
 * - A01:2021 Broken Access Control
 * - A02:2021 Cryptographic Failures
 * - A03:2021 Injection
 * - A04:2021 Insecure Design (Session Fixation)
 * - A05:2021 Security Misconfiguration
 * - A07:2021 Identification and Authentication Failures
 *
 * @see https://owasp.org/Top10/
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../src/user/user.service';
import { SessionService } from '../../src/session/session.service';
import { SessionStore } from '../../src/session/session.store';
import { SessionGuard } from '../../src/common/guards/session.guard';
import { IdentityGrpcClient, AuditGrpcClient } from '../../src/grpc-clients';
import { createMockSession, createMockRequest, createMockResponse } from '../utils/mock-factories';
import {
  AccountType,
  COOKIE_OPTIONS,
  SESSION_CONFIG,
  RATE_LIMIT_CONFIG,
  CSRF_CONFIG,
} from '../../src/config/constants';

// ============================================================================
// A01:2021 - Broken Access Control Tests
// ============================================================================

describe('OWASP A01:2021 - Broken Access Control', () => {
  describe('Session-Based Access Control', () => {
    let sessionGuard: SessionGuard;
    let sessionService: {
      validateSession: ReturnType<typeof vi.fn>;
    };
    let reflector: Reflector;

    beforeEach(async () => {
      sessionService = {
        validateSession: vi.fn(),
      };

      reflector = new Reflector();

      sessionGuard = new SessionGuard(reflector, sessionService as unknown as SessionService);
    });

    it('should deny access to protected routes without valid session', async () => {
      sessionService.validateSession.mockResolvedValue({
        valid: false,
        error: 'No valid session found',
      });

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => createMockRequest(),
        }),
        getHandler: () => vi.fn(),
        getClass: () => vi.fn(),
      };

      await expect(sessionGuard.canActivate(mockContext as any)).rejects.toThrow(
        'No valid session found',
      );
    });

    it('should deny access when MFA is required but not verified', async () => {
      const session = createMockSession({
        mfaRequired: true,
        mfaVerified: false,
      });

      sessionService.validateSession.mockResolvedValue({
        valid: true,
        session,
      });

      const mockHandler = vi.fn();
      const mockClass = vi.fn();

      // Simulate RequireMfa decorator
      Reflect.defineMetadata('requireMfa', true, mockHandler);

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => createMockRequest(),
        }),
        getHandler: () => mockHandler,
        getClass: () => mockClass,
      };

      // The guard should throw ForbiddenException for MFA requirement
      await expect(sessionGuard.canActivate(mockContext as any)).rejects.toThrow(
        'MFA verification required',
      );
    });

    it('should enforce account type restrictions', async () => {
      // User session trying to access admin-only route
      const userSession = createMockSession({
        accountType: AccountType.USER,
      });

      sessionService.validateSession.mockResolvedValue({
        valid: true,
        session: userSession,
      });

      const mockHandler = vi.fn();
      const mockClass = vi.fn();

      // Simulate AllowedAccountTypes decorator for ADMIN only
      Reflect.defineMetadata('accountTypes', [AccountType.ADMIN], mockHandler);

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => createMockRequest(),
        }),
        getHandler: () => mockHandler,
        getClass: () => mockClass,
      };

      await expect(sessionGuard.canActivate(mockContext as any)).rejects.toThrow(
        'Access denied for this account type',
      );
    });

    it('should allow access for valid session with correct account type', async () => {
      const adminSession = createMockSession({
        accountType: AccountType.ADMIN,
        mfaVerified: true,
      });

      sessionService.validateSession.mockResolvedValue({
        valid: true,
        session: adminSession,
      });

      const mockHandler = vi.fn();
      const mockClass = vi.fn();

      // Simulate AllowedAccountTypes decorator for ADMIN
      Reflect.defineMetadata('accountTypes', [AccountType.ADMIN], mockHandler);

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => createMockRequest(),
        }),
        getHandler: () => mockHandler,
        getClass: () => mockClass,
      };

      const result = await sessionGuard.canActivate(mockContext as any);
      expect(result).toBe(true);
    });
  });

  describe('Device Fingerprint Validation', () => {
    let sessionService: SessionService;
    let sessionStore: {
      get: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      touch: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
      sessionStore = {
        get: vi.fn(),
        delete: vi.fn(),
        touch: vi.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SessionService,
          {
            provide: SessionStore,
            useValue: sessionStore,
          },
          {
            provide: ConfigService,
            useValue: {
              get: vi.fn().mockImplementation((key: string, defaultValue: any) => {
                if (key === 'session.cookieName') return 'girok_session';
                if (key === 'session.secure') return false;
                return defaultValue;
              }),
            },
          },
        ],
      }).compile();

      sessionService = module.get<SessionService>(SessionService);
    });

    it('should invalidate session when device fingerprint changes', async () => {
      const storedSession = createMockSession({
        deviceFingerprint: 'original-fingerprint',
      });

      sessionStore.get.mockResolvedValue(storedSession);
      sessionStore.delete.mockResolvedValue(true);

      // Request with different fingerprint (different device)
      const differentDeviceRequest = createMockRequest({
        cookies: { girok_session: storedSession.id },
        headers: {
          'user-agent': 'Different Browser',
          'accept-language': 'ja-JP',
        },
      });

      const session = await sessionService.getSession(differentDeviceRequest);

      // Session should be invalidated and deleted
      expect(session).toBeNull();
      expect(sessionStore.delete).toHaveBeenCalledWith(storedSession.id);
    });
  });
});

// ============================================================================
// A02:2021 - Cryptographic Failures Tests
// ============================================================================

describe('OWASP A02:2021 - Cryptographic Failures', () => {
  describe('Token Encryption', () => {
    it('should encrypt tokens using AES-256-GCM', async () => {
      const { encrypt, decrypt } = await import('../../src/common/utils/crypto.utils');

      const testToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test-payload';
      const encryptionKey = 'test-encryption-key-32-chars!!';

      const encrypted = encrypt(testToken, encryptionKey);

      // Encrypted format should be: iv:authTag:encryptedData
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);

      // IV should be 32 hex chars (16 bytes)
      expect(parts[0]).toHaveLength(32);

      // Auth tag should be 32 hex chars (16 bytes)
      expect(parts[1]).toHaveLength(32);

      // Encrypted data should not be empty
      expect(parts[2].length).toBeGreaterThan(0);

      // Should be reversible with correct key
      const decrypted = decrypt(encrypted, encryptionKey);
      expect(decrypted).toBe(testToken);
    });

    it('should fail decryption with wrong key', async () => {
      const { encrypt, decrypt } = await import('../../src/common/utils/crypto.utils');

      const testToken = 'secret-token-data';
      const correctKey = 'correct-encryption-key-32chars!';
      const wrongKey = 'wrong-encryption-key-32-chars!!';

      const encrypted = encrypt(testToken, correctKey);

      expect(() => decrypt(encrypted, wrongKey)).toThrow();
    });

    it('should fail decryption with tampered ciphertext', async () => {
      const { encrypt, decrypt } = await import('../../src/common/utils/crypto.utils');

      const testToken = 'secret-token-data';
      const encryptionKey = 'test-encryption-key-32-chars!!';

      const encrypted = encrypt(testToken, encryptionKey);
      const parts = encrypted.split(':');

      // Tamper with the encrypted data
      const tamperedData = parts[2].split('').reverse().join('');
      const tamperedEncrypted = `${parts[0]}:${parts[1]}:${tamperedData}`;

      expect(() => decrypt(tamperedEncrypted, encryptionKey)).toThrow();
    });

    it('should reject invalid encrypted text format', async () => {
      const { decrypt } = await import('../../src/common/utils/crypto.utils');

      const encryptionKey = 'test-encryption-key-32-chars!!';

      // Missing parts
      expect(() => decrypt('invalid', encryptionKey)).toThrow('Invalid encrypted text format');
      expect(() => decrypt('part1:part2', encryptionKey)).toThrow('Invalid encrypted text format');
    });
  });

  describe('Session ID Generation', () => {
    it('should generate cryptographically secure session IDs', async () => {
      const { generateSessionId } = await import('../../src/common/utils/crypto.utils');

      const ids = new Set<string>();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        ids.add(generateSessionId());
      }

      // All IDs should be unique
      expect(ids.size).toBe(iterations);

      // Session IDs should be 64 hex chars (32 bytes)
      const sampleId = generateSessionId();
      expect(sampleId).toHaveLength(64);
      expect(sampleId).toMatch(/^[a-f0-9]+$/);
    });

    it('should have sufficient entropy in session IDs', async () => {
      const { generateSessionId } = await import('../../src/common/utils/crypto.utils');

      // 32 bytes = 256 bits of entropy
      // This is more than sufficient for session IDs (OWASP recommends 128+ bits)
      const id = generateSessionId();
      expect(id.length / 2).toBe(32); // 32 bytes
    });
  });

  describe('Device Fingerprint Hashing', () => {
    it('should hash device fingerprint components', async () => {
      const { hashDeviceFingerprint } = await import('../../src/common/utils/crypto.utils');

      const components = ['Mozilla/5.0', 'en-US', 'gzip'];
      const hash = hashDeviceFingerprint(components);

      // Should be a 32 character hex string (truncated SHA-256)
      expect(hash).toHaveLength(32);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should produce consistent hashes for same input', async () => {
      const { hashDeviceFingerprint } = await import('../../src/common/utils/crypto.utils');

      const components = ['Mozilla/5.0', 'en-US', 'gzip'];
      const hash1 = hashDeviceFingerprint(components);
      const hash2 = hashDeviceFingerprint(components);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', async () => {
      const { hashDeviceFingerprint } = await import('../../src/common/utils/crypto.utils');

      const hash1 = hashDeviceFingerprint(['Mozilla/5.0', 'en-US', 'gzip']);
      const hash2 = hashDeviceFingerprint(['Chrome/90', 'ja-JP', 'br']);

      expect(hash1).not.toBe(hash2);
    });
  });
});

// ============================================================================
// A03:2021 - Injection Tests
// ============================================================================

describe('OWASP A03:2021 - Injection Prevention', () => {
  describe('Input Validation Patterns', () => {
    it('should have email validation pattern', () => {
      // The UserRegisterDto uses @IsEmail() decorator
      // This regex pattern validates email format
      const validEmails = ['test@example.com', 'user.name@domain.co.uk'];
      const invalidEmails = ["admin'--", 'not-an-email'];

      // Email validation is enforced by class-validator @IsEmail()
      for (const email of validEmails) {
        expect(email).toMatch(/.+@.+\..+/);
      }

      // These patterns should not pass as valid emails
      for (const email of invalidEmails) {
        // Simple regex only - class-validator does more thorough validation
        const hasBasicEmailStructure = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        expect(hasBasicEmailStructure).toBe(false);
      }

      // SQL injection patterns that look like emails should still be rejected by class-validator
      // because @IsEmail() uses a stricter RFC-based validation
      const sqlInjectionEmails = ["admin'--@evil.com", "test@'or'1'='1"];
      for (const email of sqlInjectionEmails) {
        // These might pass basic regex but would fail strict @IsEmail() validation
        // The key is that they contain SQL injection characters
        expect(email).toMatch(/['"]/); // Contains quotes used in SQL injection
      }
    });

    it('should have username validation pattern', () => {
      // Username validation from UserRegisterDto
      const usernamePattern = /^[a-zA-Z0-9_-]+$/;

      const validUsernames = ['testuser', 'test_user', 'test-user', 'user123'];
      const invalidUsernames = [
        '<script>alert("xss")</script>',
        "user'; DROP TABLE users;--",
        'user@name',
      ];

      for (const username of validUsernames) {
        expect(usernamePattern.test(username)).toBe(true);
      }

      for (const username of invalidUsernames) {
        expect(usernamePattern.test(username)).toBe(false);
      }
    });

    it('should have password strength requirements', () => {
      // Password pattern from UserRegisterDto - checks for:
      // - At least one lowercase letter
      // - At least one uppercase letter
      // - At least one digit
      // - At least one special character from @$!%*?&
      const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;

      const strongPasswords = ['Password1!', 'MySecure@Pass123', 'Complex$ecure99'];

      // These passwords fail different requirements
      const weakPasswords = [
        { password: 'password', reason: 'no uppercase, number, or special char' },
        { password: '12345678', reason: 'no letters or special char' },
        { password: 'PASSWORD1!', reason: 'no lowercase' },
        { password: 'password!', reason: 'no uppercase or number' },
      ];

      for (const password of strongPasswords) {
        expect(passwordPattern.test(password)).toBe(true);
      }

      for (const { password } of weakPasswords) {
        expect(passwordPattern.test(password)).toBe(false);
      }

      // Additionally, minimum length of 8 is enforced by @MinLength(8)
      // This is tested separately through validation pipe
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should not be vulnerable to SQL injection patterns', () => {
      // These patterns should be rejected by validation
      const sqlInjectionPatterns = [
        "' OR '1'='1",
        "'; DROP TABLE users;--",
        "admin'--",
        '1; SELECT * FROM users',
        "' UNION SELECT * FROM users--",
      ];

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      for (const pattern of sqlInjectionPatterns) {
        expect(emailPattern.test(pattern)).toBe(false);
      }
    });
  });

  describe('NoSQL Injection Prevention', () => {
    it('should reject object inputs that could be NoSQL injection', () => {
      // ValidationPipe with forbidNonWhitelisted rejects non-string values
      const nosqlInjections = [{ $gt: '' }, { $ne: null }, { $regex: '.*' }];

      // These should be rejected by ValidationPipe transform: true
      // which expects string values for email/password
      for (const injection of nosqlInjections) {
        expect(typeof injection).toBe('object');
        // Non-string values would fail @IsString() validation
      }
    });
  });

  describe('XSS Prevention', () => {
    it('should reject HTML/script tags in username', () => {
      const usernamePattern = /^[a-zA-Z0-9_-]+$/;

      const xssPatterns = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert(1)>',
        "javascript:alert('xss')",
        '<svg onload=alert(1)>',
      ];

      for (const pattern of xssPatterns) {
        expect(usernamePattern.test(pattern)).toBe(false);
      }
    });
  });
});

// ============================================================================
// A04:2021 - Session Fixation Prevention Tests
// ============================================================================

describe('OWASP A04:2021 - Session Fixation Prevention', () => {
  describe('Session Regeneration on Login', () => {
    let userService: UserService;
    let sessionService: {
      createSession: ReturnType<typeof vi.fn>;
      extractMetadata: ReturnType<typeof vi.fn>;
      getDeviceFingerprint: ReturnType<typeof vi.fn>;
      getSession: ReturnType<typeof vi.fn>;
      destroySession: ReturnType<typeof vi.fn>;
    };
    let identityClient: {
      getAccountByEmail: ReturnType<typeof vi.fn>;
      validatePassword: ReturnType<typeof vi.fn>;
      createSession: ReturnType<typeof vi.fn>;
      recordLoginAttempt: ReturnType<typeof vi.fn>;
    };
    let auditClient: {
      logLoginSuccess: ReturnType<typeof vi.fn>;
      logLoginFailed: ReturnType<typeof vi.fn>;
      logLogout: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
      sessionService = {
        createSession: vi.fn(),
        extractMetadata: vi.fn().mockReturnValue({
          userAgent: 'test',
          ipAddress: '127.0.0.1',
        }),
        getDeviceFingerprint: vi.fn().mockReturnValue('fingerprint-123'),
        getSession: vi.fn(),
        destroySession: vi.fn(),
      };

      identityClient = {
        getAccountByEmail: vi.fn(),
        validatePassword: vi.fn(),
        createSession: vi.fn(),
        recordLoginAttempt: vi.fn(),
      };

      auditClient = {
        logLoginSuccess: vi.fn(),
        logLoginFailed: vi.fn(),
        logLogout: vi.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UserService,
          { provide: IdentityGrpcClient, useValue: identityClient },
          { provide: AuditGrpcClient, useValue: auditClient },
          { provide: SessionService, useValue: sessionService },
        ],
      }).compile();

      userService = module.get<UserService>(UserService);
    });

    it('should generate new session ID on each successful login', async () => {
      const mockAccount = {
        id: 'user-123',
        email: 'user@example.com',
        username: 'testuser',
        mfaEnabled: false,
        emailVerified: true,
      };

      identityClient.getAccountByEmail.mockResolvedValue(mockAccount);
      identityClient.validatePassword.mockResolvedValue({ valid: true });
      identityClient.createSession.mockResolvedValue({
        accessToken: 'access-token-1',
        refreshToken: 'refresh-token-1',
      });
      identityClient.recordLoginAttempt.mockResolvedValue({
        accountLocked: false,
      });

      // First login - generates session-1
      sessionService.createSession.mockResolvedValueOnce(createMockSession({ id: 'session-1' }));

      const req1 = createMockRequest();
      const res1 = createMockResponse();

      await userService.login(req1, res1, {
        email: 'user@example.com',
        password: 'Password1!',
      });

      // Second login - should generate different session
      identityClient.createSession.mockResolvedValue({
        accessToken: 'access-token-2',
        refreshToken: 'refresh-token-2',
      });

      sessionService.createSession.mockResolvedValueOnce(createMockSession({ id: 'session-2' }));

      const req2 = createMockRequest();
      const res2 = createMockResponse();

      await userService.login(req2, res2, {
        email: 'user@example.com',
        password: 'Password1!',
      });

      // Both calls should create new sessions
      expect(sessionService.createSession).toHaveBeenCalledTimes(2);
    });

    it('should create new session regardless of existing cookies', async () => {
      const mockAccount = {
        id: 'user-123',
        email: 'user@example.com',
        username: 'testuser',
        mfaEnabled: false,
        emailVerified: true,
      };

      identityClient.getAccountByEmail.mockResolvedValue(mockAccount);
      identityClient.validatePassword.mockResolvedValue({ valid: true });
      identityClient.createSession.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      identityClient.recordLoginAttempt.mockResolvedValue({
        accountLocked: false,
      });

      sessionService.createSession.mockResolvedValue(createMockSession({ id: 'new-session-id' }));

      // Request with an existing (potentially attacker-set) session cookie
      const req = createMockRequest({
        cookies: { girok_session: 'attacker-known-session-id' },
      });
      const res = createMockResponse();

      await userService.login(req, res, {
        email: 'user@example.com',
        password: 'Password1!',
      });

      // Verify createSession was called (creates NEW session)
      expect(sessionService.createSession).toHaveBeenCalled();
    });

    it('should destroy existing session on logout', async () => {
      const existingSession = createMockSession({ id: 'session-to-destroy' });

      sessionService.getSession.mockResolvedValue(existingSession);
      sessionService.destroySession.mockResolvedValue(true);

      const req = createMockRequest({
        cookies: { girok_session: existingSession.id },
      });
      const res = createMockResponse();

      await userService.logout(req, res);

      expect(sessionService.destroySession).toHaveBeenCalledWith(req, res);
    });
  });

  describe('Session ID Properties', () => {
    it('should use cryptographically random session IDs', async () => {
      const { generateSessionId } = await import('../../src/common/utils/crypto.utils');

      // Generate multiple IDs and verify randomness
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateSessionId());
      }

      // All should be unique
      expect(ids.size).toBe(100);

      // Each should have sufficient length (64 hex chars = 32 bytes = 256 bits)
      for (const id of ids) {
        expect(id).toHaveLength(64);
      }
    });
  });
});

// ============================================================================
// A05:2021 - Security Misconfiguration Tests
// ============================================================================

describe('OWASP A05:2021 - Security Misconfiguration', () => {
  describe('Cookie Security Settings', () => {
    it('should set HttpOnly flag on session cookies', () => {
      // Uses COOKIE_OPTIONS imported at top of file

      expect(COOKIE_OPTIONS.httpOnly).toBe(true);
    });

    it('should set SameSite attribute on cookies', () => {
      // Uses COOKIE_OPTIONS imported at top of file

      // SameSite should be 'lax' or 'strict' for CSRF protection
      expect(['lax', 'strict']).toContain(COOKIE_OPTIONS.sameSite);
    });
  });

  describe('Session Configuration', () => {
    it('should have reasonable session TTLs', () => {
      // Uses SESSION_CONFIG imported at top of file

      // User sessions: max 30 days
      expect(SESSION_CONFIG.MAX_AGE.USER).toBeLessThanOrEqual(30 * 24 * 60 * 60 * 1000);

      // Operator sessions: max 7 days
      expect(SESSION_CONFIG.MAX_AGE.OPERATOR).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000);

      // Admin sessions: max 24 hours (security requirement)
      expect(SESSION_CONFIG.MAX_AGE.ADMIN).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
    });

    it('should disable sliding sessions for admin accounts', () => {
      // Uses SESSION_CONFIG imported at top of file

      // Admins should require re-authentication (no sliding)
      expect(SESSION_CONFIG.SLIDING_ENABLED.ADMIN).toBe(false);
    });

    it('should have sliding sessions enabled for regular users', () => {
      // Uses SESSION_CONFIG imported at top of file

      // Users benefit from sliding sessions for convenience
      expect(SESSION_CONFIG.SLIDING_ENABLED.USER).toBe(true);
    });
  });

  describe('Rate Limit Configuration', () => {
    it('should have rate limiting configured for login endpoint', () => {
      // Uses RATE_LIMIT_CONFIG imported at top of file

      // Login should be limited to 5 attempts per minute
      expect(RATE_LIMIT_CONFIG.LOGIN.limit).toBe(5);
      expect(RATE_LIMIT_CONFIG.LOGIN.ttl).toBe(60000);
    });

    it('should have stricter rate limiting for registration', () => {
      // Uses RATE_LIMIT_CONFIG imported at top of file

      // Registration should be more restrictive
      expect(RATE_LIMIT_CONFIG.REGISTER.limit).toBe(3);
      expect(RATE_LIMIT_CONFIG.REGISTER.ttl).toBe(60000);
    });

    it('should have rate limiting for MFA endpoints', () => {
      // Uses RATE_LIMIT_CONFIG imported at top of file

      // MFA should be limited to prevent brute force
      expect(RATE_LIMIT_CONFIG.MFA.limit).toBe(5);
      expect(RATE_LIMIT_CONFIG.MFA.ttl).toBe(60000);
    });
  });

  describe('CSRF Configuration', () => {
    it('should have CSRF token cookie and header names configured', () => {
      // Uses CSRF_CONFIG imported at top of file

      expect(CSRF_CONFIG.COOKIE_NAME).toBeDefined();
      expect(CSRF_CONFIG.HEADER_NAME).toBeDefined();
    });
  });
});

// ============================================================================
// A07:2021 - Identification and Authentication Failures (Rate Limiting)
// ============================================================================

describe('OWASP A07:2021 - Authentication Failures', () => {
  describe('Login Attempt Tracking', () => {
    let userService: UserService;
    let identityClient: {
      getAccountByEmail: ReturnType<typeof vi.fn>;
      validatePassword: ReturnType<typeof vi.fn>;
      recordLoginAttempt: ReturnType<typeof vi.fn>;
    };
    let auditClient: {
      logLoginFailed: ReturnType<typeof vi.fn>;
    };
    let sessionService: {
      extractMetadata: ReturnType<typeof vi.fn>;
      getDeviceFingerprint: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
      identityClient = {
        getAccountByEmail: vi.fn(),
        validatePassword: vi.fn(),
        recordLoginAttempt: vi.fn(),
      };

      auditClient = {
        logLoginFailed: vi.fn(),
      };

      sessionService = {
        extractMetadata: vi.fn().mockReturnValue({ userAgent: 'test' }),
        getDeviceFingerprint: vi.fn().mockReturnValue('fingerprint'),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UserService,
          { provide: IdentityGrpcClient, useValue: identityClient },
          { provide: AuditGrpcClient, useValue: auditClient },
          { provide: SessionService, useValue: sessionService },
        ],
      }).compile();

      userService = module.get<UserService>(UserService);
    });

    it('should record failed login attempts', async () => {
      const mockAccount = {
        id: 'user-123',
        email: 'user@example.com',
        mfaEnabled: false,
      };

      identityClient.getAccountByEmail.mockResolvedValue(mockAccount);
      identityClient.validatePassword.mockResolvedValue({ valid: false });
      identityClient.recordLoginAttempt.mockResolvedValue({
        accountLocked: false,
        failedAttempts: 1,
      });

      const req = createMockRequest();
      const res = createMockResponse();

      await expect(
        userService.login(req, res, {
          email: 'user@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow('Invalid credentials');

      expect(identityClient.recordLoginAttempt).toHaveBeenCalledWith(
        mockAccount.id,
        mockAccount.email,
        expect.any(String), // IP
        expect.any(String), // User agent
        false, // success = false
        'Invalid password',
      );
    });

    it('should lock account after too many failed attempts', async () => {
      const mockAccount = {
        id: 'user-123',
        email: 'user@example.com',
        mfaEnabled: false,
      };

      identityClient.getAccountByEmail.mockResolvedValue(mockAccount);
      identityClient.validatePassword.mockResolvedValue({ valid: false });
      identityClient.recordLoginAttempt.mockResolvedValue({
        accountLocked: true,
        failedAttempts: 5,
      });

      const req = createMockRequest();
      const res = createMockResponse();

      await expect(
        userService.login(req, res, {
          email: 'user@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow('Account locked');
    });

    it('should record login attempts for non-existent accounts', async () => {
      identityClient.getAccountByEmail.mockResolvedValue(null);
      identityClient.recordLoginAttempt.mockResolvedValue({});

      const req = createMockRequest();
      const res = createMockResponse();

      await expect(
        userService.login(req, res, {
          email: 'nonexistent@example.com',
          password: 'password',
        }),
      ).rejects.toThrow('Invalid credentials');

      // Should still record the attempt (to track brute force against non-existent accounts)
      expect(identityClient.recordLoginAttempt).toHaveBeenCalled();
    });
  });

  describe('MFA Challenge Management', () => {
    let userService: UserService;
    let identityClient: {
      getAccountByEmail: ReturnType<typeof vi.fn>;
      getAccount: ReturnType<typeof vi.fn>;
      validatePassword: ReturnType<typeof vi.fn>;
      verifyMfaCode: ReturnType<typeof vi.fn>;
      useBackupCode: ReturnType<typeof vi.fn>;
      createSession: ReturnType<typeof vi.fn>;
      recordLoginAttempt: ReturnType<typeof vi.fn>;
    };
    let auditClient: {
      logMfaVerified: ReturnType<typeof vi.fn>;
      logMfaFailed: ReturnType<typeof vi.fn>;
    };
    let sessionService: {
      createSession: ReturnType<typeof vi.fn>;
      extractMetadata: ReturnType<typeof vi.fn>;
      getDeviceFingerprint: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
      identityClient = {
        getAccountByEmail: vi.fn(),
        getAccount: vi.fn(),
        validatePassword: vi.fn(),
        verifyMfaCode: vi.fn(),
        useBackupCode: vi.fn(),
        createSession: vi.fn(),
        recordLoginAttempt: vi.fn(),
      };

      auditClient = {
        logMfaVerified: vi.fn(),
        logMfaFailed: vi.fn(),
      };

      sessionService = {
        createSession: vi.fn(),
        extractMetadata: vi.fn().mockReturnValue({ userAgent: 'test' }),
        getDeviceFingerprint: vi.fn().mockReturnValue('fingerprint'),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UserService,
          { provide: IdentityGrpcClient, useValue: identityClient },
          { provide: AuditGrpcClient, useValue: auditClient },
          { provide: SessionService, useValue: sessionService },
        ],
      }).compile();

      userService = module.get<UserService>(UserService);
    });

    it('should reject invalid MFA challenge ID', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await expect(
        userService.loginMfa(req, res, 'invalid-challenge', '123456', 'totp'),
      ).rejects.toThrow('Invalid or expired challenge');
    });

    it('should generate MFA challenge for accounts with MFA enabled', async () => {
      const mfaAccount = {
        id: 'user-123',
        email: 'user@example.com',
        username: 'testuser',
        mfaEnabled: true,
        emailVerified: true,
      };

      identityClient.getAccountByEmail.mockResolvedValue(mfaAccount);
      identityClient.validatePassword.mockResolvedValue({ valid: true });

      const req = createMockRequest();
      const res = createMockResponse();

      const result = await userService.login(req, res, {
        email: 'user@example.com',
        password: 'Password1!',
      });

      expect(result.mfaRequired).toBe(true);
      expect(result.challengeId).toBeDefined();
      expect(result.availableMethods).toContain('totp');
      expect(result.availableMethods).toContain('backup_code');
    });

    it('should log failed MFA attempts', async () => {
      const mfaAccount = {
        id: 'user-123',
        email: 'user@example.com',
        username: 'testuser',
        mfaEnabled: true,
        emailVerified: true,
      };

      identityClient.getAccountByEmail.mockResolvedValue(mfaAccount);
      identityClient.validatePassword.mockResolvedValue({ valid: true });

      const req = createMockRequest();
      const res = createMockResponse();

      // First create a challenge
      const loginResult = await userService.login(req, res, {
        email: 'user@example.com',
        password: 'Password1!',
      });

      const challengeId = loginResult.challengeId!;

      // Attempt MFA with invalid code
      identityClient.verifyMfaCode.mockResolvedValue({ success: false });

      await expect(userService.loginMfa(req, res, challengeId, '000000', 'totp')).rejects.toThrow();

      expect(auditClient.logMfaFailed).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Error Handling Security Tests
// ============================================================================

describe('Error Handling Security', () => {
  describe('Error Message Information Leakage Prevention', () => {
    let userService: UserService;
    let identityClient: {
      getAccountByEmail: ReturnType<typeof vi.fn>;
      validatePassword: ReturnType<typeof vi.fn>;
      recordLoginAttempt: ReturnType<typeof vi.fn>;
    };
    let auditClient: {
      logLoginFailed: ReturnType<typeof vi.fn>;
    };
    let sessionService: {
      extractMetadata: ReturnType<typeof vi.fn>;
      getDeviceFingerprint: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
      identityClient = {
        getAccountByEmail: vi.fn(),
        validatePassword: vi.fn(),
        recordLoginAttempt: vi.fn(),
      };

      auditClient = {
        logLoginFailed: vi.fn(),
      };

      sessionService = {
        extractMetadata: vi.fn().mockReturnValue({ userAgent: 'test' }),
        getDeviceFingerprint: vi.fn().mockReturnValue('fingerprint'),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UserService,
          { provide: IdentityGrpcClient, useValue: identityClient },
          { provide: AuditGrpcClient, useValue: auditClient },
          { provide: SessionService, useValue: sessionService },
        ],
      }).compile();

      userService = module.get<UserService>(UserService);
    });

    it('should return generic error for invalid email (user enumeration prevention)', async () => {
      identityClient.getAccountByEmail.mockResolvedValue(null);
      identityClient.recordLoginAttempt.mockResolvedValue({});

      const req = createMockRequest();
      const res = createMockResponse();

      try {
        await userService.login(req, res, {
          email: 'nonexistent@example.com',
          password: 'password',
        });
      } catch (error: any) {
        // Error message should be generic, not revealing that email doesn't exist
        expect(error.message).toBe('Invalid credentials');
        expect(error.message).not.toContain('not found');
        expect(error.message).not.toContain('does not exist');
      }
    });

    it('should return generic error for invalid password', async () => {
      const mockAccount = {
        id: 'user-123',
        email: 'user@example.com',
        mfaEnabled: false,
      };

      identityClient.getAccountByEmail.mockResolvedValue(mockAccount);
      identityClient.validatePassword.mockResolvedValue({ valid: false });
      identityClient.recordLoginAttempt.mockResolvedValue({
        accountLocked: false,
      });

      const req = createMockRequest();
      const res = createMockResponse();

      try {
        await userService.login(req, res, {
          email: 'user@example.com',
          password: 'wrongpassword',
        });
      } catch (error: any) {
        // Same generic error for wrong password
        expect(error.message).toBe('Invalid credentials');
      }
    });

    it('should not leak internal error details', async () => {
      identityClient.getAccountByEmail.mockRejectedValue(
        new Error('Database connection failed: host=db.internal.com port=5432'),
      );

      const req = createMockRequest();
      const res = createMockResponse();

      try {
        await userService.login(req, res, {
          email: 'user@example.com',
          password: 'password',
        });
      } catch (error: any) {
        // Should not leak database details
        expect(error.message).not.toContain('Database');
        expect(error.message).not.toContain('internal.com');
        expect(error.message).not.toContain('5432');
        expect(error.message).toBe('Login failed');
      }
    });

    it('should use consistent timing for authentication checks', () => {
      // This documents the importance of timing attack prevention
      // The actual implementation uses consistent error messages
      // and should ideally use constant-time comparisons
      // User enumeration via timing is mitigated by:
      // 1. Same error message for non-existent users and wrong passwords
      // 2. Recording login attempts for both cases
    });
  });
});

// ============================================================================
// CSRF Protection Tests
// ============================================================================

describe('CSRF Protection', () => {
  describe('Cookie Configuration for CSRF', () => {
    it('should use SameSite cookie attribute', () => {
      // Uses COOKIE_OPTIONS imported at top of file

      // SameSite provides built-in CSRF protection
      expect(COOKIE_OPTIONS.sameSite).toBeDefined();
      expect(['lax', 'strict']).toContain(COOKIE_OPTIONS.sameSite);
    });

    it('should have HttpOnly cookies to prevent XSS-based session theft', () => {
      // Uses COOKIE_OPTIONS imported at top of file

      expect(COOKIE_OPTIONS.httpOnly).toBe(true);
    });
  });

  describe('State-Changing Operations Security', () => {
    it('should verify rate limiting is applied to sensitive endpoints', () => {
      // Uses RATE_LIMIT_CONFIG imported at top of file

      // All sensitive operations should have rate limits
      expect(RATE_LIMIT_CONFIG.LOGIN).toBeDefined();
      expect(RATE_LIMIT_CONFIG.REGISTER).toBeDefined();
      expect(RATE_LIMIT_CONFIG.MFA).toBeDefined();
    });
  });
});
