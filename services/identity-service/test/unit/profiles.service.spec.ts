import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProfilesService } from '../../src/identity/profiles/profiles.service';
import { IdentityPrismaService } from '../../src/database/identity-prisma.service';
import { Gender } from '.prisma/identity-client';

// Type for mocked Prisma service with jest.fn() methods
type MockPrismaProfile = {
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

describe('ProfilesService', () => {
  let service: ProfilesService;
  let prisma: { profile: MockPrismaProfile };

  const mockProfile = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    accountId: '223e4567-e89b-12d3-a456-426614174001',
    displayName: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    avatar: null,
    bio: null,
    birthDate: null,
    gender: null as Gender | null,
    phoneCountryCode: null,
    phoneNumber: null,
    countryCode: null,
    region: null,
    city: null,
    address: null,
    postalCode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      profile: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProfilesService, { provide: IdentityPrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
    prisma = module.get(IdentityPrismaService);
  });

  describe('findByAccountId', () => {
    it('should return profile when found', async () => {
      prisma.profile.findUnique.mockResolvedValue(mockProfile as never);

      const result = await service.findByAccountId(mockProfile.accountId);

      expect(result.id).toBe(mockProfile.id);
      expect(result.displayName).toBe(mockProfile.displayName);
      expect(prisma.profile.findUnique).toHaveBeenCalledWith({
        where: { accountId: mockProfile.accountId },
      });
    });

    it('should throw NotFoundException when profile not found', async () => {
      prisma.profile.findUnique.mockResolvedValue(null);

      await expect(service.findByAccountId('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new profile successfully', async () => {
      prisma.profile.create.mockResolvedValue(mockProfile as never);

      const result = await service.create(mockProfile.accountId, 'Test User');

      expect(result.displayName).toBe('Test User');
      expect(prisma.profile.create).toHaveBeenCalledWith({
        data: {
          accountId: mockProfile.accountId,
          displayName: 'Test User',
        },
      });
    });

    it('should sanitize display name with XSS attempts', async () => {
      prisma.profile.create.mockResolvedValue({
        ...mockProfile,
        displayName: 'Test User',
      } as never);

      await service.create(mockProfile.accountId, '<script>alert("xss")</script>Test User');

      expect(prisma.profile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          displayName: expect.not.stringContaining('<script>'),
        }),
      });
    });
  });

  describe('update', () => {
    it('should update profile successfully', async () => {
      prisma.profile.update.mockResolvedValue({
        ...mockProfile,
        displayName: 'Updated Name',
        bio: 'New bio',
      } as never);

      const result = await service.update(mockProfile.accountId, {
        displayName: 'Updated Name',
        bio: 'New bio',
      });

      expect(result.displayName).toBe('Updated Name');
      expect(result.bio).toBe('New bio');
    });

    it('should sanitize all string inputs', async () => {
      prisma.profile.update.mockResolvedValue(mockProfile as never);

      await service.update(mockProfile.accountId, {
        displayName: '<script>alert("xss")</script>Name',
        bio: '<img src=x onerror=alert("xss")>Bio',
        firstName: 'John<script>',
        lastName: 'Doe',
      });

      expect(prisma.profile.update).toHaveBeenCalledWith({
        where: { accountId: mockProfile.accountId },
        data: expect.objectContaining({
          displayName: expect.not.stringContaining('<script>'),
          bio: expect.not.stringContaining('<img'),
        }),
      });
    });

    it('should update partial fields only', async () => {
      prisma.profile.update.mockResolvedValue({
        ...mockProfile,
        displayName: 'New Name',
      } as never);

      await service.update(mockProfile.accountId, {
        displayName: 'New Name',
      });

      const callData = (prisma.profile.update as jest.Mock).mock.calls[0][0].data;
      expect(callData.displayName).toBe('New Name');
      // undefined fields should not be in the update data
      expect('bio' in callData && callData.bio !== undefined).toBe(false);
    });

    it('should update gender field correctly', async () => {
      prisma.profile.update.mockResolvedValue({
        ...mockProfile,
        gender: 'MALE' as Gender,
      } as never);

      const result = await service.update(mockProfile.accountId, {
        gender: 'MALE' as Gender,
      });

      expect(result.gender).toBe('MALE');
    });

    it('should update birthDate field correctly', async () => {
      const birthDate = new Date('1990-01-01');
      prisma.profile.update.mockResolvedValue({
        ...mockProfile,
        birthDate,
      } as never);

      const result = await service.update(mockProfile.accountId, {
        birthDate,
      });

      expect(result.birthDate).toEqual(birthDate);
    });

    it('should handle update errors', async () => {
      const error = new Error('Database error');
      prisma.profile.update.mockRejectedValue(error);

      await expect(
        service.update(mockProfile.accountId, { displayName: 'New Name' }),
      ).rejects.toThrow('Database error');
    });

    it('should sanitize URL fields', async () => {
      prisma.profile.update.mockResolvedValue({
        ...mockProfile,
        avatar: 'https://example.com/avatar.jpg',
      } as never);

      await service.update(mockProfile.accountId, {
        avatar: 'javascript:alert("xss")',
      });

      expect(prisma.profile.update).toHaveBeenCalledWith({
        where: { accountId: mockProfile.accountId },
        data: expect.objectContaining({
          avatar: expect.not.stringContaining('javascript:'),
        }),
      });
    });
  });

  describe('delete', () => {
    it('should delete profile successfully', async () => {
      prisma.profile.findUnique.mockResolvedValue(mockProfile as never);
      prisma.profile.delete.mockResolvedValue(mockProfile as never);

      const result = await service.delete(mockProfile.accountId);

      expect(result).toBeDefined();
      expect(prisma.profile.delete).toHaveBeenCalledWith({
        where: { accountId: mockProfile.accountId },
      });
    });

    it('should throw NotFoundException when profile not found for deletion', async () => {
      prisma.profile.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('should handle delete errors', async () => {
      prisma.profile.findUnique.mockResolvedValue(mockProfile as never);
      const error = new Error('Database error');
      prisma.profile.delete.mockRejectedValue(error);

      await expect(service.delete(mockProfile.accountId)).rejects.toThrow('Database error');
    });
  });

  describe('address fields update', () => {
    it('should update all address-related fields', async () => {
      prisma.profile.update.mockResolvedValue({
        ...mockProfile,
        countryCode: 'KR',
        region: 'Seoul',
        city: 'Gangnam',
        address: '123 Main St',
        postalCode: '06000',
      } as never);

      const result = await service.update(mockProfile.accountId, {
        countryCode: 'KR',
        region: 'Seoul',
        city: 'Gangnam',
        address: '123 Main St',
        postalCode: '06000',
      });

      expect(result.countryCode).toBe('KR');
      expect(result.region).toBe('Seoul');
      expect(result.city).toBe('Gangnam');
      expect(result.address).toBe('123 Main St');
      expect(result.postalCode).toBe('06000');
    });
  });

  describe('phone fields update', () => {
    it('should update phone-related fields', async () => {
      prisma.profile.update.mockResolvedValue({
        ...mockProfile,
        phoneCountryCode: '+82',
        phoneNumber: '1012345678',
      } as never);

      const result = await service.update(mockProfile.accountId, {
        phoneCountryCode: '+82',
        phoneNumber: '1012345678',
      });

      expect(result.phoneCountryCode).toBe('+82');
      expect(result.phoneNumber).toBe('1012345678');
    });
  });
});
