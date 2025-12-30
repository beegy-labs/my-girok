import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface AdminPayload {
  sub: string;
  email: string;
  name: string;
  type: 'ADMIN_ACCESS';
  scope: 'SYSTEM' | 'TENANT';
  tenantId: string | null;
  roleName: string;
  level: number;
  permissions: string[];
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
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

      // Verify this is an admin token
      if (payload.type !== 'ADMIN_ACCESS') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Verify admin has audit:read permission
      const hasAuditPermission =
        payload.permissions.includes('*') || payload.permissions.includes('audit:read');

      if (!hasAuditPermission) {
        throw new UnauthorizedException('Insufficient permissions');
      }

      // Attach admin to request
      (request as Request & { admin: AdminPayload }).admin = payload;

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
