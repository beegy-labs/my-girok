import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CountryConsentGuard } from './country-consent.guard';
import { REQUIRE_COUNTRY_CONSENT_KEY } from '../decorators/require-country-consent.decorator';
import { AuthenticatedEntity } from '@my-girok/types';

describe('CountryConsentGuard', () => {
  let guard: CountryConsentGuard;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const createMockUser = (
    services: Record<string, { status: string; countries: string[] }>,
  ): AuthenticatedEntity => ({
    type: 'USER',
    id: 'user-123',
    email: 'user@example.com',
    name: 'Test User',
    accountMode: 'SERVICE',
    countryCode: 'KR',
    services: services as any,
  });

  const createMockAdmin = (): AuthenticatedEntity => ({
    type: 'ADMIN',
    id: 'admin-123',
    email: 'admin@example.com',
    name: 'Admin User',
    scope: 'SYSTEM',
    tenantId: null,
    roleId: 'role-1',
    roleName: 'SUPER_ADMIN',
    level: 0,
    permissions: ['*'],
    services: {},
  });

  const createMockOperator = (): AuthenticatedEntity => ({
    type: 'OPERATOR',
    id: 'operator-123',
    email: 'operator@example.com',
    name: 'Operator User',
    adminId: 'admin-123',
    serviceId: 'service-1',
    serviceSlug: 'my-girok',
    countryCode: 'KR',
    permissions: ['legal:read'],
  });

  const createMockExecutionContext = (
    user: AuthenticatedEntity | null,
    params: Record<string, string> = {},
    headers: Record<string, string> = {},
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          params,
          headers,
        }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CountryConsentGuard, { provide: Reflector, useValue: mockReflector }],
    }).compile();

    guard = module.get<CountryConsentGuard>(CountryConsentGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true when no country consent is required', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext(createMockUser({}));

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(REQUIRE_COUNTRY_CONSENT_KEY, [
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('should return true when user is not authenticated (let other guards handle)', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue('KR');
      const context = createMockExecutionContext(null);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for admin users (not user type)', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue('KR');
      const context = createMockExecutionContext(createMockAdmin());

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for operator users (not user type)', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue('KR');
      const context = createMockExecutionContext(createMockOperator());

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when user has consent for the specified country', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue('KR');
      const user = createMockUser({
        'my-girok': { status: 'ACTIVE', countries: ['KR', 'US'] },
      });
      const context = createMockExecutionContext(user, { slug: 'my-girok' });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user does not have consent for the country', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue('US');
      const user = createMockUser({
        'my-girok': { status: 'ACTIVE', countries: ['KR'] },
      });
      const context = createMockExecutionContext(user, { slug: 'my-girok' });

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('No consent for country: US');
    });

    it('should throw ForbiddenException when service is not found', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue('KR');
      const user = createMockUser({});
      const context = createMockExecutionContext(user, { slug: 'my-girok' });

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('No consent for country: KR');
    });

    it('should return true when no service slug is provided', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue('KR');
      const user = createMockUser({});
      const context = createMockExecutionContext(user, {});

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    // Dynamic country code tests
    describe('dynamic country code', () => {
      it('should get country code from x-country-code header', () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValue('dynamic');
        const user = createMockUser({
          'my-girok': { status: 'ACTIVE', countries: ['KR'] },
        });
        const context = createMockExecutionContext(
          user,
          { slug: 'my-girok' },
          { 'x-country-code': 'KR' },
        );

        // Act
        const result = guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      });

      it('should get country code from route params', () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValue('dynamic');
        const user = createMockUser({
          'my-girok': { status: 'ACTIVE', countries: ['US'] },
        });
        const context = createMockExecutionContext(
          user,
          { slug: 'my-girok', countryCode: 'US' },
          {},
        );

        // Act
        const result = guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      });

      it('should throw ForbiddenException when dynamic country code is missing', () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValue('dynamic');
        const user = createMockUser({
          'my-girok': { status: 'ACTIVE', countries: ['KR'] },
        });
        const context = createMockExecutionContext(user, { slug: 'my-girok' }, {});

        // Act & Assert
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        expect(() => guard.canActivate(context)).toThrow('Country code required');
      });

      it('should prefer header over route param for dynamic country code', () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValue('dynamic');
        const user = createMockUser({
          'my-girok': { status: 'ACTIVE', countries: ['KR'] },
        });
        const context = createMockExecutionContext(
          user,
          { slug: 'my-girok', countryCode: 'US' },
          { 'x-country-code': 'KR' },
        );

        // Act
        const result = guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      });

      it('should throw ForbiddenException for dynamic when country not in consent', () => {
        // Arrange
        mockReflector.getAllAndOverride.mockReturnValue('dynamic');
        const user = createMockUser({
          'my-girok': { status: 'ACTIVE', countries: ['KR'] },
        });
        const context = createMockExecutionContext(
          user,
          { slug: 'my-girok' },
          { 'x-country-code': 'JP' },
        );

        // Act & Assert
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        expect(() => guard.canActivate(context)).toThrow('No consent for country: JP');
      });
    });

    it('should correctly check at handler and class level', () => {
      // Arrange
      const handlerFn = jest.fn();
      const classFn = jest.fn();
      mockReflector.getAllAndOverride.mockReturnValue('KR');

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: createMockUser({
              'my-girok': { status: 'ACTIVE', countries: ['KR'] },
            }),
            params: { slug: 'my-girok' },
            headers: {},
          }),
        }),
        getHandler: () => handlerFn,
        getClass: () => classFn,
      } as unknown as ExecutionContext;

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(REQUIRE_COUNTRY_CONSENT_KEY, [
        handlerFn,
        classFn,
      ]);
    });
  });
});
