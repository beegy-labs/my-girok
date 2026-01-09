import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { OAuthController } from '../../src/oauth/oauth.controller';
import { Response } from 'express';

describe('OAuthController', () => {
  let controller: OAuthController;

  const mockConfigService = {
    get: vi.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        'oauth.google.clientId': 'google-client-id',
        'oauth.google.clientSecret': 'google-secret',
        'oauth.google.callbackUrl': 'http://localhost:3001/oauth/google/callback',
        'oauth.kakao.clientId': 'kakao-client-id',
        'oauth.kakao.clientSecret': 'kakao-secret',
        'oauth.kakao.callbackUrl': 'http://localhost:3001/oauth/kakao/callback',
        'oauth.naver.clientId': 'naver-client-id',
        'oauth.naver.clientSecret': 'naver-secret',
        'oauth.naver.callbackUrl': 'http://localhost:3001/oauth/naver/callback',
        'oauth.apple.clientId': 'apple-client-id',
        'oauth.apple.clientSecret': 'apple-secret',
        'oauth.apple.callbackUrl': 'http://localhost:3001/oauth/apple/callback',
        'frontend.url': 'http://localhost:3000',
      };
      return config[key] ?? defaultValue ?? '';
    }),
  };

  const mockResponse = (): Response =>
    ({
      redirect: vi.fn(),
    }) as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OAuthController],
      providers: [
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<OAuthController>(OAuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('startOAuth', () => {
    it('should redirect to Google OAuth URL', async () => {
      const res = mockResponse();

      await controller.startOAuth('google', res);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('accounts.google.com'));
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('client_id=google-client-id'),
      );
    });

    it('should redirect to Kakao OAuth URL', async () => {
      const res = mockResponse();

      await controller.startOAuth('kakao', res);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('kauth.kakao.com'));
    });

    it('should redirect to Naver OAuth URL', async () => {
      const res = mockResponse();

      await controller.startOAuth('naver', res);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('nid.naver.com'));
    });

    it('should redirect to Apple OAuth URL', async () => {
      const res = mockResponse();

      await controller.startOAuth('apple', res);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('appleid.apple.com'));
    });

    it('should handle uppercase provider names', async () => {
      const res = mockResponse();

      await controller.startOAuth('GOOGLE', res);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('accounts.google.com'));
    });

    it('should throw BadRequestException for invalid provider', async () => {
      const res = mockResponse();

      await expect(controller.startOAuth('invalid', res)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when provider is not configured', async () => {
      const unconfiguredConfigService = {
        get: vi.fn((key: string) => {
          if (key.includes('clientId')) return '';
          return 'http://localhost:3001/callback';
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        controllers: [OAuthController],
        providers: [
          {
            provide: ConfigService,
            useValue: unconfiguredConfigService,
          },
        ],
      }).compile();

      const unconfiguredController = module.get<OAuthController>(OAuthController);
      const res = mockResponse();

      await expect(unconfiguredController.startOAuth('google', res)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should include redirect_uri in state when provided', async () => {
      const res = mockResponse();

      await controller.startOAuth('google', res, 'http://myapp.com/callback');

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('state='));
    });

    it('should include scope in Google OAuth URL', async () => {
      const res = mockResponse();

      await controller.startOAuth('google', res);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('scope='));
    });

    it('should include response_mode=form_post for Apple', async () => {
      const res = mockResponse();

      await controller.startOAuth('apple', res);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('response_mode=form_post'));
    });
  });

  describe('handleCallback', () => {
    it('should redirect to frontend with error when error param is present', async () => {
      const res = mockResponse();

      await controller.handleCallback(
        'google',
        {} as Request,
        res,
        undefined,
        undefined,
        'access_denied',
      );

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/error?error=access_denied'),
      );
    });

    it('should redirect to frontend callback for valid request', async () => {
      const res = mockResponse();

      await controller.handleCallback('google', {} as Request, res, 'auth-code', 'state-data');

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/auth/callback'));
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('provider=google'));
    });

    it('should throw BadRequestException for invalid provider', async () => {
      const res = mockResponse();

      await expect(controller.handleCallback('invalid', {} as Request, res)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle lowercase provider', async () => {
      const res = mockResponse();

      await controller.handleCallback('kakao', {} as Request, res, 'code', 'state');

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('provider=kakao'));
    });

    it('should handle uppercase provider', async () => {
      const res = mockResponse();

      await controller.handleCallback('NAVER', {} as Request, res, 'code', 'state');

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('provider=NAVER'));
    });
  });
});
