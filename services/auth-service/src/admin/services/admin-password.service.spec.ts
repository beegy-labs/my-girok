import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AdminPasswordService } from './admin-password.service';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../../common/outbox/outbox.service';

jest.mock('bcrypt');

describe('AdminPasswordService', () => {
  let service: AdminPasswordService;
  let prismaService: jest.Mocked<PrismaService>;
  let outboxService: jest.Mocked<OutboxService>;

  const mockAdminId = '01935c6d-c2d0-7abc-8def-1234567890ab';
  const mockRequesterId = '01935c6d-c2d0-7abc-8def-1234567890ac';
  const mockPasswordHash = '$2b$12$hashedpassword';
  const validPassword = 'SecureP@ssw0rd123!';

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: number) => {
        const config: Record<string, number> = {
          BCRYPT_ROUNDS: 12,
          PASSWORD_HISTORY_COUNT: 5,
          PASSWORD_EXPIRY_DAYS: 90,
        };
        return config[key] ?? defaultValue;
      }),
    };

    const mockOutboxService = {
      addEventDirect: jest.fn().mockResolvedValue('event-id'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminPasswordService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: OutboxService, useValue: mockOutboxService },
      ],
    }).compile();

    service = module.get<AdminPasswordService>(AdminPasswordService);
    prismaService = module.get(PrismaService);
    outboxService = module.get(OutboxService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validatePasswordPolicy', () => {
    it('should accept valid password', () => {
      const result = service.validatePasswordPolicy(validPassword);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short password', () => {
      const result = service.validatePasswordPolicy('Short1!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters');
    });

    it('should reject password without uppercase', () => {
      const result = service.validatePasswordPolicy('securep@ssw0rd123!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = service.validatePasswordPolicy('SECUREP@SSW0RD123!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = service.validatePasswordPolicy('SecureP@ssword!!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = service.validatePasswordPolicy('SecurePassword123');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should return multiple errors for very weak password', () => {
      const result = service.validatePasswordPolicy('weak');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('changePassword', () => {
    const mockAdmin = {
      id: mockAdminId,
      password: mockPasswordHash,
      forcePasswordChange: false,
      passwordChangedAt: new Date(),
    };

    beforeEach(() => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hash');
    });

    it('should change password successfully', async () => {
      prismaService.$queryRaw
        .mockResolvedValueOnce([mockAdmin]) // getAdminPassword
        .mockResolvedValueOnce([]); // checkPasswordHistory
      prismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.changePassword(mockAdminId, 'currentPassword', validPassword);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password changed successfully');
      expect(outboxService.addEventDirect).toHaveBeenCalledWith(
        'ADMIN_PASSWORD_CHANGED',
        mockAdminId,
        expect.objectContaining({ reason: 'SELF' }),
      );
    });

    it('should fail if admin not found', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.changePassword(mockAdminId, 'currentPassword', validPassword);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Admin not found');
    });

    it('should fail if current password is incorrect', async () => {
      prismaService.$queryRaw.mockResolvedValue([mockAdmin]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.changePassword(mockAdminId, 'wrongPassword', validPassword);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Current password is incorrect');
    });

    it('should fail if new password does not meet policy', async () => {
      prismaService.$queryRaw.mockResolvedValue([mockAdmin]);

      const result = await service.changePassword(mockAdminId, 'currentPassword', 'weak');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Password must be');
    });

    it('should fail if password was recently used', async () => {
      const historyEntry = {
        id: 'history-id',
        adminId: mockAdminId,
        passwordHash: 'old_hash',
        changedAt: new Date(),
      };

      prismaService.$queryRaw
        .mockResolvedValueOnce([mockAdmin]) // getAdminPassword
        .mockResolvedValueOnce([historyEntry]); // checkPasswordHistory

      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // current password check
        .mockResolvedValueOnce(true); // history check - matches

      const result = await service.changePassword(mockAdminId, 'currentPassword', validPassword);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot reuse last');
    });
  });

  describe('forcePasswordChange', () => {
    it('should set force password change flag', async () => {
      prismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.forcePasswordChange(mockAdminId, mockRequesterId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password change required on next login');
      expect(outboxService.addEventDirect).toHaveBeenCalledWith(
        'ADMIN_PASSWORD_FORCE_CHANGE',
        mockAdminId,
        expect.objectContaining({ requesterId: mockRequesterId }),
      );
    });

    it('should fail if admin not found or inactive', async () => {
      prismaService.$executeRaw.mockResolvedValue(0);

      const result = await service.forcePasswordChange(mockAdminId, mockRequesterId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Admin not found or inactive');
    });
  });

  describe('verifyPassword', () => {
    it('should return true for valid password', async () => {
      const mockAdmin = {
        id: mockAdminId,
        password: mockPasswordHash,
        forcePasswordChange: false,
        passwordChangedAt: new Date(),
      };

      prismaService.$queryRaw.mockResolvedValue([mockAdmin]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.verifyPassword(mockAdminId, 'correctPassword');

      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      const mockAdmin = {
        id: mockAdminId,
        password: mockPasswordHash,
        forcePasswordChange: false,
        passwordChangedAt: new Date(),
      };

      prismaService.$queryRaw.mockResolvedValue([mockAdmin]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.verifyPassword(mockAdminId, 'wrongPassword');

      expect(result).toBe(false);
    });

    it('should return false if admin not found', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.verifyPassword(mockAdminId, 'anyPassword');

      expect(result).toBe(false);
    });
  });

  describe('isPasswordChangeRequired', () => {
    it('should return true if force flag is set', async () => {
      const mockAdmin = {
        id: mockAdminId,
        password: mockPasswordHash,
        forcePasswordChange: true,
        passwordChangedAt: new Date(),
      };

      prismaService.$queryRaw.mockResolvedValue([mockAdmin]);

      const result = await service.isPasswordChangeRequired(mockAdminId);

      expect(result).toBe(true);
    });

    it('should return true if password is expired', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 100); // 100 days ago

      const mockAdmin = {
        id: mockAdminId,
        password: mockPasswordHash,
        forcePasswordChange: false,
        passwordChangedAt: expiredDate,
      };

      prismaService.$queryRaw.mockResolvedValue([mockAdmin]);

      const result = await service.isPasswordChangeRequired(mockAdminId);

      expect(result).toBe(true);
    });

    it('should return false if password is not expired', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10); // 10 days ago

      const mockAdmin = {
        id: mockAdminId,
        password: mockPasswordHash,
        forcePasswordChange: false,
        passwordChangedAt: recentDate,
      };

      prismaService.$queryRaw.mockResolvedValue([mockAdmin]);

      const result = await service.isPasswordChangeRequired(mockAdminId);

      expect(result).toBe(false);
    });

    it('should return false if admin not found', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.isPasswordChangeRequired(mockAdminId);

      expect(result).toBe(false);
    });
  });
});
