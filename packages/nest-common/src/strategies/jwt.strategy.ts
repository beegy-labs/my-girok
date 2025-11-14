import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * JWT Authentication Strategy
 * Validates JWT tokens and extracts user payload
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  /**
   * Validate JWT payload and return user object
   * @param payload - JWT payload containing user information
   * @returns User object to be attached to request
   */
  async validate(payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
