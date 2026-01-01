import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService, DeviceResponse } from './devices.service';
import { RegisterDeviceDto, DeviceType } from './dto/register-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { PaginatedResponse } from '../../common/pagination';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

describe('DevicesController', () => {
  let controller: DevicesController;
  let devicesService: jest.Mocked<DevicesService>;

  const mockDeviceResponse: DeviceResponse = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    accountId: '223e4567-e89b-12d3-a456-426614174001',
    fingerprint: 'abc123def456ghi789',
    name: 'Chrome on MacBook Pro',
    deviceType: 'WEB' as DeviceType,
    platform: 'macOS',
    osVersion: '14.2',
    appVersion: '1.0.0',
    browserName: 'Chrome',
    browserVersion: '120.0.0',
    pushToken: null,
    pushPlatform: null,
    isTrusted: false,
    trustedAt: null,
    lastActiveAt: new Date(),
    lastIpAddress: '127.0.0.1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedDevices: PaginatedResponse<DeviceResponse> = {
    data: [mockDeviceResponse],
    meta: {
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };

  beforeEach(async () => {
    const mockDevicesService = {
      register: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByFingerprint: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      trust: jest.fn(),
      untrust: jest.fn(),
      updateActivity: jest.fn(),
      getDeviceCount: jest.fn(),
      getTrustedDeviceCount: jest.fn(),
      removeAllForAccount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [{ provide: DevicesService, useValue: mockDevicesService }],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DevicesController>(DevicesController);
    devicesService = module.get(DevicesService);
  });

  describe('register', () => {
    it('should register a new device successfully', async () => {
      const dto: RegisterDeviceDto = {
        accountId: '223e4567-e89b-12d3-a456-426614174001',
        fingerprint: 'abc123def456ghi789',
        deviceType: 'WEB' as DeviceType,
        name: 'Chrome on MacBook Pro',
      };

      devicesService.register.mockResolvedValue(mockDeviceResponse);

      const result = await controller.register(dto);

      expect(result).toEqual(mockDeviceResponse);
      expect(devicesService.register).toHaveBeenCalledWith(dto);
    });

    it('should throw NotFoundException when account not found', async () => {
      const dto: RegisterDeviceDto = {
        accountId: 'nonexistent-account-id',
        fingerprint: 'abc123def456ghi789',
        deviceType: 'WEB' as DeviceType,
      };

      devicesService.register.mockRejectedValue(
        new NotFoundException('Account with ID nonexistent-account-id not found'),
      );

      await expect(controller.register(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated list of devices', async () => {
      devicesService.findAll.mockResolvedValue(mockPaginatedDevices);

      const result = await controller.findAll();

      expect(result).toEqual(mockPaginatedDevices);
      expect(devicesService.findAll).toHaveBeenCalledWith({
        accountId: undefined,
        deviceType: undefined,
        isTrusted: undefined,
        page: undefined,
        limit: undefined,
      });
    });

    it('should filter by accountId', async () => {
      devicesService.findAll.mockResolvedValue(mockPaginatedDevices);

      await controller.findAll('223e4567-e89b-12d3-a456-426614174001');

      expect(devicesService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: '223e4567-e89b-12d3-a456-426614174001',
        }),
      );
    });

    it('should filter by deviceType', async () => {
      devicesService.findAll.mockResolvedValue(mockPaginatedDevices);

      await controller.findAll(undefined, 'WEB' as DeviceType);

      expect(devicesService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceType: 'WEB',
        }),
      );
    });

    it('should filter by isTrusted', async () => {
      devicesService.findAll.mockResolvedValue(mockPaginatedDevices);

      await controller.findAll(undefined, undefined, true);

      expect(devicesService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          isTrusted: true,
        }),
      );
    });

    it('should handle pagination parameters', async () => {
      devicesService.findAll.mockResolvedValue(mockPaginatedDevices);

      await controller.findAll(undefined, undefined, undefined, 2, 50);

      expect(devicesService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 50,
        }),
      );
    });

    it('should convert string page/limit to numbers', async () => {
      devicesService.findAll.mockResolvedValue(mockPaginatedDevices);

      // Simulate query params being passed as strings
      await controller.findAll(
        undefined,
        undefined,
        undefined,
        3 as unknown as number,
        25 as unknown as number,
      );

      expect(devicesService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 3,
          limit: 25,
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return device when found', async () => {
      devicesService.findById.mockResolvedValue(mockDeviceResponse);

      const result = await controller.findById('123e4567-e89b-12d3-a456-426614174000');

      expect(result).toEqual(mockDeviceResponse);
      expect(devicesService.findById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should throw NotFoundException when device not found', async () => {
      devicesService.findById.mockRejectedValue(
        new NotFoundException('Device with ID nonexistent-id not found'),
      );

      await expect(controller.findById('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByFingerprint', () => {
    it('should return device when found by fingerprint', async () => {
      devicesService.findByFingerprint.mockResolvedValue(mockDeviceResponse);

      const result = await controller.findByFingerprint(
        '223e4567-e89b-12d3-a456-426614174001',
        'abc123def456ghi789',
      );

      expect(result).toEqual(mockDeviceResponse);
      expect(devicesService.findByFingerprint).toHaveBeenCalledWith(
        '223e4567-e89b-12d3-a456-426614174001',
        'abc123def456ghi789',
      );
    });

    it('should return null when device not found', async () => {
      devicesService.findByFingerprint.mockResolvedValue(null);

      const result = await controller.findByFingerprint(
        '223e4567-e89b-12d3-a456-426614174001',
        'nonexistent-fingerprint',
      );

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update device successfully', async () => {
      const dto: UpdateDeviceDto = {
        name: 'Updated Device Name',
        platform: 'iOS',
      };
      const updatedDevice = { ...mockDeviceResponse, ...dto };
      devicesService.update.mockResolvedValue(updatedDevice);

      const result = await controller.update('123e4567-e89b-12d3-a456-426614174000', dto);

      expect(result.name).toBe('Updated Device Name');
      expect(result.platform).toBe('iOS');
      expect(devicesService.update).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        dto,
      );
    });

    it('should throw NotFoundException when device not found', async () => {
      const dto: UpdateDeviceDto = { name: 'Updated Name' };
      devicesService.update.mockRejectedValue(
        new NotFoundException('Device with ID nonexistent-id not found'),
      );

      await expect(controller.update('nonexistent-id', dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove device successfully', async () => {
      devicesService.remove.mockResolvedValue(undefined);

      await controller.remove('123e4567-e89b-12d3-a456-426614174000');

      expect(devicesService.remove).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should throw NotFoundException when device not found', async () => {
      devicesService.remove.mockRejectedValue(
        new NotFoundException('Device with ID nonexistent-id not found'),
      );

      await expect(controller.remove('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('trust', () => {
    it('should trust a device successfully', async () => {
      const trustedDevice = { ...mockDeviceResponse, isTrusted: true, trustedAt: new Date() };
      devicesService.trust.mockResolvedValue(trustedDevice);

      const result = await controller.trust('123e4567-e89b-12d3-a456-426614174000');

      expect(result.isTrusted).toBe(true);
      expect(result.trustedAt).toBeDefined();
      expect(devicesService.trust).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should throw NotFoundException when device not found', async () => {
      devicesService.trust.mockRejectedValue(
        new NotFoundException('Device with ID nonexistent-id not found'),
      );

      await expect(controller.trust('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when device is already trusted', async () => {
      devicesService.trust.mockRejectedValue(new ConflictException('Device is already trusted'));

      await expect(controller.trust('123e4567-e89b-12d3-a456-426614174000')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('untrust', () => {
    it('should untrust a device successfully', async () => {
      const untrustedDevice = { ...mockDeviceResponse, isTrusted: false, trustedAt: null };
      devicesService.untrust.mockResolvedValue(untrustedDevice);

      const result = await controller.untrust('123e4567-e89b-12d3-a456-426614174000');

      expect(result.isTrusted).toBe(false);
      expect(result.trustedAt).toBeNull();
      expect(devicesService.untrust).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should throw NotFoundException when device not found', async () => {
      devicesService.untrust.mockRejectedValue(
        new NotFoundException('Device with ID nonexistent-id not found'),
      );

      await expect(controller.untrust('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when device is not trusted', async () => {
      devicesService.untrust.mockRejectedValue(new BadRequestException('Device is not trusted'));

      await expect(controller.untrust('123e4567-e89b-12d3-a456-426614174000')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateActivity', () => {
    it('should update device activity successfully', async () => {
      devicesService.updateActivity.mockResolvedValue(undefined);

      await controller.updateActivity('123e4567-e89b-12d3-a456-426614174000');

      expect(devicesService.updateActivity).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        undefined,
      );
    });

    it('should update device activity with IP address', async () => {
      devicesService.updateActivity.mockResolvedValue(undefined);

      await controller.updateActivity('123e4567-e89b-12d3-a456-426614174000', '192.168.1.1');

      expect(devicesService.updateActivity).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        '192.168.1.1',
      );
    });
  });

  describe('getDeviceCount', () => {
    it('should return device count for account', async () => {
      devicesService.getDeviceCount.mockResolvedValue(5);
      devicesService.getTrustedDeviceCount.mockResolvedValue(3);

      const result = await controller.getDeviceCount('223e4567-e89b-12d3-a456-426614174001');

      expect(result).toEqual({ total: 5, trusted: 3 });
      expect(devicesService.getDeviceCount).toHaveBeenCalledWith(
        '223e4567-e89b-12d3-a456-426614174001',
      );
      expect(devicesService.getTrustedDeviceCount).toHaveBeenCalledWith(
        '223e4567-e89b-12d3-a456-426614174001',
      );
    });

    it('should return zero counts for account with no devices', async () => {
      devicesService.getDeviceCount.mockResolvedValue(0);
      devicesService.getTrustedDeviceCount.mockResolvedValue(0);

      const result = await controller.getDeviceCount('223e4567-e89b-12d3-a456-426614174001');

      expect(result).toEqual({ total: 0, trusted: 0 });
    });
  });

  describe('removeAllForAccount', () => {
    it('should remove all devices for account successfully', async () => {
      devicesService.removeAllForAccount.mockResolvedValue(5);

      const result = await controller.removeAllForAccount('223e4567-e89b-12d3-a456-426614174001');

      expect(result).toEqual({ count: 5 });
      expect(devicesService.removeAllForAccount).toHaveBeenCalledWith(
        '223e4567-e89b-12d3-a456-426614174001',
      );
    });

    it('should return zero count when no devices exist', async () => {
      devicesService.removeAllForAccount.mockResolvedValue(0);

      const result = await controller.removeAllForAccount('223e4567-e89b-12d3-a456-426614174001');

      expect(result).toEqual({ count: 0 });
    });
  });
});
