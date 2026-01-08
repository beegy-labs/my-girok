import * as crypto from 'crypto';
import * as OTPAuth from 'otpauth';

/**
 * TOTP configuration constants
 */
export const TOTP_CONFIG = {
  ISSUER: 'MyGirok Admin',
  ALGORITHM: 'SHA1' as const,
  DIGITS: 6,
  PERIOD: 30,
  WINDOW: 1, // Allow 1 period before/after for time drift
  SECRET_BYTES: 20, // 160 bits
} as const;

/**
 * Backup code configuration
 */
export const BACKUP_CODE_CONFIG = {
  COUNT: 10,
  LENGTH: 8, // 8 character codes
  CHARSET: '23456789ABCDEFGHJKLMNPQRSTUVWXYZ', // Exclude confusing chars: 0, O, 1, I
} as const;

/**
 * Generate TOTP-compatible secret (base32 encoded)
 * Uses OTPAuth.Secret for RFC 4648 compliant Base32 encoding
 */
export function generateTotpSecret(): string {
  const randomBytes = crypto.randomBytes(TOTP_CONFIG.SECRET_BYTES);
  const bufferCopy = new ArrayBuffer(randomBytes.length);
  const uint8Array = new Uint8Array(bufferCopy);
  uint8Array.set(randomBytes);
  const secret = new OTPAuth.Secret({ buffer: bufferCopy });
  return secret.base32;
}

/**
 * Generate OTPAuth URI for QR code
 */
export function generateQrCodeUri(secret: string, email: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_CONFIG.ISSUER,
    label: email,
    algorithm: TOTP_CONFIG.ALGORITHM,
    digits: TOTP_CONFIG.DIGITS,
    period: TOTP_CONFIG.PERIOD,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.toString();
}

/**
 * Verify TOTP code
 * Returns true if the code is valid within the configured window
 */
export function verifyTotpCode(secret: string, code: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      issuer: TOTP_CONFIG.ISSUER,
      algorithm: TOTP_CONFIG.ALGORITHM,
      digits: TOTP_CONFIG.DIGITS,
      period: TOTP_CONFIG.PERIOD,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    // validate returns the delta (null if invalid)
    const delta = totp.validate({ token: code, window: TOTP_CONFIG.WINDOW });
    return delta !== null;
  } catch {
    return false;
  }
}

/**
 * Generate backup codes for account recovery
 * Returns array of plain text codes (hash before storing)
 */
export function generateBackupCodes(count: number = BACKUP_CODE_CONFIG.COUNT): string[] {
  const codes: string[] = [];
  const charset = BACKUP_CODE_CONFIG.CHARSET;
  const codeLength = BACKUP_CODE_CONFIG.LENGTH;

  for (let i = 0; i < count; i++) {
    let code = '';
    const randomBytes = crypto.randomBytes(codeLength);
    for (let j = 0; j < codeLength; j++) {
      code += charset[randomBytes[j] % charset.length];
    }
    // Format as XXXX-XXXX for readability
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }

  return codes;
}

/**
 * Hash a backup code for secure storage
 */
export function hashBackupCode(code: string): string {
  // Remove formatting (dashes) and uppercase for consistent hashing
  const normalized = code.replace(/-/g, '').toUpperCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Verify a backup code against stored hashes
 * Returns the index of matched code (-1 if not found)
 */
export function verifyBackupCode(code: string, hashedCodes: string[]): number {
  const inputHash = hashBackupCode(code);
  return hashedCodes.findIndex((hash) => hash === inputHash);
}
