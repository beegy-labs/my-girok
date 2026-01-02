import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

import { PersonalInfoService } from '../../src/users/services/personal-info.service';
import { PrismaService } from '../../src/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../utils/mock-prisma';
import { generateTestId, resetTestCounter } from '../utils/test-factory';
import { Gender } from '../../src/users/dto/personal-info.dto';

describe('PersonalInfoService', () => {
  let service: PersonalInfoService;
  let mockPrisma: MockPrismaService;

  const userId = '00000000-0000-7000-0000-000000000001';
  const adminId = '00000000-0000-7000-0000-000000000002';
  const operatorId = '00000000-0000-7000-0000-000000000003';
  const serviceId = '00000000-0000-7000-0000-000000000004';
  const personalInfoId = generateTestId();

  const mockPersonalInfo = {
    id: personalInfoId,
    userId,
    name: 'John Doe',
    birthDate: new Date('1990-01-15'),
    gender: 'MALE',
    phoneCountryCode: '+82',
    phoneNumber: '1012345678',
    countryCode: 'KR',
    region: 'Seoul',
    city: 'Gangnam',
    address: '123 Test Street',
    postalCode: '12345',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequest = {
    ip: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
  };

  beforeEach(async () => {
    resetTestCounter();

    mockPrisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [PersonalInfoService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<PersonalInfoService>(PersonalInfoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyPersonalInfo', () => {
    it('should return personal info for user', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([mockPersonalInfo]);
      mockPrisma.$executeRaw.mockResolvedValue(1); // logAccess

      // Act
      const result = await service.getMyPersonalInfo(userId, mockRequest);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.id).toBe(personalInfoId);
      expect(result!.name).toBe('John Doe');
      expect(result!.birthDate).toBe('1990-01-15');
      expect(result!.gender).toBe('MALE');
      expect(result!.phoneCountryCode).toBe('+82');
      expect(mockPrisma.$executeRaw).toHaveBeenCalled(); // Access log
    });

    it('should return null when personal info not found', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      // Act
      const result = await service.getMyPersonalInfo(userId, mockRequest);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updatePersonalInfo', () => {
    it('should update existing personal info', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ id: personalInfoId }]) // check existing
        .mockResolvedValueOnce([{ ...mockPersonalInfo, name: 'Jane Doe' }]); // get updated
      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.updatePersonalInfo(userId, { name: 'Jane Doe' }, mockRequest);

      // Assert
      expect(result.name).toBe('Jane Doe');
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2); // update + logAccess
    });

    it('should create personal info when not exists', async () => {
      // Arrange
      const newPersonalInfoId = generateTestId();
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // not existing
        .mockResolvedValueOnce([
          {
            id: newPersonalInfoId,
            userId,
            name: 'John Doe',
            birthDate: new Date('1990-01-15'),
            gender: 'MALE',
            phoneCountryCode: null,
            phoneNumber: null,
            countryCode: 'KR',
            region: null,
            city: null,
            address: null,
            postalCode: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);
      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.updatePersonalInfo(
        userId,
        {
          name: 'John Doe',
          birthDate: '1990-01-15',
          gender: Gender.MALE,
          countryCode: 'KR',
        },
        mockRequest,
      );

      // Assert
      expect(result.name).toBe('John Doe');
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2); // insert + logAccess
    });

    it('should only update provided fields', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ id: personalInfoId }])
        .mockResolvedValueOnce([{ ...mockPersonalInfo, phoneNumber: '9876543210' }]);
      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.updatePersonalInfo(
        userId,
        { phoneNumber: '9876543210' },
        mockRequest,
      );

      // Assert
      expect(result.name).toBe('John Doe'); // Unchanged
      expect(result.phoneNumber).toBe('9876543210'); // Updated
    });
  });

  describe('deletePersonalInfo', () => {
    it('should delete existing personal info', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ id: personalInfoId }]);
      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act
      await service.deletePersonalInfo(userId, mockRequest);

      // Assert
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2); // logAccess + delete
    });

    it('should do nothing when personal info not exists', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      // Act
      await service.deletePersonalInfo(userId, mockRequest);

      // Assert
      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    });
  });

  describe('getPersonalInfoByAdmin', () => {
    it('should return personal info for system admin', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ id: adminId, scope: 'SYSTEM' }]) // admin check
        .mockResolvedValueOnce([mockPersonalInfo]); // personal info
      mockPrisma.$executeRaw.mockResolvedValue(1); // logAccess

      // Act
      const result = await service.getPersonalInfoByAdmin(adminId, userId, serviceId, mockRequest);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.name).toBe('John Doe');
    });

    it('should return personal info for tenant admin', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ id: adminId, scope: 'TENANT' }]) // admin check
        .mockResolvedValueOnce([{ id: userId }]) // user exists
        .mockResolvedValueOnce([mockPersonalInfo]); // personal info
      mockPrisma.$executeRaw.mockResolvedValue(1); // logAccess

      // Act
      const result = await service.getPersonalInfoByAdmin(adminId, userId, serviceId, mockRequest);

      // Assert
      expect(result).not.toBeNull();
    });

    it('should throw ForbiddenException when admin not found or inactive', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      // Act & Assert
      await expect(
        service.getPersonalInfoByAdmin(adminId, userId, serviceId, mockRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when user not found (tenant admin)', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ id: adminId, scope: 'TENANT' }])
        .mockResolvedValueOnce([]); // user not found

      // Act & Assert
      await expect(
        service.getPersonalInfoByAdmin(adminId, userId, serviceId, mockRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return null when personal info not found', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ id: adminId, scope: 'SYSTEM' }])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.getPersonalInfoByAdmin(adminId, userId, serviceId, mockRequest);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getPersonalInfoByOperator', () => {
    it('should return personal info when operator has direct link', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ id: generateTestId() }]) // operator-user link
        .mockResolvedValueOnce([{ id: userId }]) // user exists
        .mockResolvedValueOnce([mockPersonalInfo]); // personal info
      mockPrisma.$executeRaw.mockResolvedValue(1); // logAccess

      // Act
      const result = await service.getPersonalInfoByOperator(
        operatorId,
        userId,
        serviceId,
        mockRequest,
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result!.name).toBe('John Doe');
    });

    it('should return personal info when operator has permission', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // no direct link
        .mockResolvedValueOnce([{ id: generateTestId() }]) // has permission
        .mockResolvedValueOnce([{ id: userId }]) // user exists
        .mockResolvedValueOnce([mockPersonalInfo]); // personal info
      mockPrisma.$executeRaw.mockResolvedValue(1); // logAccess

      // Act
      const result = await service.getPersonalInfoByOperator(
        operatorId,
        userId,
        serviceId,
        mockRequest,
      );

      // Assert
      expect(result).not.toBeNull();
    });

    it('should throw ForbiddenException when no access', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // no direct link
        .mockResolvedValueOnce([]); // no permission

      // Act & Assert
      await expect(
        service.getPersonalInfoByOperator(operatorId, userId, serviceId, mockRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ id: generateTestId() }]) // operator-user link
        .mockResolvedValueOnce([]); // user not found

      // Act & Assert
      await expect(
        service.getPersonalInfoByOperator(operatorId, userId, serviceId, mockRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return null when personal info not found', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ id: generateTestId() }]) // operator-user link
        .mockResolvedValueOnce([{ id: userId }]) // user exists
        .mockResolvedValueOnce([]); // no personal info

      // Act
      const result = await service.getPersonalInfoByOperator(
        operatorId,
        userId,
        serviceId,
        mockRequest,
      );

      // Assert
      expect(result).toBeNull();
    });
  });
});
