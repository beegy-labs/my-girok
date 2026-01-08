import { Injectable, Logger } from '@nestjs/common';
import { ID } from '@my-girok/nest-common';
import { PrismaService } from '../../database/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import {
  generateTotpSecret,
  generateQrCodeUri,
  verifyTotpCode,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode as verifyBackupCodeUtil,
} from '../../common/utils/totp.utils';
import { maskId } from '../../common/utils/logging.utils';

export interface MfaSetupResult {
  success: boolean;
  secret?: string;
  qrCodeUri?: string;
  backupCodes?: string[];
  message: string;
}

export interface MfaConfigRow {
  id: string;
  adminId: string;
  totpSecret: string | null;
  totpEnabled: boolean;
  totpVerifiedAt: Date | null;
  backupCodesHash: string[];
  backupCodesRemaining: number;
  recoveryEmail: string | null;
  recoveryPhone: string | null;
}

@Injectable()
export class AdminMfaService {
  private readonly logger = new Logger(AdminMfaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Setup MFA for an admin (generates secret and backup codes)
   */
  async setupMfa(adminId: string, adminEmail: string): Promise<MfaSetupResult> {
    // Check if MFA already enabled
    const existing = await this.getMfaConfig(adminId);
    if (existing?.totpEnabled) {
      return { success: false, message: 'MFA is already enabled' };
    }

    // Generate new TOTP secret and backup codes
    const secret = generateTotpSecret();
    const qrCodeUri = generateQrCodeUri(secret, adminEmail);
    const backupCodes = generateBackupCodes();
    const backupCodesHash = backupCodes.map((code) => hashBackupCode(code));

    // Encrypt secret before storage
    const encryptedSecret = this.cryptoService.encrypt(secret);

    const now = new Date();
    const configId = existing?.id ?? ID.generate();

    if (existing) {
      // Update existing config
      await this.prisma.$executeRaw`
        UPDATE admin_mfa_configs
        SET totp_secret = ${encryptedSecret},
            totp_enabled = false,
            totp_verified_at = NULL,
            backup_codes_hash = ${backupCodesHash},
            backup_codes_generated_at = ${now},
            backup_codes_remaining = ${backupCodes.length},
            updated_at = ${now}
        WHERE admin_id = ${adminId}::uuid
      `;
    } else {
      // Create new config
      await this.prisma.$executeRaw`
        INSERT INTO admin_mfa_configs (
          id, admin_id, totp_secret, totp_enabled,
          backup_codes_hash, backup_codes_generated_at, backup_codes_remaining,
          created_at, updated_at
        ) VALUES (
          ${configId}::uuid, ${adminId}::uuid, ${encryptedSecret}, false,
          ${backupCodesHash}, ${now}, ${backupCodes.length},
          ${now}, ${now}
        )
      `;
    }

    this.logger.log(`MFA setup initiated for admin ${maskId(adminId)}`);

    return {
      success: true,
      secret,
      qrCodeUri,
      backupCodes,
      message: 'MFA setup initiated. Verify with TOTP code to complete.',
    };
  }

  /**
   * Verify MFA setup with first TOTP code
   */
  async verifyMfaSetup(adminId: string, code: string): Promise<boolean> {
    const config = await this.getMfaConfig(adminId);
    if (!config || !config.totpSecret) {
      this.logger.warn(`MFA not setup for admin ${adminId}`);
      return false;
    }

    if (config.totpEnabled) {
      this.logger.warn(`MFA already enabled for admin ${adminId}`);
      return false;
    }

    // Decrypt secret and verify code
    const secret = this.cryptoService.decrypt(config.totpSecret);
    const isValid = verifyTotpCode(secret, code);

    if (!isValid) {
      this.logger.warn(`Invalid TOTP code during MFA setup for admin ${maskId(adminId)}`);
      return false;
    }

    // Enable MFA
    const now = new Date();
    await this.prisma.$executeRaw`
      UPDATE admin_mfa_configs
      SET totp_enabled = true, totp_verified_at = ${now}, updated_at = ${now}
      WHERE admin_id = ${adminId}::uuid
    `;

    // Update admin record
    await this.prisma.$executeRaw`
      UPDATE admins SET mfa_required = true, updated_at = ${now}
      WHERE id = ${adminId}::uuid
    `;

    await this.outboxService.addEventDirect('ADMIN_MFA_ENABLED', adminId, {
      adminId,
      method: 'TOTP',
      timestamp: now.toISOString(),
    });

    this.logger.log(`MFA enabled for admin ${maskId(adminId)}`);
    return true;
  }

  /**
   * Verify TOTP code during login
   */
  async verifyTotpCode(adminId: string, code: string): Promise<boolean> {
    // TODO: Add TOTP code reuse prevention - track last verified timestamp
    // to prevent replay attacks within the same 30-second window
    const config = await this.getMfaConfig(adminId);
    if (!config || !config.totpEnabled || !config.totpSecret) {
      return false;
    }

    const secret = this.cryptoService.decrypt(config.totpSecret);
    return verifyTotpCode(secret, code);
  }

  /**
   * Verify backup code during login (consumes the code)
   */
  async verifyBackupCode(adminId: string, code: string): Promise<boolean> {
    const config = await this.getMfaConfig(adminId);
    if (!config || !config.totpEnabled || config.backupCodesRemaining === 0) {
      return false;
    }

    const matchIndex = verifyBackupCodeUtil(code, config.backupCodesHash);
    if (matchIndex === -1) {
      return false;
    }

    // Remove used backup code
    const updatedHashes = [...config.backupCodesHash];
    updatedHashes.splice(matchIndex, 1);

    await this.prisma.$executeRaw`
      UPDATE admin_mfa_configs
      SET backup_codes_hash = ${updatedHashes},
          backup_codes_remaining = ${updatedHashes.length},
          updated_at = NOW()
      WHERE admin_id = ${adminId}::uuid
    `;

    this.logger.log(
      `Backup code used for admin ${maskId(adminId)}, ${updatedHashes.length} remaining`,
    );

    if (updatedHashes.length <= 2) {
      this.logger.warn(
        `Low backup codes remaining for admin ${maskId(adminId)}: ${updatedHashes.length} left`,
      );
    }

    return true;
  }

  /**
   * Disable MFA (requires password verification)
   */
  async disableMfa(adminId: string): Promise<boolean> {
    const config = await this.getMfaConfig(adminId);
    if (!config || !config.totpEnabled) {
      return false;
    }

    const now = new Date();
    await this.prisma.$executeRaw`
      UPDATE admin_mfa_configs
      SET totp_enabled = false, totp_secret = NULL,
          backup_codes_hash = '{}', backup_codes_remaining = 0,
          updated_at = ${now}
      WHERE admin_id = ${adminId}::uuid
    `;

    await this.outboxService.addEventDirect('ADMIN_MFA_DISABLED', adminId, {
      adminId,
      timestamp: now.toISOString(),
    });

    this.logger.log(`MFA disabled for admin ${maskId(adminId)}`);
    return true;
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(adminId: string): Promise<string[] | null> {
    const config = await this.getMfaConfig(adminId);
    if (!config || !config.totpEnabled) {
      return null;
    }

    const backupCodes = generateBackupCodes();
    const backupCodesHash = backupCodes.map((code) => hashBackupCode(code));
    const now = new Date();

    await this.prisma.$executeRaw`
      UPDATE admin_mfa_configs
      SET backup_codes_hash = ${backupCodesHash},
          backup_codes_generated_at = ${now},
          backup_codes_remaining = ${backupCodes.length},
          updated_at = ${now}
      WHERE admin_id = ${adminId}::uuid
    `;

    this.logger.log(`Backup codes regenerated for admin ${maskId(adminId)}`);
    return backupCodes;
  }

  /**
   * Check if MFA is enabled for an admin
   */
  async isMfaEnabled(adminId: string): Promise<boolean> {
    const config = await this.getMfaConfig(adminId);
    return config?.totpEnabled ?? false;
  }

  /**
   * Get available MFA methods for an admin
   */
  async getAvailableMethods(adminId: string): Promise<string[]> {
    const config = await this.getMfaConfig(adminId);
    if (!config || !config.totpEnabled) {
      return [];
    }

    const methods: string[] = ['TOTP'];
    if (config.backupCodesRemaining > 0) {
      methods.push('BACKUP_CODE');
    }
    return methods;
  }

  /**
   * Get remaining backup codes count
   */
  async getBackupCodesRemaining(adminId: string): Promise<number> {
    const config = await this.getMfaConfig(adminId);
    return config?.backupCodesRemaining ?? 0;
  }

  private async getMfaConfig(adminId: string): Promise<MfaConfigRow | null> {
    const configs = await this.prisma.$queryRaw<MfaConfigRow[]>`
      SELECT
        id, admin_id as "adminId",
        totp_secret as "totpSecret", totp_enabled as "totpEnabled",
        totp_verified_at as "totpVerifiedAt",
        backup_codes_hash as "backupCodesHash",
        backup_codes_remaining as "backupCodesRemaining",
        recovery_email as "recoveryEmail", recovery_phone as "recoveryPhone"
      FROM admin_mfa_configs
      WHERE admin_id = ${adminId}::uuid
      LIMIT 1
    `;
    return configs[0] ?? null;
  }
}
