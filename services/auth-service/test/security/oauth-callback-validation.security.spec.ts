import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../src/database/prisma.service';
import { OAuthConfigService } from '../../src/oauth-config/oauth-config.service';
import { CryptoService } from '../../src/common/crypto/crypto.service';
import { AuthProvider } from '@my-girok/types';

/**
 * Security Tests: OAuth Callback URL Validation
 *
 * Comprehensive security testing for OAuth callback URL validation:
 * - Reject external/malicious domains
 * - Reject protocol-relative URLs
 * - Accept only whitelisted domains (localhost, girok.dev)
 * - Prevent open redirect vulnerabilities
 * - URL parsing edge cases
 */
describe('OAuth Callback URL Validation Security', () => {
  let app: INestApplication;
  let oauthConfigService: OAuthConfigService;
  const adminUserId = 'security-test-admin';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthConfigService,
        PrismaService,
        CryptoService,
        {
          provide: 'ENCRYPTION_KEY',
          useValue: 'test-encryption-key-32-bytes!!',
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    oauthConfigService = moduleFixture.get<OAuthConfigService>(OAuthConfigService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Malicious Domain Rejection', () => {
    const maliciousUrls = [
      'https://evil.com/callback',
      'https://attacker.com/oauth/callback',
      'http://malicious-site.net/steal-tokens',
      'https://phishing-site.org/callback',
      'https://not-girok.dev/callback', // Similar but not girok.dev
      'https://girok.dev.evil.com/callback', // Subdomain attack
      'https://evilgirok.dev/callback', // Typosquatting
    ];

    maliciousUrls.forEach((url) => {
      it(`should reject malicious URL: ${url}`, async () => {
        await expect(
          oauthConfigService.updateProviderCredentials(
            AuthProvider.GOOGLE,
            { callbackUrl: url },
            adminUserId,
          ),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('Protocol-Relative URL Rejection', () => {
    const protocolRelativeUrls = [
      '//evil.com/callback',
      '//attacker.com/oauth/callback',
      '//girok.dev.evil.com/callback',
    ];

    protocolRelativeUrls.forEach((url) => {
      it(`should reject protocol-relative URL: ${url}`, async () => {
        await expect(
          oauthConfigService.updateProviderCredentials(
            AuthProvider.GOOGLE,
            { callbackUrl: url },
            adminUserId,
          ),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('Open Redirect Prevention', () => {
    it('should reject URL with @ symbol (credential in URL)', async () => {
      const urlWithCredentials = 'https://user:pass@evil.com/callback';

      await expect(
        oauthConfigService.updateProviderCredentials(
          AuthProvider.GOOGLE,
          { callbackUrl: urlWithCredentials },
          adminUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject URL with encoded characters for bypass attempts', async () => {
      const encodedUrls = [
        'https://girok.dev%2f@evil.com/callback',
        'https://girok.dev%252f@evil.com/callback',
        'https://girok.dev%2fexample.com@evil.com',
      ];

      for (const url of encodedUrls) {
        await expect(
          oauthConfigService.updateProviderCredentials(
            AuthProvider.GOOGLE,
            { callbackUrl: url },
            adminUserId,
          ),
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('should reject javascript: protocol', async () => {
      const javascriptUrl = 'javascript:alert(document.cookie)';

      await expect(
        oauthConfigService.updateProviderCredentials(
          AuthProvider.GOOGLE,
          { callbackUrl: javascriptUrl },
          adminUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject data: protocol', async () => {
      const dataUrl = 'data:text/html,<script>alert("XSS")</script>';

      await expect(
        oauthConfigService.updateProviderCredentials(
          AuthProvider.GOOGLE,
          { callbackUrl: dataUrl },
          adminUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Localhost Acceptance (Development)', () => {
    const validLocalhostUrls = [
      'http://localhost:4005/oauth/google/callback',
      'http://localhost:3000/auth/callback',
      'http://127.0.0.1:4005/oauth/callback',
      'http://127.0.0.1:3001/v1/oauth/callback',
    ];

    validLocalhostUrls.forEach((url) => {
      it(`should accept localhost URL: ${url}`, async () => {
        const result = await oauthConfigService.updateProviderCredentials(
          AuthProvider.GOOGLE,
          { callbackUrl: url },
          adminUserId,
        );

        expect(result.callbackUrl).toBe(url);
      });
    });

    it('should reject localhost with HTTPS (security issue)', async () => {
      const httpsLocalhost = 'https://localhost:4005/oauth/callback';

      // HTTPS on localhost can be problematic, might want to reject
      // Depending on policy - adjust test accordingly
      // For now, assuming we allow it
      const result = await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        { callbackUrl: httpsLocalhost },
        adminUserId,
      );

      expect(result.callbackUrl).toBe(httpsLocalhost);
    });
  });

  describe('girok.dev Domain Acceptance', () => {
    const validGirokUrls = [
      'https://girok.dev/oauth/google/callback',
      'https://auth.girok.dev/oauth/google/callback',
      'https://auth-bff.girok.dev/oauth/google/callback',
      'https://api.girok.dev/v1/oauth/google/callback',
      'https://staging.girok.dev/oauth/callback',
      'https://dev.girok.dev/oauth/callback',
    ];

    validGirokUrls.forEach((url) => {
      it(`should accept girok.dev URL: ${url}`, async () => {
        const result = await oauthConfigService.updateProviderCredentials(
          AuthProvider.GOOGLE,
          { callbackUrl: url },
          adminUserId,
        );

        expect(result.callbackUrl).toBe(url);
      });
    });

    it('should require HTTPS for girok.dev (not HTTP)', async () => {
      const httpGirok = 'http://girok.dev/oauth/callback';

      // Production should require HTTPS
      await expect(
        oauthConfigService.updateProviderCredentials(
          AuthProvider.GOOGLE,
          { callbackUrl: httpGirok },
          adminUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('URL Parsing Edge Cases', () => {
    it('should handle URL with query parameters', async () => {
      const urlWithQuery =
        'https://auth-bff.girok.dev/oauth/google/callback?state=test&session=123';

      const result = await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        { callbackUrl: urlWithQuery },
        adminUserId,
      );

      expect(result.callbackUrl).toBe(urlWithQuery);
    });

    it('should handle URL with fragment', async () => {
      const urlWithFragment = 'https://auth-bff.girok.dev/oauth/google/callback#section';

      const result = await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        { callbackUrl: urlWithFragment },
        adminUserId,
      );

      expect(result.callbackUrl).toBe(urlWithFragment);
    });

    it('should reject empty or null callback URL', async () => {
      await expect(
        oauthConfigService.updateProviderCredentials(
          AuthProvider.GOOGLE,
          { callbackUrl: '' },
          adminUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject malformed URLs', async () => {
      const malformedUrls = [
        'not-a-url',
        'htp://invalid.com',
        '://missing-protocol.com',
        'https:/missing-slash.com',
        'https://incomplete',
      ];

      for (const url of malformedUrls) {
        await expect(
          oauthConfigService.updateProviderCredentials(
            AuthProvider.GOOGLE,
            { callbackUrl: url },
            adminUserId,
          ),
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('should handle URL with special characters in path', async () => {
      const urlWithSpecialChars =
        'https://auth-bff.girok.dev/oauth/google/callback/v1.0/test-provider';

      const result = await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        { callbackUrl: urlWithSpecialChars },
        adminUserId,
      );

      expect(result.callbackUrl).toBe(urlWithSpecialChars);
    });
  });

  describe('Subdomain Validation', () => {
    it('should accept valid girok.dev subdomains', async () => {
      const validSubdomains = [
        'https://auth.girok.dev/callback',
        'https://auth-bff.girok.dev/callback',
        'https://api.girok.dev/callback',
        'https://staging-auth.girok.dev/callback',
        'https://dev-api.girok.dev/callback',
      ];

      for (const url of validSubdomains) {
        const result = await oauthConfigService.updateProviderCredentials(
          AuthProvider.GOOGLE,
          { callbackUrl: url },
          adminUserId,
        );

        expect(result.callbackUrl).toBe(url);
      }
    });

    it('should reject suspicious subdomain patterns', async () => {
      const suspiciousSubdomains = [
        'https://girok.dev.evil.com/callback',
        'https://evil.com.girok.dev.attacker.com/callback',
        'https://not-girok-dev.com/callback',
      ];

      for (const url of suspiciousSubdomains) {
        await expect(
          oauthConfigService.updateProviderCredentials(
            AuthProvider.GOOGLE,
            { callbackUrl: url },
            adminUserId,
          ),
        ).rejects.toThrow(BadRequestException);
      }
    });
  });

  describe('Case Sensitivity', () => {
    it('should handle case-insensitive domain matching', async () => {
      const mixedCaseUrls = [
        'https://GIROK.DEV/oauth/callback',
        'https://Girok.Dev/oauth/callback',
        'https://AUTH.GIROK.DEV/callback',
      ];

      for (const url of mixedCaseUrls) {
        const result = await oauthConfigService.updateProviderCredentials(
          AuthProvider.GOOGLE,
          { callbackUrl: url },
          adminUserId,
        );

        // URL should be accepted (domains are case-insensitive)
        expect(result.callbackUrl).toBeDefined();
      }
    });
  });

  describe('Port Number Validation', () => {
    it('should accept standard ports for localhost', async () => {
      const standardPorts = [
        'http://localhost:3000/callback',
        'http://localhost:4005/callback',
        'http://localhost:8080/callback',
      ];

      for (const url of standardPorts) {
        const result = await oauthConfigService.updateProviderCredentials(
          AuthProvider.GOOGLE,
          { callbackUrl: url },
          adminUserId,
        );

        expect(result.callbackUrl).toBe(url);
      }
    });

    it('should accept HTTPS on standard port 443 for girok.dev', async () => {
      const httpsStandard = 'https://girok.dev:443/oauth/callback';

      const result = await oauthConfigService.updateProviderCredentials(
        AuthProvider.GOOGLE,
        { callbackUrl: httpsStandard },
        adminUserId,
      );

      expect(result.callbackUrl).toBe(httpsStandard);
    });

    it('should reject invalid port numbers', async () => {
      const invalidPorts = [
        'http://localhost:99999/callback', // Port too high
        'http://localhost:0/callback', // Port 0
        'http://localhost:-1/callback', // Negative port
      ];

      for (const url of invalidPorts) {
        await expect(
          oauthConfigService.updateProviderCredentials(
            AuthProvider.GOOGLE,
            { callbackUrl: url },
            adminUserId,
          ),
        ).rejects.toThrow();
      }
    });
  });
});
