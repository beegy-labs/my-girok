import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';

import { AccountLinkController } from '../../src/users/controllers/account-link.controller';
import { AccountLinkingService } from '../../src/users/services/account-linking.service';
import { generateTestId, resetTestCounter } from '../utils/test-factory';
import { ConsentType } from '@my-girok/types';

describe('AccountLinkController', () => {
  let controller: AccountLinkController;
  let mockAccountLinkingService: {
    findLinkableAccounts: Mock;
    requestLink: Mock;
    acceptLink: Mock;
    getLinkedAccounts: Mock;
    unlinkAccount: Mock;
  };

  const userId = '00000000-0000-7000-0000-000000000001';
  const linkedUserId = '00000000-0000-7000-0000-000000000002';

  const mockUser = {
    sub: userId,
    email: 'test@example.com',
    name: 'Test User',
    type: 'USER_ACCESS',
  };

  beforeEach(async () => {
    resetTestCounter();

    mockAccountLinkingService = {
      findLinkableAccounts: vi.fn(),
      requestLink: vi.fn(),
      acceptLink: vi.fn(),
      getLinkedAccounts: vi.fn(),
      unlinkAccount: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountLinkController],
      providers: [{ provide: AccountLinkingService, useValue: mockAccountLinkingService }],
    }).compile();

    controller = module.get<AccountLinkController>(AccountLinkController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findLinkableAccounts', () => {
    it('should return linkable accounts', async () => {
      // Arrange
      const mockAccounts = [
        {
          id: linkedUserId,
          email: 't***t@example.com',
          services: [{ slug: 'my-girok', name: 'My Girok', joinedAt: new Date() }],
          createdAt: new Date(),
        },
      ];
      mockAccountLinkingService.findLinkableAccounts.mockResolvedValue(mockAccounts);

      // Act
      const result = await controller.findLinkableAccounts(mockUser);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(linkedUserId);
      expect(mockAccountLinkingService.findLinkableAccounts).toHaveBeenCalledWith(userId);
    });

    it('should return empty array when no linkable accounts', async () => {
      // Arrange
      mockAccountLinkingService.findLinkableAccounts.mockResolvedValue([]);

      // Act
      const result = await controller.findLinkableAccounts(mockUser);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('requestLink', () => {
    it('should create link request', async () => {
      // Arrange
      const dto = { linkedUserId };
      const linkId = generateTestId();
      const mockResponse = {
        id: linkId,
        primaryUserId: userId,
        linkedUserId,
        linkedServiceId: generateTestId(),
        status: 'PENDING',
        linkedAt: null,
        createdAt: new Date(),
      };

      mockAccountLinkingService.requestLink.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.requestLink(mockUser, dto);

      // Assert
      expect(result.id).toBe(linkId);
      expect(result.status).toBe('PENDING');
      expect(mockAccountLinkingService.requestLink).toHaveBeenCalledWith(userId, dto);
    });
  });

  describe('acceptLink', () => {
    it('should accept link and return tokens', async () => {
      // Arrange
      const linkId = generateTestId();
      const dto = {
        linkId,
        password: 'password123',
        platformConsents: [{ type: ConsentType.TERMS_OF_SERVICE, countryCode: 'KR', agreed: true }],
      };
      const mockResponse = {
        linkedAt: new Date(),
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockAccountLinkingService.acceptLink.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.acceptLink(mockUser, dto as any);

      // Assert
      expect(result.accessToken).toBe('access-token');
      expect(result.linkedAt).toBeDefined();
      expect(mockAccountLinkingService.acceptLink).toHaveBeenCalledWith(userId, dto);
    });
  });

  describe('getLinkedAccounts', () => {
    it('should return linked accounts', async () => {
      // Arrange
      const linkId = generateTestId();
      const mockAccounts = [
        {
          id: linkId,
          linkedUser: {
            id: linkedUserId,
            email: 'linked@test.com',
            name: 'Linked User',
          },
          service: {
            id: generateTestId(),
            slug: 'my-girok',
            name: 'My Girok',
          },
          linkedAt: new Date(),
        },
      ];

      mockAccountLinkingService.getLinkedAccounts.mockResolvedValue(mockAccounts);

      // Act
      const result = await controller.getLinkedAccounts(mockUser);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].linkedUser.id).toBe(linkedUserId);
      expect(mockAccountLinkingService.getLinkedAccounts).toHaveBeenCalledWith(userId);
    });
  });

  describe('unlinkAccount', () => {
    it('should unlink account', async () => {
      // Arrange
      const linkId = generateTestId();
      mockAccountLinkingService.unlinkAccount.mockResolvedValue(undefined);

      // Act
      await controller.unlinkAccount(mockUser, linkId);

      // Assert
      expect(mockAccountLinkingService.unlinkAccount).toHaveBeenCalledWith(userId, linkId);
    });
  });
});
