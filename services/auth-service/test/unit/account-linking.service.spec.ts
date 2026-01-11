import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AccountLinkingService } from '../../src/users/services/account-linking.service';
import { AuthService } from '../../src/auth/auth.service';
import { PrismaService } from '../../src/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../utils/mock-prisma';
import { generateTestId, resetTestCounter } from '../utils/test-factory';
import { ConsentType } from '@my-girok/types';

vi.mock('bcrypt');

describe('AccountLinkingService', () => {
  let service: AccountLinkingService;
  let mockPrisma: MockPrismaService;
  let mockAuthService: {
    generateTokensWithServices: Mock;
  };

  const primaryUserId = '00000000-0000-7000-0000-000000000001';
  const linkedUserId = '00000000-0000-7000-0000-000000000002';
  const serviceId = '00000000-0000-7000-0000-000000000003';

  const mockPrimaryUser = {
    id: primaryUserId,
    email: 'user@test.com',
    name: 'Primary User',
    password: 'hashed-password',
    accountMode: 'SERVICE',
    createdAt: new Date(),
  };

  const mockLinkedUser = {
    id: linkedUserId,
    email: 'user@test.com', // Same email
    name: 'Linked User',
    password: 'hashed-password',
    accountMode: 'SERVICE',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    resetTestCounter();

    mockPrisma = createMockPrismaService();
    mockAuthService = {
      generateTokensWithServices: vi.fn().mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountLinkingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<AccountLinkingService>(AccountLinkingService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findLinkableAccounts', () => {
    it('should return linkable accounts with same email', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockPrimaryUser]) // get current user
        .mockResolvedValueOnce([
          {
            userId: linkedUserId,
            email: 'user@test.com',
            name: 'Linked User',
            accountMode: 'SERVICE',
            userCreatedAt: new Date(),
            serviceSlug: 'my-girok',
            serviceName: 'My Girok',
            joinedAt: new Date(),
          },
        ]);

      // Act
      const result = await service.findLinkableAccounts(primaryUserId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(linkedUserId);
      expect(result[0].email).toContain('***'); // Should be masked
      expect(result[0].services).toHaveLength(1);
      expect(result[0].services[0].slug).toBe('my-girok');
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      // Act & Assert
      await expect(service.findLinkableAccounts(primaryUserId)).rejects.toThrow(NotFoundException);
    });

    it('should return empty array when no linkable accounts', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([mockPrimaryUser]).mockResolvedValueOnce([]);

      // Act
      const result = await service.findLinkableAccounts(primaryUserId);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should group multiple services under same user', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([mockPrimaryUser]).mockResolvedValueOnce([
        {
          userId: linkedUserId,
          email: 'user@test.com',
          name: 'Linked User',
          accountMode: 'SERVICE',
          userCreatedAt: new Date(),
          serviceSlug: 'service-1',
          serviceName: 'Service 1',
          joinedAt: new Date(),
        },
        {
          userId: linkedUserId,
          email: 'user@test.com',
          name: 'Linked User',
          accountMode: 'SERVICE',
          userCreatedAt: new Date(),
          serviceSlug: 'service-2',
          serviceName: 'Service 2',
          joinedAt: new Date(),
        },
      ]);

      // Act
      const result = await service.findLinkableAccounts(primaryUserId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].services).toHaveLength(2);
    });
  });

  describe('requestLink', () => {
    it('should create a pending link request', async () => {
      // Arrange
      const linkId = generateTestId();
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockPrimaryUser])
        .mockResolvedValueOnce([mockLinkedUser])
        .mockResolvedValueOnce([{ serviceId }]) // linked user services
        .mockResolvedValueOnce([
          {
            id: linkId,
            primaryUserId,
            linkedUserId,
            linkedServiceId: serviceId,
            status: 'PENDING',
            linkedAt: null,
            createdAt: new Date(),
          },
        ]);

      // Act
      const result = await service.requestLink(primaryUserId, {
        linkedUserId,
      });

      // Assert
      expect(result.id).toBe(linkId);
      expect(result.primaryUserId).toBe(primaryUserId);
      expect(result.linkedUserId).toBe(linkedUserId);
      expect(result.status).toBe('PENDING');
    });

    it('should throw NotFoundException when primary user not found', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      // Act & Assert
      await expect(service.requestLink(primaryUserId, { linkedUserId })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when linked user not found', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([mockPrimaryUser]).mockResolvedValueOnce([]);

      // Act & Assert
      await expect(service.requestLink(primaryUserId, { linkedUserId })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when both accounts are UNIFIED', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ ...mockPrimaryUser, accountMode: 'UNIFIED' }])
        .mockResolvedValueOnce([{ ...mockLinkedUser, accountMode: 'UNIFIED' }]);

      // Act & Assert
      await expect(service.requestLink(primaryUserId, { linkedUserId })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when linked user has no service', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockPrimaryUser])
        .mockResolvedValueOnce([mockLinkedUser])
        .mockResolvedValueOnce([]); // no services

      // Act & Assert
      await expect(service.requestLink(primaryUserId, { linkedUserId })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException when link already exists', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockPrimaryUser])
        .mockResolvedValueOnce([mockLinkedUser])
        .mockResolvedValueOnce([{ serviceId }])
        .mockResolvedValueOnce([]) // INSERT returns empty (conflict)
        .mockResolvedValueOnce([{ id: generateTestId() }]); // reverse check found

      // Act & Assert
      await expect(service.requestLink(primaryUserId, { linkedUserId })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('acceptLink', () => {
    const linkId = generateTestId();
    const platformConsents = [
      { type: ConsentType.TERMS_OF_SERVICE, countryCode: 'KR', agreed: true },
    ];

    it('should accept link and return new tokens', async () => {
      // Arrange
      const mockLink = {
        id: linkId,
        primaryUserId,
        linkedUserId,
        linkedServiceId: serviceId,
        status: 'PENDING',
        linkedAt: null,
        createdAt: new Date(),
        primaryEmail: 'user@test.com',
        linkedEmail: 'user@test.com',
        linkedPassword: 'hashed-password',
      };

      mockPrisma.$queryRaw.mockResolvedValueOnce([mockLink]);
      (bcrypt.compare as Mock).mockResolvedValue(true);

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $executeRaw: vi.fn().mockResolvedValue(1),
          $queryRaw: vi
            .fn()
            .mockResolvedValueOnce([]) // collectPlatformConsentTx - existing
            .mockResolvedValueOnce([
              {
                userId: primaryUserId,
                serviceId,
                serviceSlug: 'my-girok',
                serviceName: 'My Girok',
                countryCode: 'KR',
                status: 'ACTIVE',
                joinedAt: new Date(),
              },
            ]) // allServices
            .mockResolvedValueOnce([
              { id: primaryUserId, email: 'user@test.com', countryCode: 'KR' },
            ]), // primaryUser
        };
        return callback(tx);
      });

      // Act
      const result = await service.acceptLink(linkedUserId, {
        linkId,
        password: 'password123',
        platformConsents,
      });

      // Assert
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.linkedAt).toBeDefined();
    });

    it('should throw NotFoundException when link not found', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      // Act & Assert
      await expect(
        service.acceptLink(linkedUserId, {
          linkId,
          password: 'password123',
          platformConsents,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException when password verification required but not set', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        {
          id: linkId,
          primaryUserId,
          linkedUserId,
          linkedServiceId: serviceId,
          status: 'PENDING',
          linkedPassword: null, // No password
        },
      ]);

      // Act & Assert
      await expect(
        service.acceptLink(linkedUserId, {
          linkId,
          password: 'password123',
          platformConsents,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        {
          id: linkId,
          primaryUserId,
          linkedUserId,
          linkedServiceId: serviceId,
          status: 'PENDING',
          linkedPassword: 'hashed-password',
        },
      ]);
      (bcrypt.compare as Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.acceptLink(linkedUserId, {
          linkId,
          password: 'wrong-password',
          platformConsents,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getLinkedAccounts', () => {
    it('should return linked accounts', async () => {
      // Arrange
      const linkId = generateTestId();
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        {
          id: linkId,
          primaryUserId,
          linkedUserId,
          linkedAt: new Date(),
          primaryEmail: 'primary@test.com',
          primaryName: 'Primary User',
          linkedEmail: 'linked@test.com',
          linkedName: 'Linked User',
          serviceId,
          serviceSlug: 'my-girok',
          serviceName: 'My Girok',
        },
      ]);

      // Act
      const result = await service.getLinkedAccounts(primaryUserId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(linkId);
      expect(result[0].linkedUser.id).toBe(linkedUserId);
      expect(result[0].service.slug).toBe('my-girok');
    });

    it('should return correct linked user based on perspective', async () => {
      // Arrange
      const linkId = generateTestId();
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        {
          id: linkId,
          primaryUserId,
          linkedUserId,
          linkedAt: new Date(),
          primaryEmail: 'primary@test.com',
          primaryName: 'Primary User',
          linkedEmail: 'linked@test.com',
          linkedName: 'Linked User',
          serviceId,
          serviceSlug: 'my-girok',
          serviceName: 'My Girok',
        },
      ]);

      // Act - calling as linked user
      const result = await service.getLinkedAccounts(linkedUserId);

      // Assert - should show primary as the linked user
      expect(result[0].linkedUser.id).toBe(primaryUserId);
    });
  });

  describe('unlinkAccount', () => {
    const linkId = generateTestId();

    it('should unlink account and revert to SERVICE mode', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        {
          id: linkId,
          primaryUserId,
          linkedUserId,
          linkedServiceId: serviceId,
          status: 'ACTIVE',
        },
      ]);

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $executeRaw: vi.fn().mockResolvedValue(1),
          $queryRaw: vi
            .fn()
            .mockResolvedValueOnce([{ count: BigInt(0) }]) // no other links for primary
            .mockResolvedValueOnce([{ count: BigInt(0) }]), // no other links for linked
        };
        return callback(tx);
      });

      // Act
      await service.unlinkAccount(primaryUserId, linkId);

      // Assert
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when link not found', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      // Act & Assert
      await expect(service.unlinkAccount(primaryUserId, linkId)).rejects.toThrow(NotFoundException);
    });

    it('should keep UNIFIED mode when other links exist', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        {
          id: linkId,
          primaryUserId,
          linkedUserId,
          linkedServiceId: serviceId,
          status: 'ACTIVE',
        },
      ]);

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $executeRaw: vi.fn().mockResolvedValue(1),
          $queryRaw: vi
            .fn()
            .mockResolvedValueOnce([{ count: BigInt(1) }]) // has other links for primary
            .mockResolvedValueOnce([{ count: BigInt(1) }]), // has other links for linked
        };
        return callback(tx);
      });

      // Act
      await service.unlinkAccount(primaryUserId, linkId);

      // Assert
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
