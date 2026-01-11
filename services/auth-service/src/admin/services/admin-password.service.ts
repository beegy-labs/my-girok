import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { ID } from '@my-girok/nest-common';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import { maskId } from '../../common/utils/logging.utils';
import { PASSWORD_CONFIG } from '../../common/config/constants';

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export interface PasswordHistoryRow {
  id: string;
  adminId: string;
  passwordHash: string;
  changedAt: Date;
}

interface AdminPasswordRow {
  id: string;
  password: string;
  forcePasswordChange: boolean;
  passwordChangedAt: Date | null;
}

@Injectable()
export class AdminPasswordService {
  private readonly logger = new Logger(AdminPasswordService.name);
  private readonly bcryptRounds: number;
  private readonly passwordHistoryCount: number;
  private readonly passwordExpiryDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly outboxService: OutboxService,
  ) {
    this.bcryptRounds = this.configService.get<number>(
      'BCRYPT_ROUNDS',
      PASSWORD_CONFIG.BCRYPT_ROUNDS,
    );
    this.passwordHistoryCount = this.configService.get<number>(
      'PASSWORD_HISTORY_COUNT',
      PASSWORD_CONFIG.HISTORY_COUNT,
    );
    this.passwordExpiryDays = this.configService.get<number>(
      'PASSWORD_EXPIRY_DAYS',
      PASSWORD_CONFIG.EXPIRY_DAYS,
    );
  }

  /**
   * Change admin password (self-service)
   */
  async changePassword(
    adminId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    // Verify current password
    const admin = await this.getAdminPassword(adminId);
    if (!admin) {
      // Return generic message to prevent user enumeration
      return { success: false, message: 'Current password is incorrect' };
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isCurrentValid) {
      return { success: false, message: 'Current password is incorrect' };
    }

    // Validate new password policy
    const validation = this.validatePasswordPolicy(newPassword);
    if (!validation.valid) {
      return { success: false, message: validation.errors.join(', ') };
    }

    // Check password history
    const newHash = await bcrypt.hash(newPassword, this.bcryptRounds);
    const isReused = await this.checkPasswordHistory(adminId, newPassword);
    if (isReused) {
      return {
        success: false,
        message: `Cannot reuse last ${this.passwordHistoryCount} passwords`,
      };
    }

    // Update password
    const now = new Date();
    await this.prisma.$executeRaw`
      UPDATE admins
      SET password = ${newHash},
          password_changed_at = ${now},
          force_password_change = false,
          updated_at = ${now}
      WHERE id = ${adminId}::uuid
    `;

    // Add to password history
    await this.addToPasswordHistory(adminId, newHash, adminId, 'SELF');

    await this.outboxService.addEventDirect('ADMIN_PASSWORD_CHANGED', adminId, {
      adminId,
      changedBy: adminId,
      reason: 'SELF',
      timestamp: now.toISOString(),
    });

    this.logger.log(`Password changed for admin ${maskId(adminId)}`);
    return { success: true, message: 'Password changed successfully' };
  }

  /**
   * Force password change for an admin (by system admin)
   */
  async forcePasswordChange(
    adminId: string,
    requesterId: string,
  ): Promise<{ success: boolean; message: string }> {
    const now = new Date();

    const result = await this.prisma.$executeRaw`
      UPDATE admins
      SET force_password_change = true, updated_at = ${now}
      WHERE id = ${adminId}::uuid AND is_active = true
    `;

    if (result === 0) {
      return { success: false, message: 'Admin not found or inactive' };
    }

    await this.outboxService.addEventDirect('ADMIN_PASSWORD_FORCE_CHANGE', adminId, {
      adminId,
      requesterId,
      timestamp: now.toISOString(),
    });

    this.logger.log(
      `Force password change set for admin ${maskId(adminId)} by ${maskId(requesterId)}`,
    );
    return { success: true, message: 'Password change required on next login' };
  }

  /**
   * Verify admin password
   */
  async verifyPassword(adminId: string, password: string): Promise<boolean> {
    const admin = await this.getAdminPassword(adminId);
    if (!admin) {
      return false;
    }
    return bcrypt.compare(password, admin.password);
  }

  /**
   * Check if password change is required
   */
  async isPasswordChangeRequired(adminId: string): Promise<boolean> {
    const admin = await this.getAdminPassword(adminId);
    if (!admin) {
      return false;
    }

    // Check force flag
    if (admin.forcePasswordChange) {
      return true;
    }

    // Check expiry
    if (admin.passwordChangedAt) {
      const expiryDate = new Date(admin.passwordChangedAt);
      expiryDate.setDate(expiryDate.getDate() + this.passwordExpiryDays);
      if (new Date() > expiryDate) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validate password against policy
   */
  validatePasswordPolicy(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (password.length < PASSWORD_CONFIG.MIN_LENGTH) {
      errors.push(`Password must be at least ${PASSWORD_CONFIG.MIN_LENGTH} characters`);
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate password strength score (0-100)
   * Used for logging and monitoring only
   */
  calculatePasswordStrength(password: string): number {
    let score = 0;
    if (password.length >= PASSWORD_CONFIG.MIN_LENGTH) score += 25;
    if (password.length >= PASSWORD_CONFIG.MIN_LENGTH + 4) score += 10;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score += 20;
    return Math.min(score, 100);
  }

  /**
   * Check if new password matches any in history
   */
  private async checkPasswordHistory(adminId: string, newPassword: string): Promise<boolean> {
    const history = await this.prisma.$queryRaw<PasswordHistoryRow[]>`
      SELECT id, admin_id as "adminId", password_hash as "passwordHash", changed_at as "changedAt"
      FROM admin_password_history
      WHERE admin_id = ${adminId}::uuid
      ORDER BY changed_at DESC
      LIMIT ${this.passwordHistoryCount}
    `;

    for (const entry of history) {
      const matches = await bcrypt.compare(newPassword, entry.passwordHash);
      if (matches) {
        return true;
      }
    }

    return false;
  }

  /**
   * Add password to history
   */
  private async addToPasswordHistory(
    adminId: string,
    passwordHash: string,
    changedBy: string | null,
    reason: 'SELF' | 'FORCED' | 'RESET',
  ): Promise<void> {
    const historyId = ID.generate();
    const now = new Date();

    await this.prisma.$executeRaw`
      INSERT INTO admin_password_history (id, admin_id, password_hash, changed_by, change_reason, changed_at)
      VALUES (${historyId}::uuid, ${adminId}::uuid, ${passwordHash}, ${changedBy}::uuid, ${reason}::admin_password_change_reason, ${now})
      ON CONFLICT (admin_id, password_hash) DO NOTHING
    `;

    // Clean up old history entries (keep only last N)
    await this.prisma.$executeRaw`
      DELETE FROM admin_password_history
      WHERE admin_id = ${adminId}::uuid
        AND id NOT IN (
          SELECT id FROM admin_password_history
          WHERE admin_id = ${adminId}::uuid
          ORDER BY changed_at DESC
          LIMIT ${this.passwordHistoryCount + 1}
        )
    `;
  }

  private async getAdminPassword(adminId: string): Promise<AdminPasswordRow | null> {
    const admins = await this.prisma.$queryRaw<AdminPasswordRow[]>`
      SELECT id, password, force_password_change as "forcePasswordChange",
             password_changed_at as "passwordChangedAt"
      FROM admins
      WHERE id = ${adminId}::uuid
      LIMIT 1
    `;
    return admins[0] ?? null;
  }
}
