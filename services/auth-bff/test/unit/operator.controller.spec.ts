import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, type MockInstance } from 'vitest';
import { OperatorController } from '../../src/operator/operator.controller';
import { OperatorService } from '../../src/operator/operator.service';
import { BffSession } from '../../src/common/types';
import { AccountType } from '../../src/config/constants';
import { Request, Response } from 'express';

describe('OperatorController', () => {
  let controller: OperatorController;
  let operatorService: {
    login: MockInstance;
    logout: MockInstance;
    getMe: MockInstance;
  };

  const mockSession: BffSession = {
    id: 'session-123',
    accountType: AccountType.OPERATOR,
    accountId: 'user-123',
    email: 'operator@example.com',
    serviceId: 'service-1',
    accessToken: 'encrypted-access-token',
    refreshToken: 'encrypted-refresh-token',
    deviceFingerprint: 'fingerprint-123',
    mfaVerified: false,
    mfaRequired: false,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 86400000),
    lastActivityAt: new Date(),
    permissions: ['orders:read'],
  };

  const mockRequest = {} as Request;
  const mockResponse = {} as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OperatorController],
      providers: [
        {
          provide: OperatorService,
          useValue: {
            login: vi.fn(),
            logout: vi.fn(),
            getMe: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<OperatorController>(OperatorController);
    operatorService = module.get(OperatorService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should login operator', async () => {
      const dto = {
        email: 'operator@example.com',
        password: 'password123',
        serviceId: 'service-1',
        countryCode: 'KR',
      };
      const response = {
        success: true,
        operator: { id: 'op-1', email: 'operator@example.com', serviceId: 'service-1' },
        message: 'Login successful',
      };
      operatorService.login.mockResolvedValue(response);

      const result = await controller.login(mockRequest, mockResponse, dto);

      expect(result).toEqual(response);
      expect(operatorService.login).toHaveBeenCalledWith(mockRequest, mockResponse, dto);
    });

    it('should return MFA required response', async () => {
      const dto = {
        email: 'operator@example.com',
        password: 'password123',
        serviceId: 'service-1',
        countryCode: 'KR',
      };
      const response = {
        success: true,
        mfaRequired: true,
        challengeId: 'challenge-1',
        message: 'MFA required',
      };
      operatorService.login.mockResolvedValue(response);

      const result = await controller.login(mockRequest, mockResponse, dto);

      expect(result).toEqual(response);
      expect(result.mfaRequired).toBe(true);
    });
  });

  describe('logout', () => {
    it('should logout operator', async () => {
      const response = { success: true, message: 'Logged out successfully' };
      operatorService.logout.mockResolvedValue(response);

      const result = await controller.logout(mockRequest, mockResponse);

      expect(result).toEqual(response);
      expect(operatorService.logout).toHaveBeenCalledWith(mockRequest, mockResponse);
    });
  });

  describe('getMe', () => {
    it('should return current operator info', async () => {
      const operatorInfo = {
        id: 'op-1',
        accountId: 'user-123',
        email: 'operator@example.com',
        serviceId: 'service-1',
        countryCode: 'KR',
        permissions: ['orders:read'],
      };
      operatorService.getMe.mockResolvedValue(operatorInfo);

      const result = await controller.getMe(mockSession);

      expect(result).toEqual(operatorInfo);
      expect(operatorService.getMe).toHaveBeenCalledWith(mockSession);
    });
  });
});
