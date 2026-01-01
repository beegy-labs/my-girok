import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import * as OTPAuth from 'otpauth';

/**
 * Hash algorithm options for flexible security requirements
 */
export type HashAlgorithm = 'sha256' | 'sha512' | 'sha3-256' | 'sha3-512';

/**
 * Key metadata for rotation support
 */
interface KeyVersion {
  version: number;
  key: Buffer;
  createdAt: Date;
  isActive: boolean;
}

/**
 * Cryptographic service for encryption/decryption operations
 * Used for sensitive data like MFA secrets
 *
 * Features:
 * - AES-256-GCM encryption with key rotation support
 * - Multiple hash algorithms (SHA-256, SHA-512, SHA3)
 * - Secure TOTP secret generation
 * - Token generation with configurable entropy
 *
 * Key Rotation:
 * - Ciphertext format includes version: "v{version}:{iv}:{authTag}:{encrypted}"
 * - Supports multiple active keys for graceful rotation
 * - Old keys can decrypt, only current key encrypts
 */
@Injectable()
export class CryptoService implements OnModuleInit {
  private readonly logger = new Logger(CryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits

  /** Map of key versions for rotation support */
  private readonly keys = new Map<number, KeyVersion>();
  /** Current active key version for encryption */
  private currentKeyVersion: number = 1;

  constructor() {
    this.initializeKeys();
  }

  /**
   * Initialize encryption keys with rotation support
   * Supports ENCRYPTION_KEY (current) and ENCRYPTION_KEY_PREVIOUS (for rotation)
   */
  private initializeKeys(): void {
    const keyEnv = process.env.ENCRYPTION_KEY;
    const previousKeyEnv = process.env.ENCRYPTION_KEY_PREVIOUS;
    const keyVersionEnv = process.env.ENCRYPTION_KEY_VERSION;
    const isProduction = process.env.NODE_ENV === 'production';

    // Parse current key version (default to 1)
    this.currentKeyVersion = keyVersionEnv ? parseInt(keyVersionEnv, 10) : 1;

    if (!keyEnv) {
      if (isProduction) {
        throw new Error(
          'ENCRYPTION_KEY is required in production. Generate with: openssl rand -base64 32',
        );
      }
      this.logger.warn('ENCRYPTION_KEY not set - using development key. DO NOT use in production!');
      // Fixed development key - NEVER use in production
      // This ensures consistent encryption/decryption in development
      const devKey = Buffer.from('dev-only-encryption-key-32bytes!', 'utf8');
      this.keys.set(1, {
        version: 1,
        key: devKey,
        createdAt: new Date(),
        isActive: true,
      });
    } else {
      // Parse current key
      const currentKey = Buffer.from(keyEnv, 'base64');
      if (currentKey.length !== this.keyLength) {
        throw new Error(
          `ENCRYPTION_KEY must be ${this.keyLength} bytes (${Math.ceil(this.keyLength * (4 / 3))} chars base64)`,
        );
      }
      this.keys.set(this.currentKeyVersion, {
        version: this.currentKeyVersion,
        key: currentKey,
        createdAt: new Date(),
        isActive: true,
      });

      // Parse previous key for rotation (if provided)
      if (previousKeyEnv) {
        const previousKey = Buffer.from(previousKeyEnv, 'base64');
        if (previousKey.length !== this.keyLength) {
          this.logger.warn('ENCRYPTION_KEY_PREVIOUS has invalid length, ignoring');
        } else {
          const previousVersion = this.currentKeyVersion - 1;
          this.keys.set(previousVersion, {
            version: previousVersion,
            key: previousKey,
            createdAt: new Date(),
            isActive: false, // Can decrypt but not encrypt
          });
          this.logger.log(
            `Key rotation enabled: v${previousVersion} (previous) + v${this.currentKeyVersion} (current)`,
          );
        }
      }
    }
  }

  onModuleInit(): void {
    this.logger.log(
      `CryptoService initialized with ${this.keys.size} key(s), current version: v${this.currentKeyVersion}`,
    );
  }

  /**
   * Get the current encryption key
   */
  private getCurrentKey(): Buffer {
    const keyVersion = this.keys.get(this.currentKeyVersion);
    if (!keyVersion) {
      throw new Error(`Current encryption key v${this.currentKeyVersion} not found`);
    }
    return keyVersion.key;
  }

  /**
   * Get key by version (for decryption)
   */
  private getKeyByVersion(version: number): Buffer {
    const keyVersion = this.keys.get(version);
    if (!keyVersion) {
      throw new Error(`Encryption key v${version} not found. Key may have been rotated out.`);
    }
    return keyVersion.key;
  }

  /**
   * Encrypt sensitive data with key version
   * Returns versioned format: v{version}:{iv}:{authTag}:{encryptedData}
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const key = this.getCurrentKey();
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Versioned format for key rotation support
    return `v${this.currentKeyVersion}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }

  /**
   * Decrypt sensitive data with key rotation support
   * Supports both legacy format (iv:authTag:encrypted) and versioned format (v{n}:iv:authTag:encrypted)
   */
  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':');

    let keyVersion: number;
    let iv: Buffer;
    let authTag: Buffer;
    let encrypted: string;

    // Check for versioned format (v{n}:iv:authTag:encrypted)
    if (parts.length === 4 && parts[0].startsWith('v')) {
      keyVersion = parseInt(parts[0].substring(1), 10);
      if (isNaN(keyVersion)) {
        throw new Error('Invalid key version in ciphertext');
      }
      iv = Buffer.from(parts[1], 'base64');
      authTag = Buffer.from(parts[2], 'base64');
      encrypted = parts[3];
    }
    // Legacy format (iv:authTag:encrypted) - use current key
    else if (parts.length === 3) {
      keyVersion = this.currentKeyVersion;
      iv = Buffer.from(parts[0], 'base64');
      authTag = Buffer.from(parts[1], 'base64');
      encrypted = parts[2];
    } else {
      throw new Error('Invalid ciphertext format');
    }

    const key = this.getKeyByVersion(keyVersion);
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Re-encrypt data with current key (for key rotation migration)
   * Returns null if already using current key version
   */
  reEncrypt(ciphertext: string): string | null {
    const parts = ciphertext.split(':');

    // Check if already using current key
    if (parts.length === 4 && parts[0] === `v${this.currentKeyVersion}`) {
      return null; // Already using current key
    }

    // Decrypt with old key and encrypt with new key
    const plaintext = this.decrypt(ciphertext);
    return this.encrypt(plaintext);
  }

  /**
   * Check if ciphertext needs re-encryption (using old key)
   */
  needsReEncryption(ciphertext: string): boolean {
    const parts = ciphertext.split(':');
    if (parts.length === 4 && parts[0].startsWith('v')) {
      const version = parseInt(parts[0].substring(1), 10);
      return version < this.currentKeyVersion;
    }
    // Legacy format always needs re-encryption
    return parts.length === 3;
  }

  /**
   * Hash data using configurable algorithm
   * @param data - Data to hash
   * @param algorithm - Hash algorithm (default: sha256)
   * @returns Hex-encoded hash
   */
  hash(data: string, algorithm: HashAlgorithm = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * Hash with SHA-512 (higher security for passwords, tokens)
   */
  hashSha512(data: string): string {
    return this.hash(data, 'sha512');
  }

  /**
   * HMAC-based hash for message authentication
   */
  hmac(data: string, secret: string, algorithm: HashAlgorithm = 'sha256'): string {
    return crypto.createHmac(algorithm, secret).update(data).digest('hex');
  }

  /**
   * Time-safe comparison for hashes (prevents timing attacks)
   */
  secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  /**
   * Generate a random token
   */
  generateToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('base64url');
  }

  /**
   * Generate TOTP-compatible secret (base32 encoded)
   * Uses OTPAuth.Secret for RFC 4648 compliant Base32 encoding
   */
  generateTotpSecret(): string {
    // Generate 20 random bytes (160 bits) for TOTP secret
    const randomBytes = crypto.randomBytes(20);
    // Create a copy to avoid ArrayBuffer pool sharing risk in Node.js
    // Node.js Buffer may share underlying ArrayBuffer pool, potentially leaking data
    const bufferCopy = new ArrayBuffer(randomBytes.length);
    const uint8Array = new Uint8Array(bufferCopy);
    uint8Array.set(randomBytes);
    // Use OTPAuth.Secret for standard-compliant Base32 encoding
    const secret = new OTPAuth.Secret({ buffer: bufferCopy });
    return secret.base32;
  }
}
