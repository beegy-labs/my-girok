import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { BadRequestException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OAuthController } from '../../src/oauth/oauth.controller';
import { Response } from 'express';
import { of } from 'rxjs';

describe('OAuthController', () => {
  let controller: OAuthController;
  let httpService: HttpService;

  const defaultConfig: Record<string, string> = {
    'services.authService.url': 'http://localhost:3001',
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

  const mockConfigService = {
    get: vi.fn((key: string, defaultValue?: string) => {
      return defaultConfig[key] ?? defaultValue ?? '';
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
        {
          provide: HttpService,
          useValue: {
            get: vi.fn((url: string) => {
              if (url.includes('/status')) {
                return of({ data: { enabled: true } });
              }
              if (url.includes('/enabled')) {
                return of({
                  data: {
                    providers: [
                      { provider: 'GOOGLE', displayName: 'Google' },
                      { provider: 'KAKAO', displayName: 'Kakao' },
                    ],
                  },
                });
              }
              return of({ data: {} });
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<OAuthController>(OAuthController);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Restore original mock implementation
    mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
      return defaultConfig[key] ?? defaultValue ?? '';
    });
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
      const res = mockResponse();
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          'services.authService.url': 'http://localhost:3001',
          'oauth.google.clientId': '', // Empty to test not configured
          'oauth.google.clientSecret': 'google-secret',
          'oauth.google.callbackUrl': 'http://localhost:3001/oauth/google/callback',
          'frontend.url': 'http://localhost:3000',
        };
        return config[key] ?? defaultValue ?? '';
      });

      await expect(controller.startOAuth('google', res)).rejects.toThrow(BadRequestException);
    });

    it('should include redirect_uri in state when provided', async () => {
      const res = mockResponse();
      const redirectUri = 'http://localhost:3000/callback';

      await controller.startOAuth('google', res, redirectUri);

      expect(res.redirect).toHaveBeenCalled();
      const callArg = (res.redirect as any).mock.calls[0][0];
      const url = new URL(callArg);
      const state = url.searchParams.get('state');
      expect(state).toBeTruthy();
      const decodedState = JSON.parse(Buffer.from(state!, 'base64url').toString());
      expect(decodedState.redirectUri).toBe(redirectUri);
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
      const error = 'access_denied';

      await controller.handleCallback('google', {} as any, res, undefined, undefined, error);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:3000/auth/error?error=access_denied'),
      );
    });

    it('should redirect to frontend callback for valid request', async () => {
      const res = mockResponse();

      await controller.handleCallback('google', {} as any, res, 'auth_code', 'state123');

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:3000/auth/callback'),
      );
    });

    it('should throw BadRequestException for invalid provider', async () => {
      const res = mockResponse();

      await expect(
        controller.handleCallback('invalid', {} as any, res, 'code', 'state'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle lowercase provider', async () => {
      const res = mockResponse();

      await controller.handleCallback('google', {} as any, res, 'code', 'state');

      expect(res.redirect).toHaveBeenCalled();
    });

    it('should handle uppercase provider', async () => {
      const res = mockResponse();

      await controller.handleCallback('GOOGLE', {} as any, res, 'code', 'state');

      expect(res.redirect).toHaveBeenCalled();
    });
  });
});
