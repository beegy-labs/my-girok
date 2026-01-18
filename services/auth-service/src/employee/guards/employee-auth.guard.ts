import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AdminPayload } from '../../admin/types/admin.types';

/**
 * Employee Auth Guard
 *
 * Allows employees (and admins) to access employee endpoints.
 * Employees can only access their OWN data.
 *
 * Usage:
 * @UseGuards(EmployeeAuthGuard)
 */
@Injectable()
export class EmployeeAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AdminPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Verify this is an admin token (employees are also admins)
      if (payload.type !== 'ADMIN_ACCESS') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Attach employee to request
      (request as Request & { employee: AdminPayload }).employee = payload;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
