import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Cryptographic service for encryption/decryption operations
 * Used for sensitive data like MFA secrets
 */
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly encryptionKey: Buffer;

  constructor() {
    const keyEnv = process.env.ENCRYPTION_KEY;
    const isProduction = process.env.NODE_ENV === 'production';

    if (!keyEnv) {
      if (isProduction) {
        throw new Error(
          'ENCRYPTION_KEY is required in production. Generate with: openssl rand -base64 32',
        );
      }
      this.logger.warn('ENCRYPTION_KEY not set - using development key. DO NOT use in production!');
      // Fixed development key - NEVER use in production
      this.encryptionKey = Buffer.from('dev-only-encryption-key-32bytes!', 'utf8');
    } else {
      this.encryptionKey = Buffer.from(keyEnv, 'base64');
      if (this.encryptionKey.length !== this.keyLength) {
        throw new Error(
          `ENCRYPTION_KEY must be ${this.keyLength} bytes (${this.keyLength * (4 / 3)} chars base64)`,
        );
      }
    }
  }

  /**
   * Encrypt sensitive data
   * Returns base64 encoded string: iv:authTag:encryptedData
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }

  /**
   * Decrypt sensitive data
   * Expects base64 encoded string: iv:authTag:encryptedData
   */
  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format');
    }

    const [ivBase64, authTagBase64, encrypted] = parts;
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Hash data using SHA-256
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate a random token
   */
  generateToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('base64url');
  }
}
