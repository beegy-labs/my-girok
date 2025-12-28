import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ID } from '@my-girok/nest-common';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from '../../auth/auth.service';
import {
  RequestLinkDto,
  AcceptLinkDto,
  LinkableAccount,
  LinkedAccount,
  AcceptLinkResult,
  AccountLinkResponse,
  PlatformConsentInput,
} from '../dto/account-link.dto';

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  password: string | null;
  accountMode: string;
  createdAt: Date;
}

interface UserServiceRow {
  userId: string;
  serviceId: string;
  serviceSlug: string;
  serviceName: string;
  countryCode: string;
  status: string;
  joinedAt: Date;
}

interface AccountLinkRow {
  id: string;
  primaryUserId: string;
  linkedUserId: string;
  linkedServiceId: string;
  status: string;
  linkedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class AccountLinkingService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async findLinkableAccounts(userId: string): Promise<LinkableAccount[]> {
    // Get current user's email
    const users = await this.prisma.$queryRaw<UserRow[]>`
      SELECT id, email, name, account_mode as "accountMode", created_at as "createdAt"
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;

    const user = users[0];
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Single query to get linkable users with their services (fixes N+1)
    const results = await this.prisma.$queryRaw<
      Array<{
        userId: string;
        email: string;
        name: string | null;
        accountMode: string;
        userCreatedAt: Date;
        serviceSlug: string | null;
        serviceName: string | null;
        joinedAt: Date | null;
      }>
    >`
      SELECT
        u.id as "userId",
        u.email,
        u.name,
        u.account_mode as "accountMode",
        u.created_at as "userCreatedAt",
        s.slug as "serviceSlug",
        s.name as "serviceName",
        us.joined_at as "joinedAt"
      FROM users u
      LEFT JOIN user_services us ON u.id = us.user_id AND us.status = 'ACTIVE'
      LEFT JOIN services s ON us.service_id = s.id
      WHERE u.id != ${userId}
        AND u.email = ${user.email}
        AND u.account_mode = 'SERVICE'
      ORDER BY u.id, us.joined_at ASC
    `;

    // Group results by user
    const userMap = new Map<string, LinkableAccount>();

    for (const row of results) {
      if (!userMap.has(row.userId)) {
        userMap.set(row.userId, {
          id: row.userId,
          email: this.maskEmail(row.email),
          services: [],
          createdAt: row.userCreatedAt,
        });
      }

      // Add service if exists
      if (row.serviceSlug && row.serviceName) {
        userMap.get(row.userId)!.services.push({
          slug: row.serviceSlug,
          name: row.serviceName,
          joinedAt: row.joinedAt!,
        });
      }
    }

    return Array.from(userMap.values());
  }

  async requestLink(primaryUserId: string, dto: RequestLinkDto): Promise<AccountLinkResponse> {
    // Validate primary user exists
    const primaryUsers = await this.prisma.$queryRaw<UserRow[]>`
      SELECT id, email, name, account_mode as "accountMode"
      FROM users WHERE id = ${primaryUserId} LIMIT 1
    `;

    if (!primaryUsers.length) {
      throw new NotFoundException('Primary user not found');
    }

    // Validate linked user exists
    const linkedUsers = await this.prisma.$queryRaw<UserRow[]>`
      SELECT id, email, name, account_mode as "accountMode"
      FROM users WHERE id = ${dto.linkedUserId} LIMIT 1
    `;

    if (!linkedUsers.length) {
      throw new NotFoundException('Linked user not found');
    }

    const primaryUser = primaryUsers[0];
    const linkedUser = linkedUsers[0];

    // Both accounts cannot already be UNIFIED
    if (primaryUser.accountMode === 'UNIFIED' && linkedUser.accountMode === 'UNIFIED') {
      throw new BadRequestException('Both accounts are already UNIFIED');
    }

    // Check for existing link
    const existingLinks = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM account_links
      WHERE (primary_user_id = ${primaryUserId} AND linked_user_id = ${dto.linkedUserId})
         OR (primary_user_id = ${dto.linkedUserId} AND linked_user_id = ${primaryUserId})
      LIMIT 1
    `;

    if (existingLinks.length) {
      throw new ConflictException('Link already exists or pending');
    }

    // Get linked user's primary service
    const linkedUserServices = await this.prisma.$queryRaw<{ serviceId: string }[]>`
      SELECT service_id as "serviceId"
      FROM user_services
      WHERE user_id = ${dto.linkedUserId}
      ORDER BY joined_at ASC
      LIMIT 1
    `;

    if (!linkedUserServices.length) {
      throw new BadRequestException('Linked user has no service');
    }

    // Create pending link
    const linkId = ID.generate();
    const links = await this.prisma.$queryRaw<AccountLinkRow[]>`
      INSERT INTO account_links (
        id, primary_user_id, linked_user_id, linked_service_id, status, created_at
      )
      VALUES (
        ${linkId}, ${primaryUserId}, ${dto.linkedUserId},
        ${linkedUserServices[0].serviceId}, 'PENDING', NOW()
      )
      RETURNING
        id, primary_user_id as "primaryUserId", linked_user_id as "linkedUserId",
        linked_service_id as "linkedServiceId", status,
        linked_at as "linkedAt", created_at as "createdAt"
    `;

    return links[0];
  }

  async acceptLink(linkedUserId: string, dto: AcceptLinkDto): Promise<AcceptLinkResult> {
    // Find pending link
    const links = await this.prisma.$queryRaw<
      Array<AccountLinkRow & { primaryEmail: string; linkedEmail: string; linkedPassword: string }>
    >`
      SELECT
        al.id, al.primary_user_id as "primaryUserId", al.linked_user_id as "linkedUserId",
        al.linked_service_id as "linkedServiceId", al.status,
        al.linked_at as "linkedAt", al.created_at as "createdAt",
        pu.email as "primaryEmail",
        lu.email as "linkedEmail",
        lu.password as "linkedPassword"
      FROM account_links al
      JOIN users pu ON al.primary_user_id = pu.id
      JOIN users lu ON al.linked_user_id = lu.id
      WHERE al.id = ${dto.linkId}
        AND al.linked_user_id = ${linkedUserId}
        AND al.status = 'PENDING'
      LIMIT 1
    `;

    if (!links.length) {
      throw new NotFoundException('Link request not found or already processed');
    }

    const link = links[0];

    // Verify password
    if (!link.linkedPassword) {
      throw new UnauthorizedException('Password verification required');
    }

    const isValid = await bcrypt.compare(dto.password, link.linkedPassword);
    if (!isValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Process linking in transaction (CLAUDE.md: @Transactional for multi-step DB)
    const now = new Date();

    const { allServices, primaryUser } = await this.prisma.$transaction(async (tx) => {
      // Collect platform consents within transaction
      await this.collectPlatformConsentTx(tx, linkedUserId, dto.platformConsents);

      // Update link status
      await tx.$executeRaw`
        UPDATE account_links
        SET status = 'ACTIVE', linked_at = ${now}
        WHERE id = ${link.id}
      `;

      // Update both users to UNIFIED mode
      await tx.$executeRaw`
        UPDATE users
        SET account_mode = 'UNIFIED', updated_at = NOW()
        WHERE id IN (${link.primaryUserId}, ${link.linkedUserId})
      `;

      // Get all services for unified token
      const services = await tx.$queryRaw<UserServiceRow[]>`
        SELECT
          us.user_id as "userId",
          us.service_id as "serviceId",
          s.slug as "serviceSlug",
          s.name as "serviceName",
          us.country_code as "countryCode",
          us.status,
          us.joined_at as "joinedAt"
        FROM user_services us
        JOIN services s ON us.service_id = s.id
        WHERE us.user_id IN (${link.primaryUserId}, ${link.linkedUserId})
          AND us.status = 'ACTIVE'
      `;

      // Get primary user for token generation
      const users = await tx.$queryRaw<
        Array<{ id: string; email: string; countryCode: string | null }>
      >`
        SELECT id, email, country_code as "countryCode"
        FROM users WHERE id = ${link.primaryUserId} LIMIT 1
      `;

      return { allServices: services, primaryUser: users[0] };
    });

    // Generate unified token (outside transaction - no DB write)
    const tokens = await this.authService.generateTokensWithServices(
      primaryUser.id,
      primaryUser.email,
      'UNIFIED',
      primaryUser.countryCode || 'KR',
      allServices.map((s) => ({
        status: s.status,
        countryCode: s.countryCode,
        serviceSlug: s.serviceSlug,
      })),
    );

    return {
      linkedAt: now,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async getLinkedAccounts(userId: string): Promise<LinkedAccount[]> {
    // Get all active links where user is either primary or linked
    const links = await this.prisma.$queryRaw<
      Array<{
        id: string;
        primaryUserId: string;
        linkedUserId: string;
        linkedAt: Date | null;
        primaryEmail: string;
        primaryName: string | null;
        linkedEmail: string;
        linkedName: string | null;
        serviceId: string;
        serviceSlug: string;
        serviceName: string;
      }>
    >`
      SELECT
        al.id,
        al.primary_user_id as "primaryUserId",
        al.linked_user_id as "linkedUserId",
        al.linked_at as "linkedAt",
        pu.email as "primaryEmail",
        pu.name as "primaryName",
        lu.email as "linkedEmail",
        lu.name as "linkedName",
        s.id as "serviceId",
        s.slug as "serviceSlug",
        s.name as "serviceName"
      FROM account_links al
      JOIN users pu ON al.primary_user_id = pu.id
      JOIN users lu ON al.linked_user_id = lu.id
      JOIN services s ON al.linked_service_id = s.id
      WHERE (al.primary_user_id = ${userId} OR al.linked_user_id = ${userId})
        AND al.status = 'ACTIVE'
    `;

    return links.map((link) => {
      const isCurrentPrimary = link.primaryUserId === userId;
      return {
        id: link.id,
        linkedUser: isCurrentPrimary
          ? { id: link.linkedUserId, email: link.linkedEmail, name: link.linkedName }
          : { id: link.primaryUserId, email: link.primaryEmail, name: link.primaryName },
        service: {
          id: link.serviceId,
          slug: link.serviceSlug,
          name: link.serviceName,
        },
        linkedAt: link.linkedAt,
      };
    });
  }

  async unlinkAccount(userId: string, linkId: string): Promise<void> {
    // Find active link
    const links = await this.prisma.$queryRaw<AccountLinkRow[]>`
      SELECT
        id, primary_user_id as "primaryUserId", linked_user_id as "linkedUserId",
        linked_service_id as "linkedServiceId", status
      FROM account_links
      WHERE id = ${linkId}
        AND (primary_user_id = ${userId} OR linked_user_id = ${userId})
        AND status = 'ACTIVE'
      LIMIT 1
    `;

    if (!links.length) {
      throw new NotFoundException('Link not found');
    }

    const link = links[0];

    // Process unlinking in transaction (CLAUDE.md: @Transactional for multi-step DB)
    await this.prisma.$transaction(async (tx) => {
      // Update link status
      await tx.$executeRaw`
        UPDATE account_links
        SET status = 'UNLINKED'
        WHERE id = ${linkId}
      `;

      // Check if primary user has other active links
      const primaryOtherLinks = await tx.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM account_links
        WHERE primary_user_id = ${link.primaryUserId}
          AND status = 'ACTIVE'
          AND id != ${linkId}
      `;

      // Check if linked user has other active links
      const linkedOtherLinks = await tx.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM account_links
        WHERE (primary_user_id = ${link.linkedUserId} OR linked_user_id = ${link.linkedUserId})
          AND status = 'ACTIVE'
          AND id != ${linkId}
      `;

      // Revert to SERVICE mode if no other links
      if (Number(primaryOtherLinks[0]?.count ?? 0) === 0) {
        await tx.$executeRaw`
          UPDATE users SET account_mode = 'SERVICE', updated_at = NOW()
          WHERE id = ${link.primaryUserId}
        `;
      }

      if (Number(linkedOtherLinks[0]?.count ?? 0) === 0) {
        await tx.$executeRaw`
          UPDATE users SET account_mode = 'SERVICE', updated_at = NOW()
          WHERE id = ${link.linkedUserId}
        `;
      }
    });
  }

  /**
   * Collect platform consents within a transaction
   * CLAUDE.md: Use transaction for multi-step DB operations
   */
  private async collectPlatformConsentTx(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    userId: string,
    consents: PlatformConsentInput[],
  ): Promise<void> {
    for (const consent of consents) {
      // Check if consent exists (PLATFORM scope)
      const existing = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM consents
        WHERE user_id = ${userId}
          AND scope = 'PLATFORM'
          AND consent_type = ${consent.type}::consent_type
          AND country_code = ${consent.countryCode}
        LIMIT 1
      `;

      if (existing.length) {
        // Update existing
        await tx.$executeRaw`
          UPDATE consents
          SET agreed = ${consent.agreed},
              document_id = ${consent.documentId || null},
              agreed_at = NOW()
          WHERE id = ${existing[0].id}
        `;
      } else {
        // Create new with PLATFORM scope
        const consentId = ID.generate();
        await tx.$executeRaw`
          INSERT INTO consents (
            id, user_id, consent_type, scope, country_code, document_id, agreed, agreed_at, created_at
          )
          VALUES (
            ${consentId}, ${userId}, ${consent.type}::consent_type, 'PLATFORM',
            ${consent.countryCode}, ${consent.documentId || null}, ${consent.agreed},
            NOW(), NOW()
          )
        `;
      }
    }
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 2) {
      return `${local[0]}***@${domain}`;
    }
    const maskedLocal = local.charAt(0) + '***' + local.charAt(local.length - 1);
    return `${maskedLocal}@${domain}`;
  }
}
