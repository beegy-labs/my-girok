import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

interface TesterStatus {
  isTester: boolean;
  type?: 'admin' | 'user';
  bypassAll?: boolean;
  bypassDomain?: boolean;
  bypassIP?: boolean;
  bypassRate?: boolean;
}

interface ServiceConfig {
  jwtValidation: boolean;
  domainValidation: boolean;
  ipWhitelistEnabled: boolean;
  ipWhitelist: string[];
  rateLimitEnabled: boolean;
  rateLimitRequests: number;
  rateLimitWindowSeconds: number;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  auditLevel: string;
}

interface Service {
  id: string;
  slug: string;
  name: string;
  domains: string[];
}

/**
 * Enhanced ServiceAccessGuard for Admin APIs
 * Supports tester bypass, domain validation, IP whitelist, and maintenance mode
 * Issue: #411
 */
@Injectable()
export class AdminServiceAccessGuard implements CanActivate {
  private readonly logger = new Logger(AdminServiceAccessGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user || request.admin;

    // Skip if no service context required
    if (!request.params?.serviceId) {
      return true;
    }

    const serviceId = request.params.serviceId;
    const service = await this.getService(serviceId);

    if (!service) {
      throw new UnauthorizedException('Service not found');
    }

    // 1. Check tester status (bypasses validation)
    if (user?.sub) {
      const testerStatus = await this.checkTesterStatus(user, serviceId);
      if (testerStatus.isTester) {
        request.testerBypass = testerStatus;
        this.logger.debug(`Tester bypass for ${user.sub} on service ${serviceId}`);
        return true;
      }
    }

    // 2. Get service config
    const config = await this.getServiceConfig(serviceId);

    // 3. Domain validation (if enabled)
    if (config?.domainValidation !== false && service.domains?.length > 0) {
      this.validateDomain(request, service);
    }

    // 4. IP validation (if enabled)
    if (config?.ipWhitelistEnabled && config.ipWhitelist?.length > 0) {
      this.validateIP(request, config.ipWhitelist);
    }

    // 5. Maintenance mode check
    if (config?.maintenanceMode) {
      throw new UnauthorizedException(config.maintenanceMessage || 'Service is under maintenance');
    }

    return true;
  }

  private async getService(serviceId: string): Promise<Service | null> {
    const result = await this.prisma.$queryRaw<Service[]>`
      SELECT id, slug, name, domains
      FROM services
      WHERE id = ${serviceId}::uuid
      LIMIT 1
    `;
    return result[0] || null;
  }

  private async getServiceConfig(serviceId: string): Promise<ServiceConfig | null> {
    const result = await this.prisma.$queryRaw<ServiceConfig[]>`
      SELECT
        jwt_validation as "jwtValidation",
        domain_validation as "domainValidation",
        ip_whitelist_enabled as "ipWhitelistEnabled",
        ip_whitelist as "ipWhitelist",
        rate_limit_enabled as "rateLimitEnabled",
        rate_limit_requests as "rateLimitRequests",
        rate_limit_window_seconds as "rateLimitWindowSeconds",
        maintenance_mode as "maintenanceMode",
        maintenance_message as "maintenanceMessage",
        audit_level as "auditLevel"
      FROM service_configs
      WHERE service_id = ${serviceId}::uuid
      LIMIT 1
    `;
    return result[0] || null;
  }

  private async checkTesterStatus(
    user: { sub: string; type?: string },
    serviceId: string,
  ): Promise<TesterStatus> {
    // Check admin tester
    if (user.type === 'ADMIN_ACCESS') {
      const adminTester = await this.prisma.$queryRaw<
        { bypass_all: boolean; bypass_domain: boolean; expires_at: Date | null }[]
      >`
        SELECT bypass_all, bypass_domain, expires_at
        FROM service_tester_admins
        WHERE service_id = ${serviceId}::uuid AND admin_id = ${user.sub}::uuid
        LIMIT 1
      `;

      if (adminTester[0] && this.isNotExpired(adminTester[0].expires_at)) {
        return {
          isTester: true,
          type: 'admin',
          bypassAll: adminTester[0].bypass_all,
          bypassDomain: adminTester[0].bypass_domain,
        };
      }
    }

    // Check user tester
    if (user.type === 'USER_ACCESS') {
      const userTester = await this.prisma.$queryRaw<
        {
          bypass_all: boolean;
          bypass_domain: boolean;
          bypass_ip: boolean;
          bypass_rate: boolean;
          expires_at: Date | null;
        }[]
      >`
        SELECT bypass_all, bypass_domain, bypass_ip, bypass_rate, expires_at
        FROM service_tester_users
        WHERE service_id = ${serviceId}::uuid AND user_id = ${user.sub}::uuid
        LIMIT 1
      `;

      if (userTester[0] && this.isNotExpired(userTester[0].expires_at)) {
        return {
          isTester: true,
          type: 'user',
          bypassAll: userTester[0].bypass_all,
          bypassDomain: userTester[0].bypass_domain,
          bypassIP: userTester[0].bypass_ip,
          bypassRate: userTester[0].bypass_rate,
        };
      }
    }

    return { isTester: false };
  }

  private validateDomain(request: { headers: { host?: string } }, service: Service): void {
    const host = request.headers.host?.split(':')[0]; // Remove port

    if (!host) {
      throw new UnauthorizedException('Host header is required');
    }

    if (!service.domains.includes(host)) {
      throw new UnauthorizedException(`Domain ${host} is not authorized for this service`);
    }
  }

  private validateIP(
    request: { headers: Record<string, string | undefined>; socket?: { remoteAddress?: string } },
    whitelist: string[],
  ): void {
    const clientIP = this.getClientIP(request);

    if (!clientIP) {
      throw new UnauthorizedException('Unable to determine client IP');
    }

    const isAllowed = whitelist.some((allowed) => {
      if (allowed.includes('/')) {
        // CIDR notation
        return this.isIPInCIDR(clientIP, allowed);
      }
      return clientIP === allowed;
    });

    if (!isAllowed) {
      throw new UnauthorizedException('IP address not authorized');
    }
  }

  private isNotExpired(expiresAt: Date | null): boolean {
    if (!expiresAt) return true;
    return new Date(expiresAt) > new Date();
  }

  private getClientIP(request: {
    headers: Record<string, string | undefined>;
    socket?: { remoteAddress?: string };
  }): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
  }

  private isIPInCIDR(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split('/');
    const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1);

    const ipNum = this.ipToNumber(ip);
    const rangeNum = this.ipToNumber(range);

    if (ipNum === null || rangeNum === null) {
      return false;
    }

    return (ipNum & mask) === (rangeNum & mask);
  }

  private ipToNumber(ip: string): number | null {
    const parts = ip.split('.');
    if (parts.length !== 4) {
      return null;
    }

    return parts.reduce((acc, part) => {
      const num = parseInt(part, 10);
      if (isNaN(num) || num < 0 || num > 255) {
        return -1;
      }
      return (acc << 8) + num;
    }, 0);
  }
}
