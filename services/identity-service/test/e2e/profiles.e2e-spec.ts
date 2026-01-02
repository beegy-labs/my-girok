import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ProfilesService } from '../../src/identity/profiles/profiles.service';
import { IdentityPrismaService } from '../../src/database/identity-prisma.service';

describe('Profiles (E2E)', () => {
  let app: INestApplication;
  let profilesService: ProfilesService;

  const mockProfile = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    accountId: '223e4567-e89b-12d3-a456-426614174001',
    displayName: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    avatar: null,
    bio: null,
    birthDate: null,
    gender: null,
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

  beforeAll(async () => {
    const mockPrisma = {
      profile: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [ProfilesService, { provide: IdentityPrismaService, useValue: mockPrisma }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    profilesService = moduleFixture.get<ProfilesService>(ProfilesService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('ProfilesService Integration', () => {
    it('should find profile by account ID', async () => {
      jest.spyOn(profilesService, 'findByAccountId').mockResolvedValue(mockProfile);

      const result = await profilesService.findByAccountId(mockProfile.accountId);

      expect(result).toBeDefined();
      expect(result.displayName).toBe('Test User');
    });

    it('should create a new profile', async () => {
      jest.spyOn(profilesService, 'create').mockResolvedValue(mockProfile);

      const result = await profilesService.create(mockProfile.accountId, 'New User');

      expect(result).toBeDefined();
      expect(result.accountId).toBe(mockProfile.accountId);
    });

    it('should update profile with sanitized data', async () => {
      const updatedProfile = {
        ...mockProfile,
        displayName: 'Updated Name',
        bio: 'Updated bio',
      };
      jest.spyOn(profilesService, 'update').mockResolvedValue(updatedProfile);

      const result = await profilesService.update(mockProfile.accountId, {
        displayName: 'Updated Name',
        bio: 'Updated bio',
      });

      expect(result.displayName).toBe('Updated Name');
      expect(result.bio).toBe('Updated bio');
    });

    it('should delete profile', async () => {
      jest.spyOn(profilesService, 'delete').mockResolvedValue(mockProfile);

      const result = await profilesService.delete(mockProfile.accountId);

      expect(result).toBeDefined();
    });

    describe('XSS prevention', () => {
      it('should sanitize display name with script tags', async () => {
        const sanitizedProfile = {
          ...mockProfile,
          displayName: 'Test User',
        };
        jest.spyOn(profilesService, 'update').mockResolvedValue(sanitizedProfile);

        const result = await profilesService.update(mockProfile.accountId, {
          displayName: '<script>alert("xss")</script>Test User',
        });

        expect(result.displayName).not.toContain('<script>');
      });

      it('should sanitize bio with HTML injection', async () => {
        const sanitizedProfile = {
          ...mockProfile,
          bio: 'Safe bio content',
        };
        jest.spyOn(profilesService, 'update').mockResolvedValue(sanitizedProfile);

        const result = await profilesService.update(mockProfile.accountId, {
          bio: '<img src=x onerror=alert("xss")>Safe bio content',
        });

        expect(result.bio).not.toContain('<img');
      });

      it('should sanitize avatar URL with javascript protocol', async () => {
        const sanitizedProfile = {
          ...mockProfile,
          avatar: '',
        };
        jest.spyOn(profilesService, 'update').mockResolvedValue(sanitizedProfile);

        const result = await profilesService.update(mockProfile.accountId, {
          avatar: 'javascript:alert("xss")',
        });

        expect(result.avatar).not.toContain('javascript:');
      });
    });

    describe('Address fields', () => {
      it('should update all address fields', async () => {
        const updatedProfile = {
          ...mockProfile,
          countryCode: 'KR',
          region: 'Seoul',
          city: 'Gangnam',
          address: '123 Main Street',
          postalCode: '06000',
        };
        jest.spyOn(profilesService, 'update').mockResolvedValue(updatedProfile);

        const result = await profilesService.update(mockProfile.accountId, {
          countryCode: 'KR',
          region: 'Seoul',
          city: 'Gangnam',
          address: '123 Main Street',
          postalCode: '06000',
        });

        expect(result.countryCode).toBe('KR');
        expect(result.region).toBe('Seoul');
        expect(result.city).toBe('Gangnam');
      });
    });

    describe('Personal information fields', () => {
      it('should update phone fields', async () => {
        const updatedProfile = {
          ...mockProfile,
          phoneCountryCode: '+82',
          phoneNumber: '1012345678',
        };
        jest.spyOn(profilesService, 'update').mockResolvedValue(updatedProfile);

        const result = await profilesService.update(mockProfile.accountId, {
          phoneCountryCode: '+82',
          phoneNumber: '1012345678',
        });

        expect(result.phoneCountryCode).toBe('+82');
        expect(result.phoneNumber).toBe('1012345678');
      });

      it('should update birth date', async () => {
        const birthDate = new Date('1990-01-01');
        const updatedProfile = {
          ...mockProfile,
          birthDate,
        };
        jest.spyOn(profilesService, 'update').mockResolvedValue(updatedProfile);

        const result = await profilesService.update(mockProfile.accountId, {
          birthDate,
        });

        expect(result.birthDate).toEqual(birthDate);
      });

      it('should update gender', async () => {
        const updatedProfile = {
          ...mockProfile,
          gender: 'MALE',
        };
        jest.spyOn(profilesService, 'update').mockResolvedValue(updatedProfile as any);

        const result = await profilesService.update(mockProfile.accountId, {
          gender: 'MALE' as any,
        });

        expect(result.gender).toBe('MALE');
      });
    });
  });

  describe('Error handling', () => {
    it('should handle not found errors', async () => {
      jest
        .spyOn(profilesService, 'findByAccountId')
        .mockRejectedValue(new Error('Profile not found'));

      await expect(profilesService.findByAccountId('nonexistent-id')).rejects.toThrow(
        'Profile not found',
      );
    });

    it('should handle database errors gracefully', async () => {
      jest
        .spyOn(profilesService, 'update')
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(
        profilesService.update(mockProfile.accountId, { displayName: 'New' }),
      ).rejects.toThrow('Database connection failed');
    });
  });
});
