import { Injectable, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { IdentityGrpcClient, AuthGrpcClient, Permission } from '../grpc-clients';
import { SessionService } from '../session/session.service';
import { BffSession } from '../common/types';
import { OperatorLoginDto, OperatorInfoDto } from './dto/operator.dto';

const SESSION_CONTEXT = {
  USER: 1,
  OPERATOR: 2,
} as const;

@Injectable()
export class OperatorService {
  private readonly logger = new Logger(OperatorService.name);

  constructor(
    private readonly identityClient: IdentityGrpcClient,
    private readonly authClient: AuthGrpcClient,
    private readonly sessionService: SessionService,
  ) {}

  async login(
    req: Request,
    res: Response,
    dto: OperatorLoginDto,
  ): Promise<{
    success: boolean;
    operator?: OperatorInfoDto;
    mfaRequired?: boolean;
    challengeId?: string;
    message: string;
  }> {
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
      // First authenticate as a user
      const account = await this.identityClient.getAccountByEmail(dto.email);
      if (!account) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Validate password
      const passwordResult = await this.identityClient.validatePassword(account.id, dto.password);
      if (!passwordResult.valid) {
        await this.identityClient.recordLoginAttempt(
          account.id,
          dto.email,
          ip,
          userAgent,
          false,
          'Invalid password',
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check operator assignment
      const assignmentResult = await this.authClient.getOperatorAssignment(
        account.id,
        dto.serviceId,
        dto.countryCode,
      );

      if (!assignmentResult.found || !assignmentResult.assignment) {
        throw new ForbiddenException('No operator assignment found for this service');
      }

      const assignment = assignmentResult.assignment;

      // Check if assignment is active
      if (assignment.status !== 1) {
        // ACTIVE = 1
        throw new ForbiddenException('Operator assignment is not active');
      }

      // Handle MFA if enabled
      if (account.mfaEnabled) {
        // For now, return MFA required - would need a challenge system similar to user/admin
        return {
          success: true,
          mfaRequired: true,
          challengeId: 'operator_mfa_not_implemented',
          message: 'MFA verification required',
        };
      }

      // Create operator session
      const sessionResponse = await this.identityClient.createSession({
        accountId: account.id,
        ipAddress: ip,
        userAgent,
        sessionContext: SESSION_CONTEXT.OPERATOR,
        serviceId: dto.serviceId,
        operatorAssignmentId: assignment.id,
      });

      const metadata = this.sessionService.extractMetadata(req);
      const deviceFingerprint = this.sessionService.getDeviceFingerprint(req);

      // Get permissions
      const permissions = this.extractPermissions(assignment.permissions);

      await this.sessionService.createSession(
        res,
        {
          accountType: 'OPERATOR',
          accountId: account.id,
          email: account.email,
          serviceId: dto.serviceId,
          accessToken: sessionResponse.accessToken,
          refreshToken: sessionResponse.refreshToken,
          deviceFingerprint,
          mfaVerified: false,
          mfaRequired: account.mfaEnabled,
          permissions,
        },
        metadata,
      );

      // Record successful login
      await this.identityClient.recordLoginAttempt(
        account.id,
        account.email,
        ip,
        userAgent,
        true,
        '',
      );

      this.logger.log(`Operator logged in: ${account.email} for service ${dto.serviceId}`);

      return {
        success: true,
        operator: {
          id: assignment.id,
          accountId: account.id,
          email: account.email,
          serviceId: dto.serviceId,
          countryCode: dto.countryCode,
          permissions,
        },
        message: 'Login successful',
      };
    } catch (error) {
      this.logger.error(`Operator login failed for ${dto.email}`, error);
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException)
        throw error;
      throw new UnauthorizedException('Login failed');
    }
  }

  async logout(req: Request, res: Response): Promise<{ success: boolean; message: string }> {
    try {
      await this.sessionService.destroySession(req, res);
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      this.logger.error('Operator logout failed', error);
      await this.sessionService.destroySession(req, res);
      return { success: true, message: 'Logged out' };
    }
  }

  async getMe(session: BffSession): Promise<OperatorInfoDto> {
    return {
      id: session.id,
      accountId: session.accountId,
      email: session.email,
      serviceId: session.serviceId || '',
      countryCode: '', // Would need to store this in session
      permissions: session.permissions,
    };
  }

  private extractPermissions(permissions?: Permission[]): string[] {
    if (!permissions) return [];
    return permissions.map((p) => `${p.resource}:${p.action}`);
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
  }
}
