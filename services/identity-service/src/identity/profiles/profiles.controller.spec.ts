import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

// Type for mocked ProfilesService
type MockedProfilesService = {
  findByAccountId: Mock;
  update: Mock;
  create: Mock;
  delete: Mock;
};

describe('ProfilesController', () => {
  let controller: ProfilesController;
  let profilesService: MockedProfilesService;

  const mockProfile = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    accountId: '223e4567-e89b-12d3-a456-426614174001',
    displayName: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    avatar: 'https://cdn.example.com/avatars/user123.jpg',
    bio: 'Software developer',
    birthDate: new Date('1990-01-15'),
    gender: 'MALE',
    phoneCountryCode: '+82',
    phoneNumber: '1012345678',
    countryCode: 'KR',
    region: 'Seoul',
    city: 'Gangnam-gu',
    address: '123 Main Street',
    postalCode: '06123',
    locale: 'ko-KR',
    timezone: 'Asia/Seoul',
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockProfilesService = {
      findByAccountId: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [{ provide: ProfilesService, useValue: mockProfilesService }],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProfilesController>(ProfilesController);
    profilesService = module.get(ProfilesService);
  });

  describe('findByAccountId', () => {
    it('should return profile when found', async () => {
      profilesService.findByAccountId.mockResolvedValue(mockProfile);

      const result = await controller.findByAccountId('223e4567-e89b-12d3-a456-426614174001');

      expect(result).toEqual(mockProfile);
      expect(profilesService.findByAccountId).toHaveBeenCalledWith(
        '223e4567-e89b-12d3-a456-426614174001',
      );
    });

    it('should throw NotFoundException when profile not found', async () => {
      profilesService.findByAccountId.mockRejectedValue(
        new NotFoundException('Profile not found for account: nonexistent-account-id'),
      );

      await expect(controller.findByAccountId('nonexistent-account-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update profile successfully with displayName', async () => {
      const dto: UpdateProfileDto = {
        displayName: 'Jane Doe',
      };
      const updatedProfile = { ...mockProfile, displayName: 'Jane Doe' };
      profilesService.update.mockResolvedValue(updatedProfile);

      const result = await controller.update('223e4567-e89b-12d3-a456-426614174001', dto);

      expect(result.displayName).toBe('Jane Doe');
      expect(profilesService.update).toHaveBeenCalledWith('223e4567-e89b-12d3-a456-426614174001', {
        displayName: 'Jane Doe',
        birthDate: undefined,
      });
    });

    it('should update profile with all fields', async () => {
      const dto: UpdateProfileDto = {
        displayName: 'Jane Doe',
        firstName: 'Jane',
        lastName: 'Doe',
        avatar: 'https://cdn.example.com/avatars/jane.jpg',
        bio: 'Updated bio',
        countryCode: 'US',
        region: 'California',
        city: 'San Francisco',
      };
      const updatedProfile = { ...mockProfile, ...dto };
      profilesService.update.mockResolvedValue(updatedProfile);

      const result = await controller.update('223e4567-e89b-12d3-a456-426614174001', dto);

      expect(result.displayName).toBe('Jane Doe');
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Doe');
      expect(profilesService.update).toHaveBeenCalledWith('223e4567-e89b-12d3-a456-426614174001', {
        ...dto,
        birthDate: undefined,
      });
    });

    it('should convert birthDate string to Date object', async () => {
      const dto: UpdateProfileDto = {
        displayName: 'Jane Doe',
        birthDate: '1995-05-20',
      };
      const updatedProfile = {
        ...mockProfile,
        displayName: 'Jane Doe',
        birthDate: new Date('1995-05-20'),
      };
      profilesService.update.mockResolvedValue(updatedProfile);

      const result = await controller.update('223e4567-e89b-12d3-a456-426614174001', dto);

      expect(profilesService.update).toHaveBeenCalledWith('223e4567-e89b-12d3-a456-426614174001', {
        displayName: 'Jane Doe',
        birthDate: expect.any(Date),
      });
      expect(result.birthDate).toEqual(new Date('1995-05-20'));
    });

    it('should not convert birthDate when not provided', async () => {
      const dto: UpdateProfileDto = {
        displayName: 'Jane Doe',
      };
      profilesService.update.mockResolvedValue({ ...mockProfile, displayName: 'Jane Doe' });

      await controller.update('223e4567-e89b-12d3-a456-426614174001', dto);

      expect(profilesService.update).toHaveBeenCalledWith('223e4567-e89b-12d3-a456-426614174001', {
        displayName: 'Jane Doe',
        birthDate: undefined,
      });
    });

    it('should throw NotFoundException when profile not found', async () => {
      const dto: UpdateProfileDto = { displayName: 'New Name' };
      profilesService.update.mockRejectedValue(
        new NotFoundException('Profile not found for account: nonexistent-account-id'),
      );

      await expect(controller.update('nonexistent-account-id', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update profile with gender', async () => {
      const dto: UpdateProfileDto = {
        gender: 'FEMALE' as UpdateProfileDto['gender'],
      };
      const updatedProfile = { ...mockProfile, gender: 'FEMALE' };
      profilesService.update.mockResolvedValue(updatedProfile);

      const result = await controller.update('223e4567-e89b-12d3-a456-426614174001', dto);

      expect(result.gender).toBe('FEMALE');
    });

    it('should update profile with phone information', async () => {
      const dto: UpdateProfileDto = {
        phoneCountryCode: '+1',
        phoneNumber: '5551234567',
      };
      const updatedProfile = { ...mockProfile, phoneCountryCode: '+1', phoneNumber: '5551234567' };
      profilesService.update.mockResolvedValue(updatedProfile);

      const result = await controller.update('223e4567-e89b-12d3-a456-426614174001', dto);

      expect(result.phoneCountryCode).toBe('+1');
      expect(result.phoneNumber).toBe('5551234567');
    });

    it('should update profile with address information', async () => {
      const dto: UpdateProfileDto = {
        address: '456 Oak Avenue',
        postalCode: '94102',
      };
      const updatedProfile = { ...mockProfile, address: '456 Oak Avenue', postalCode: '94102' };
      profilesService.update.mockResolvedValue(updatedProfile);

      const result = await controller.update('223e4567-e89b-12d3-a456-426614174001', dto);

      expect(result.address).toBe('456 Oak Avenue');
      expect(result.postalCode).toBe('94102');
    });

    it('should update profile with bio', async () => {
      const dto: UpdateProfileDto = {
        bio: 'Senior software engineer with 10 years of experience',
      };
      const updatedProfile = { ...mockProfile, bio: dto.bio };
      profilesService.update.mockResolvedValue(updatedProfile);

      const result = await controller.update('223e4567-e89b-12d3-a456-426614174001', dto);

      expect(result.bio).toBe('Senior software engineer with 10 years of experience');
    });

    it('should pass empty dto to service', async () => {
      const dto: UpdateProfileDto = {};
      profilesService.update.mockResolvedValue(mockProfile);

      await controller.update('223e4567-e89b-12d3-a456-426614174001', dto);

      expect(profilesService.update).toHaveBeenCalledWith('223e4567-e89b-12d3-a456-426614174001', {
        birthDate: undefined,
      });
    });
  });
});
