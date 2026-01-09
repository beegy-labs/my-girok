import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminMfaService, MfaConfigRow } from './admin-mfa.service';
import { PrismaService } from '../../database/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import * as totpUtils from '../../common/utils/totp.utils';

vi.mock('../../common/utils/totp.utils');

describe('AdminMfaService', () => {
  let service: AdminMfaService;
  let prismaService: Mocked<PrismaService>;
  let cryptoService: Mocked<CryptoService>;
  let outboxService: Mocked<OutboxService>;

  const mockAdminId = '01935c6d-c2d0-7abc-8def-1234567890ab';
  const mockAdminEmail = 'admin@example.com';
  const mockSecret = 'JBSWY3DPEHPK3PXP';
  const mockEncryptedSecret = 'encrypted_secret_data';
  const mockBackupCodes = ['ABCD-1234', 'EFGH-5678', 'IJKL-9012'];
  const mockBackupCodesHash = ['hash1', 'hash2', 'hash3'];

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup mocks for totpUtils
    (totpUtils.generateTotpSecret as Mock).mockReturnValue(mockSecret);
    (totpUtils.generateQrCodeUri as Mock).mockReturnValue(
      `otpauth://totp/MyGirok%20Admin:${mockAdminEmail}?secret=${mockSecret}`,
    );
    (totpUtils.generateBackupCodes as Mock).mockReturnValue(mockBackupCodes);
    (totpUtils.hashBackupCode as Mock).mockImplementation(
      (code) => `hash_${code.replace('-', '')}`,
    );
    (totpUtils.verifyTotpCode as Mock).mockReturnValue(true);
    (totpUtils.verifyBackupCode as Mock).mockReturnValue(-1);

    const mockPrismaService = {
      $queryRaw: vi.fn(),
      $executeRaw: vi.fn(),
    };

    const mockCryptoService = {
      encrypt: vi.fn().mockReturnValue(mockEncryptedSecret),
      decrypt: vi.fn().mockReturnValue(mockSecret),
    };

    const mockOutboxService = {
      addEventDirect: vi.fn().mockResolvedValue('event-id'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminMfaService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CryptoService, useValue: mockCryptoService },
        { provide: OutboxService, useValue: mockOutboxService },
      ],
    }).compile();

    service = module.get<AdminMfaService>(AdminMfaService);
    prismaService = module.get(PrismaService);
    cryptoService = module.get(CryptoService);
    outboxService = module.get(OutboxService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setupMfa', () => {
    it('should setup MFA for new admin', async () => {
      prismaService.$queryRaw.mockResolvedValue([]); // No existing config
      prismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.setupMfa(mockAdminId, mockAdminEmail);

      expect(result.success).toBe(true);
      expect(result.secret).toBe(mockSecret);
      expect(result.qrCodeUri).toContain('otpauth://totp/');
      expect(result.backupCodes).toBeDefined();
      expect(cryptoService.encrypt).toHaveBeenCalledWith(mockSecret);
    });

    it('should update existing MFA config if not enabled', async () => {
      const existingConfig: MfaConfigRow = {
        id: 'config-id',
        adminId: mockAdminId,
        totpSecret: null,
        totpEnabled: false,
        totpVerifiedAt: null,
        backupCodesHash: [],
        backupCodesRemaining: 0,
        recoveryEmail: null,
        recoveryPhone: null,
      };

      prismaService.$queryRaw.mockResolvedValue([existingConfig]);
      prismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.setupMfa(mockAdminId, mockAdminEmail);

      expect(result.success).toBe(true);
    });

    it('should fail if MFA already enabled', async () => {
      const existingConfig: MfaConfigRow = {
        id: 'config-id',
        adminId: mockAdminId,
        totpSecret: mockEncryptedSecret,
        totpEnabled: true,
        totpVerifiedAt: new Date(),
        backupCodesHash: mockBackupCodesHash,
        backupCodesRemaining: 10,
        recoveryEmail: null,
        recoveryPhone: null,
      };

      prismaService.$queryRaw.mockResolvedValue([existingConfig]);

      const result = await service.setupMfa(mockAdminId, mockAdminEmail);

      expect(result.success).toBe(false);
      expect(result.message).toBe('MFA is already enabled');
    });
  });

  describe('verifyMfaSetup', () => {
    it('should verify and enable MFA', async () => {
      const config: MfaConfigRow = {
        id: 'config-id',
        adminId: mockAdminId,
        totpSecret: mockEncryptedSecret,
        totpEnabled: false,
        totpVerifiedAt: null,
        backupCodesHash: mockBackupCodesHash,
        backupCodesRemaining: 10,
        recoveryEmail: null,
        recoveryPhone: null,
      };

      prismaService.$queryRaw.mockResolvedValue([config]);
      prismaService.$executeRaw.mockResolvedValue(1);
      (totpUtils.verifyTotpCode as Mock).mockReturnValue(true);

      const result = await service.verifyMfaSetup(mockAdminId, '123456');

      expect(result).toBe(true);
      expect(outboxService.addEventDirect).toHaveBeenCalledWith(
        'ADMIN_MFA_ENABLED',
        mockAdminId,
        expect.objectContaining({ method: 'TOTP' }),
      );
    });

    it('should fail if MFA not setup', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.verifyMfaSetup(mockAdminId, '123456');

      expect(result).toBe(false);
    });

    it('should fail if MFA already enabled', async () => {
      const config: MfaConfigRow = {
        id: 'config-id',
        adminId: mockAdminId,
        totpSecret: mockEncryptedSecret,
        totpEnabled: true,
        totpVerifiedAt: new Date(),
        backupCodesHash: mockBackupCodesHash,
        backupCodesRemaining: 10,
        recoveryEmail: null,
        recoveryPhone: null,
      };

      prismaService.$queryRaw.mockResolvedValue([config]);

      const result = await service.verifyMfaSetup(mockAdminId, '123456');

      expect(result).toBe(false);
    });

    it('should fail with invalid TOTP code', async () => {
      const config: MfaConfigRow = {
        id: 'config-id',
        adminId: mockAdminId,
        totpSecret: mockEncryptedSecret,
        totpEnabled: false,
        totpVerifiedAt: null,
        backupCodesHash: [],
        backupCodesRemaining: 0,
        recoveryEmail: null,
        recoveryPhone: null,
      };

      prismaService.$queryRaw.mockResolvedValue([config]);
      (totpUtils.verifyTotpCode as Mock).mockReturnValue(false);

      const result = await service.verifyMfaSetup(mockAdminId, 'invalid');

      expect(result).toBe(false);
    });
  });

  describe('verifyTotpCode', () => {
    it('should verify valid TOTP code', async () => {
      const config: MfaConfigRow = {
        id: 'config-id',
        adminId: mockAdminId,
        totpSecret: mockEncryptedSecret,
        totpEnabled: true,
        totpVerifiedAt: new Date(),
        backupCodesHash: [],
        backupCodesRemaining: 0,
        recoveryEmail: null,
        recoveryPhone: null,
      };

      prismaService.$queryRaw.mockResolvedValue([config]);
      (totpUtils.verifyTotpCode as Mock).mockReturnValue(true);

      const result = await service.verifyTotpCode(mockAdminId, '123456');

      expect(result).toBe(true);
      expect(cryptoService.decrypt).toHaveBeenCalledWith(mockEncryptedSecret);
    });

    it('should return false if MFA not enabled', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.verifyTotpCode(mockAdminId, '123456');

      expect(result).toBe(false);
    });
  });

  describe('verifyBackupCode', () => {
    it('should verify and consume backup code', async () => {
      const config: MfaConfigRow = {
        id: 'config-id',
        adminId: mockAdminId,
        totpSecret: mockEncryptedSecret,
        totpEnabled: true,
        totpVerifiedAt: new Date(),
        backupCodesHash: mockBackupCodesHash,
        backupCodesRemaining: 3,
        recoveryEmail: null,
        recoveryPhone: null,
      };

      prismaService.$queryRaw.mockResolvedValue([config]);
      prismaService.$executeRaw.mockResolvedValue(1);
      (totpUtils.verifyBackupCode as Mock).mockReturnValue(1); // Match at index 1

      const result = await service.verifyBackupCode(mockAdminId, 'EFGH-5678');

      expect(result).toBe(true);
      expect(prismaService.$executeRaw).toHaveBeenCalled();
    });

    it('should return false for invalid backup code', async () => {
      const config: MfaConfigRow = {
        id: 'config-id',
        adminId: mockAdminId,
        totpSecret: mockEncryptedSecret,
        totpEnabled: true,
        totpVerifiedAt: new Date(),
        backupCodesHash: mockBackupCodesHash,
        backupCodesRemaining: 3,
        recoveryEmail: null,
        recoveryPhone: null,
      };

      prismaService.$queryRaw.mockResolvedValue([config]);
      (totpUtils.verifyBackupCode as Mock).mockReturnValue(-1);

      const result = await service.verifyBackupCode(mockAdminId, 'INVALID');

      expect(result).toBe(false);
    });

    it('should return false if no backup codes remaining', async () => {
      const config: MfaConfigRow = {
        id: 'config-id',
        adminId: mockAdminId,
        totpSecret: mockEncryptedSecret,
        totpEnabled: true,
        totpVerifiedAt: new Date(),
        backupCodesHash: [],
        backupCodesRemaining: 0,
        recoveryEmail: null,
        recoveryPhone: null,
      };

      prismaService.$queryRaw.mockResolvedValue([config]);

      const result = await service.verifyBackupCode(mockAdminId, 'ABCD-1234');

      expect(result).toBe(false);
    });
  });

  describe('disableMfa', () => {
    it('should disable MFA', async () => {
      const config: MfaConfigRow = {
        id: 'config-id',
        adminId: mockAdminId,
        totpSecret: mockEncryptedSecret,
        totpEnabled: true,
        totpVerifiedAt: new Date(),
        backupCodesHash: mockBackupCodesHash,
        backupCodesRemaining: 10,
        recoveryEmail: null,
        recoveryPhone: null,
      };

      prismaService.$queryRaw.mockResolvedValue([config]);
      prismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.disableMfa(mockAdminId);

      expect(result).toBe(true);
      expect(outboxService.addEventDirect).toHaveBeenCalledWith(
        'ADMIN_MFA_DISABLED',
        mockAdminId,
        expect.any(Object),
      );
    });

    it('should return false if MFA not enabled', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.disableMfa(mockAdminId);

      expect(result).toBe(false);
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should regenerate backup codes', async () => {
      const config: MfaConfigRow = {
        id: 'config-id',
        adminId: mockAdminId,
        totpSecret: mockEncryptedSecret,
        totpEnabled: true,
        totpVerifiedAt: new Date(),
        backupCodesHash: ['old_hash'],
        backupCodesRemaining: 1,
        recoveryEmail: null,
        recoveryPhone: null,
      };

      prismaService.$queryRaw.mockResolvedValue([config]);
      prismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.regenerateBackupCodes(mockAdminId);

      expect(result).toEqual(mockBackupCodes);
    });

    it('should return null if MFA not enabled', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.regenerateBackupCodes(mockAdminId);

      expect(result).toBeNull();
    });
  });

  describe('isMfaEnabled', () => {
    it('should return true if MFA enabled', async () => {
      const config: MfaConfigRow = {
        id: 'config-id',
        adminId: mockAdminId,
        totpSecret: mockEncryptedSecret,
        totpEnabled: true,
        totpVerifiedAt: new Date(),
        backupCodesHash: [],
        backupCodesRemaining: 0,
        recoveryEmail: null,
        recoveryPhone: null,
      };

      prismaService.$queryRaw.mockResolvedValue([config]);

      const result = await service.isMfaEnabled(mockAdminId);

      expect(result).toBe(true);
    });

    it('should return false if MFA not enabled', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.isMfaEnabled(mockAdminId);

      expect(result).toBe(false);
    });
  });

  describe('getAvailableMethods', () => {
    it('should return TOTP and BACKUP_CODE if enabled', async () => {
      const config: MfaConfigRow = {
        id: 'config-id',
        adminId: mockAdminId,
        totpSecret: mockEncryptedSecret,
        totpEnabled: true,
        totpVerifiedAt: new Date(),
        backupCodesHash: mockBackupCodesHash,
        backupCodesRemaining: 3,
        recoveryEmail: null,
        recoveryPhone: null,
      };

      prismaService.$queryRaw.mockResolvedValue([config]);

      const result = await service.getAvailableMethods(mockAdminId);

      expect(result).toContain('TOTP');
      expect(result).toContain('BACKUP_CODE');
    });

    it('should return only TOTP if no backup codes remaining', async () => {
      const config: MfaConfigRow = {
        id: 'config-id',
        adminId: mockAdminId,
        totpSecret: mockEncryptedSecret,
        totpEnabled: true,
        totpVerifiedAt: new Date(),
        backupCodesHash: [],
        backupCodesRemaining: 0,
        recoveryEmail: null,
        recoveryPhone: null,
      };

      prismaService.$queryRaw.mockResolvedValue([config]);

      const result = await service.getAvailableMethods(mockAdminId);

      expect(result).toEqual(['TOTP']);
    });

    it('should return empty array if MFA not enabled', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.getAvailableMethods(mockAdminId);

      expect(result).toEqual([]);
    });
  });

  describe('getBackupCodesRemaining', () => {
    it('should return remaining backup codes count', async () => {
      const config: MfaConfigRow = {
        id: 'config-id',
        adminId: mockAdminId,
        totpSecret: mockEncryptedSecret,
        totpEnabled: true,
        totpVerifiedAt: new Date(),
        backupCodesHash: mockBackupCodesHash,
        backupCodesRemaining: 7,
        recoveryEmail: null,
        recoveryPhone: null,
      };

      prismaService.$queryRaw.mockResolvedValue([config]);

      const result = await service.getBackupCodesRemaining(mockAdminId);

      expect(result).toBe(7);
    });

    it('should return 0 if no config', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.getBackupCodesRemaining(mockAdminId);

      expect(result).toBe(0);
    });
  });
});
