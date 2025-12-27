import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_COUNTRY_CONSENT_KEY } from '../decorators/require-country-consent.decorator';
import { AuthenticatedEntity, isAuthenticatedUser } from '@my-girok/types';

/**
 * Guard to check if user has consent for the required country
 * Issue: #358
 */
@Injectable()
export class CountryConsentGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredCountry = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRE_COUNTRY_CONSENT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredCountry) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedEntity;

    if (!user || !isAuthenticatedUser(user)) {
      // Let other guards handle non-user auth
      return true;
    }

    // Get country from header, param, or specified value
    const countryCode =
      requiredCountry === 'dynamic'
        ? request.headers['x-country-code'] || request.params.countryCode
        : requiredCountry;

    if (!countryCode) {
      throw new ForbiddenException('Country code required');
    }

    // Get service from param
    const serviceSlug = request.params.slug;
    if (!serviceSlug) {
      return true;
    }

    // Check if user has consent for this country
    const service = user.services[serviceSlug];
    if (!service || !service.countries.includes(countryCode)) {
      throw new ForbiddenException(`No consent for country: ${countryCode}`);
    }

    return true;
  }
}
