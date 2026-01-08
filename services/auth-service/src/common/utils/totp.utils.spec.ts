import * as OTPAuth from 'otpauth';
import {
  generateTotpSecret,
  generateQrCodeUri,
  verifyTotpCode,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  TOTP_CONFIG,
  BACKUP_CODE_CONFIG,
} from './totp.utils';

describe('TOTP Utils', () => {
  describe('generateTotpSecret', () => {
    it('should generate a base32 encoded secret', () => {
      const secret = generateTotpSecret();

      expect(secret).toBeDefined();
      expect(typeof secret).toBe('string');
      // Base32 only contains A-Z and 2-7
      expect(secret).toMatch(/^[A-Z2-7]+$/);
    });

    it('should generate unique secrets', () => {
      const secrets = new Set<string>();
      for (let i = 0; i < 100; i++) {
        secrets.add(generateTotpSecret());
      }
      expect(secrets.size).toBe(100);
    });

    it('should generate secrets of consistent length', () => {
      const secret1 = generateTotpSecret();
      const secret2 = generateTotpSecret();
      // 20 bytes = 160 bits = 32 base32 characters
      expect(secret1.length).toBe(32);
      expect(secret2.length).toBe(32);
    });
  });

  describe('generateQrCodeUri', () => {
    it('should generate a valid OTPAuth URI', () => {
      const secret = generateTotpSecret();
      const email = 'admin@example.com';

      const uri = generateQrCodeUri(secret, email);

      expect(uri).toMatch(/^otpauth:\/\/totp\//);
      expect(uri).toContain(encodeURIComponent(TOTP_CONFIG.ISSUER));
      expect(uri).toContain(encodeURIComponent(email));
      expect(uri).toContain('secret=');
      expect(uri).toContain('algorithm=SHA1');
      expect(uri).toContain('digits=6');
      expect(uri).toContain('period=30');
    });

    it('should handle special characters in email', () => {
      const secret = generateTotpSecret();
      const email = 'admin+test@example.com';

      const uri = generateQrCodeUri(secret, email);

      expect(uri).toContain(encodeURIComponent(email));
    });
  });

  describe('verifyTotpCode', () => {
    it('should verify a valid TOTP code', () => {
      const secret = generateTotpSecret();

      // Generate current code
      const totp = new OTPAuth.TOTP({
        issuer: TOTP_CONFIG.ISSUER,
        algorithm: TOTP_CONFIG.ALGORITHM,
        digits: TOTP_CONFIG.DIGITS,
        period: TOTP_CONFIG.PERIOD,
        secret: OTPAuth.Secret.fromBase32(secret),
      });

      const currentCode = totp.generate();

      expect(verifyTotpCode(secret, currentCode)).toBe(true);
    });

    it('should reject an invalid code', () => {
      const secret = generateTotpSecret();

      expect(verifyTotpCode(secret, '000000')).toBe(false);
      expect(verifyTotpCode(secret, '123456')).toBe(false);
    });

    it('should reject codes with wrong length', () => {
      const secret = generateTotpSecret();

      expect(verifyTotpCode(secret, '12345')).toBe(false);
      expect(verifyTotpCode(secret, '1234567')).toBe(false);
    });

    it('should handle invalid secret gracefully', () => {
      expect(verifyTotpCode('invalid-secret', '123456')).toBe(false);
      expect(verifyTotpCode('', '123456')).toBe(false);
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate default number of backup codes', () => {
      const codes = generateBackupCodes();

      expect(codes.length).toBe(BACKUP_CODE_CONFIG.COUNT);
    });

    it('should generate specified number of codes', () => {
      const codes = generateBackupCodes(5);

      expect(codes.length).toBe(5);
    });

    it('should generate codes in XXXX-XXXX format', () => {
      const codes = generateBackupCodes();

      codes.forEach((code) => {
        expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      });
    });

    it('should generate unique codes', () => {
      const codes = generateBackupCodes(100);
      const uniqueCodes = new Set(codes);

      expect(uniqueCodes.size).toBe(100);
    });

    it('should not contain confusing characters', () => {
      const codes = generateBackupCodes(100);
      const confusingChars = /[0O1I]/;

      codes.forEach((code) => {
        expect(code).not.toMatch(confusingChars);
      });
    });
  });

  describe('hashBackupCode', () => {
    it('should hash a backup code', () => {
      const code = 'ABCD-1234';
      const hash = hashBackupCode(code);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should produce consistent hashes', () => {
      const code = 'ABCD-1234';
      const hash1 = hashBackupCode(code);
      const hash2 = hashBackupCode(code);

      expect(hash1).toBe(hash2);
    });

    it('should normalize case before hashing', () => {
      const hash1 = hashBackupCode('abcd-1234');
      const hash2 = hashBackupCode('ABCD-1234');

      expect(hash1).toBe(hash2);
    });

    it('should normalize dashes before hashing', () => {
      const hash1 = hashBackupCode('ABCD-1234');
      const hash2 = hashBackupCode('ABCD1234');

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different codes', () => {
      const hash1 = hashBackupCode('ABCD-1234');
      const hash2 = hashBackupCode('EFGH-5678');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyBackupCode', () => {
    it('should find matching backup code', () => {
      const codes = ['ABCD-1234', 'EFGH-5678', 'IJKL-9012'];
      const hashedCodes = codes.map(hashBackupCode);

      expect(verifyBackupCode('ABCD-1234', hashedCodes)).toBe(0);
      expect(verifyBackupCode('EFGH-5678', hashedCodes)).toBe(1);
      expect(verifyBackupCode('IJKL-9012', hashedCodes)).toBe(2);
    });

    it('should return -1 for non-matching code', () => {
      const codes = ['ABCD-1234', 'EFGH-5678'];
      const hashedCodes = codes.map(hashBackupCode);

      expect(verifyBackupCode('WXYZ-9999', hashedCodes)).toBe(-1);
    });

    it('should handle case-insensitive matching', () => {
      const hashedCodes = [hashBackupCode('ABCD-1234')];

      expect(verifyBackupCode('abcd-1234', hashedCodes)).toBe(0);
    });

    it('should handle codes without dashes', () => {
      const hashedCodes = [hashBackupCode('ABCD-1234')];

      expect(verifyBackupCode('ABCD1234', hashedCodes)).toBe(0);
    });

    it('should return -1 for empty hashed codes array', () => {
      expect(verifyBackupCode('ABCD-1234', [])).toBe(-1);
    });
  });

  describe('Integration: Full TOTP workflow', () => {
    it('should complete full MFA setup and verification flow', () => {
      // 1. Generate secret
      const secret = generateTotpSecret();
      expect(secret).toBeDefined();

      // 2. Generate QR code URI
      const uri = generateQrCodeUri(secret, 'admin@example.com');
      expect(uri).toContain('otpauth://totp/');

      // 3. Generate current TOTP code (simulating authenticator app)
      const totp = new OTPAuth.TOTP({
        issuer: TOTP_CONFIG.ISSUER,
        algorithm: TOTP_CONFIG.ALGORITHM,
        digits: TOTP_CONFIG.DIGITS,
        period: TOTP_CONFIG.PERIOD,
        secret: OTPAuth.Secret.fromBase32(secret),
      });
      const code = totp.generate();

      // 4. Verify the code
      expect(verifyTotpCode(secret, code)).toBe(true);
    });

    it('should complete full backup code workflow', () => {
      // 1. Generate backup codes
      const codes = generateBackupCodes();
      expect(codes.length).toBe(10);

      // 2. Hash codes for storage
      const hashedCodes = codes.map(hashBackupCode);

      // 3. Verify a backup code
      const usedIndex = verifyBackupCode(codes[3], hashedCodes);
      expect(usedIndex).toBe(3);

      // 4. Remove used code
      hashedCodes.splice(usedIndex, 1);
      expect(hashedCodes.length).toBe(9);

      // 5. Same code should not work again
      expect(verifyBackupCode(codes[3], hashedCodes)).toBe(-1);
    });
  });
});
