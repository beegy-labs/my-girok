import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';
import { RegisterUserDto, RegistrationResponseDto } from './dto/registration.dto';
import { Request } from 'express';

describe('RegistrationController', () => {
  let controller: RegistrationController;
  let registrationService: jest.Mocked<RegistrationService>;

  const mockCreatedAt = new Date();

  const mockRegistrationResponse: RegistrationResponseDto = {
    success: true,
    accountId: '123e4567-e89b-12d3-a456-426614174000',
    email: 'user@example.com',
    displayName: 'John Doe',
    emailVerificationRequired: true,
    createdAt: mockCreatedAt,
  };

  const mockRequest = {
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
  } as unknown as Request;

  beforeEach(async () => {
    const mockRegistrationService = {
      register: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegistrationController],
      providers: [{ provide: RegistrationService, useValue: mockRegistrationService }],
    }).compile();

    controller = module.get<RegistrationController>(RegistrationController);
    registrationService = module.get(RegistrationService);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const dto: RegisterUserDto = {
        email: 'user@example.com',
        password: 'Password123!',
        displayName: 'John Doe',
        countryCode: 'KR',
        locale: 'ko-KR',
        timezone: 'Asia/Seoul',
      };

      registrationService.register.mockResolvedValue(mockRegistrationResponse);

      const result = await controller.register(dto, mockRequest);

      expect(result).toEqual(mockRegistrationResponse);
      expect(result.success).toBe(true);
      expect(result.emailVerificationRequired).toBe(true);
      expect(registrationService.register).toHaveBeenCalledWith(
        dto,
        '127.0.0.1',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      );
    });

    it('should extract IP from request.ip', async () => {
      const dto: RegisterUserDto = {
        email: 'user@example.com',
        password: 'Password123!',
        displayName: 'John Doe',
        countryCode: 'KR',
      };
      const requestWithIp = {
        ip: '192.168.1.100',
        socket: { remoteAddress: '10.0.0.1' },
        headers: { 'user-agent': 'Test Agent' },
      } as unknown as Request;

      registrationService.register.mockResolvedValue(mockRegistrationResponse);

      await controller.register(dto, requestWithIp);

      expect(registrationService.register).toHaveBeenCalledWith(dto, '192.168.1.100', 'Test Agent');
    });

    it('should fall back to socket.remoteAddress when ip is undefined', async () => {
      const dto: RegisterUserDto = {
        email: 'user@example.com',
        password: 'Password123!',
        displayName: 'John Doe',
        countryCode: 'KR',
      };
      const requestWithoutIp = {
        ip: undefined,
        socket: { remoteAddress: '10.0.0.1' },
        headers: { 'user-agent': 'Test Agent' },
      } as unknown as Request;

      registrationService.register.mockResolvedValue(mockRegistrationResponse);

      await controller.register(dto, requestWithoutIp);

      expect(registrationService.register).toHaveBeenCalledWith(dto, '10.0.0.1', 'Test Agent');
    });

    it('should handle undefined IP addresses', async () => {
      const dto: RegisterUserDto = {
        email: 'user@example.com',
        password: 'Password123!',
        displayName: 'John Doe',
        countryCode: 'KR',
      };
      const requestWithoutIp = {
        ip: undefined,
        socket: undefined,
        headers: { 'user-agent': 'Test Agent' },
      } as unknown as Request;

      registrationService.register.mockResolvedValue(mockRegistrationResponse);

      await controller.register(dto, requestWithoutIp);

      expect(registrationService.register).toHaveBeenCalledWith(dto, undefined, 'Test Agent');
    });

    it('should handle missing user-agent header', async () => {
      const dto: RegisterUserDto = {
        email: 'user@example.com',
        password: 'Password123!',
        displayName: 'John Doe',
        countryCode: 'KR',
      };
      const requestWithoutUserAgent = {
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
        headers: {},
      } as unknown as Request;

      registrationService.register.mockResolvedValue(mockRegistrationResponse);

      await controller.register(dto, requestWithoutUserAgent);

      expect(registrationService.register).toHaveBeenCalledWith(dto, '127.0.0.1', undefined);
    });

    it('should throw ConflictException when email already exists', async () => {
      const dto: RegisterUserDto = {
        email: 'existing@example.com',
        password: 'Password123!',
        displayName: 'John Doe',
        countryCode: 'KR',
      };

      registrationService.register.mockRejectedValue(
        new ConflictException('An account with this email already exists'),
      );

      await expect(controller.register(dto, mockRequest)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when registration fails', async () => {
      const dto: RegisterUserDto = {
        email: 'user@example.com',
        password: 'Password123!',
        displayName: 'John Doe',
        countryCode: 'KR',
      };

      registrationService.register.mockRejectedValue(
        new BadRequestException('Registration failed'),
      );

      await expect(controller.register(dto, mockRequest)).rejects.toThrow(BadRequestException);
    });

    it('should register user with minimal required fields', async () => {
      const dto: RegisterUserDto = {
        email: 'minimal@example.com',
        password: 'Password123!',
        displayName: 'Minimal User',
        countryCode: 'US',
      };

      const response = {
        ...mockRegistrationResponse,
        email: 'minimal@example.com',
        displayName: 'Minimal User',
      };
      registrationService.register.mockResolvedValue(response);

      const result = await controller.register(dto, mockRequest);

      expect(result.success).toBe(true);
      expect(result.email).toBe('minimal@example.com');
      expect(result.displayName).toBe('Minimal User');
    });

    it('should register user with all optional fields', async () => {
      const dto: RegisterUserDto = {
        email: 'full@example.com',
        password: 'SecurePassword123!@#',
        displayName: 'Full User',
        countryCode: 'JP',
        locale: 'ja-JP',
        timezone: 'Asia/Tokyo',
      };

      const response = {
        ...mockRegistrationResponse,
        email: 'full@example.com',
        displayName: 'Full User',
      };
      registrationService.register.mockResolvedValue(response);

      const result = await controller.register(dto, mockRequest);

      expect(result.success).toBe(true);
      expect(registrationService.register).toHaveBeenCalledWith(
        expect.objectContaining({
          countryCode: 'JP',
          locale: 'ja-JP',
          timezone: 'Asia/Tokyo',
        }),
        expect.any(String),
        expect.any(String),
      );
    });

    it('should propagate service errors', async () => {
      const dto: RegisterUserDto = {
        email: 'user@example.com',
        password: 'Password123!',
        displayName: 'John Doe',
        countryCode: 'KR',
      };

      registrationService.register.mockRejectedValue(new Error('Internal server error'));

      await expect(controller.register(dto, mockRequest)).rejects.toThrow('Internal server error');
    });

    it('should return createdAt timestamp', async () => {
      const dto: RegisterUserDto = {
        email: 'user@example.com',
        password: 'Password123!',
        displayName: 'John Doe',
        countryCode: 'KR',
      };

      registrationService.register.mockResolvedValue(mockRegistrationResponse);

      const result = await controller.register(dto, mockRequest);

      expect(result.createdAt).toBeDefined();
      expect(result.createdAt).toEqual(mockCreatedAt);
    });

    it('should return correct accountId', async () => {
      const dto: RegisterUserDto = {
        email: 'user@example.com',
        password: 'Password123!',
        displayName: 'John Doe',
        countryCode: 'KR',
      };

      registrationService.register.mockResolvedValue(mockRegistrationResponse);

      const result = await controller.register(dto, mockRequest);

      expect(result.accountId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should handle different country codes', async () => {
      const countryCodes = ['US', 'KR', 'JP', 'DE', 'FR', 'GB'];

      for (const countryCode of countryCodes) {
        const dto: RegisterUserDto = {
          email: `user-${countryCode.toLowerCase()}@example.com`,
          password: 'Password123!',
          displayName: `User from ${countryCode}`,
          countryCode,
        };

        registrationService.register.mockResolvedValue({
          ...mockRegistrationResponse,
          email: dto.email,
          displayName: dto.displayName,
        });

        const result = await controller.register(dto, mockRequest);

        expect(result.success).toBe(true);
        expect(registrationService.register).toHaveBeenCalledWith(
          expect.objectContaining({ countryCode }),
          expect.any(String),
          expect.any(String),
        );
      }
    });

    it('should handle concurrent registration requests', async () => {
      const dto1: RegisterUserDto = {
        email: 'user1@example.com',
        password: 'Password123!',
        displayName: 'User 1',
        countryCode: 'KR',
      };
      const dto2: RegisterUserDto = {
        email: 'user2@example.com',
        password: 'Password123!',
        displayName: 'User 2',
        countryCode: 'US',
      };

      registrationService.register
        .mockResolvedValueOnce({
          ...mockRegistrationResponse,
          email: 'user1@example.com',
          displayName: 'User 1',
        })
        .mockResolvedValueOnce({
          ...mockRegistrationResponse,
          email: 'user2@example.com',
          displayName: 'User 2',
        });

      const [result1, result2] = await Promise.all([
        controller.register(dto1, mockRequest),
        controller.register(dto2, mockRequest),
      ]);

      expect(result1.email).toBe('user1@example.com');
      expect(result2.email).toBe('user2@example.com');
      expect(registrationService.register).toHaveBeenCalledTimes(2);
    });
  });
});
