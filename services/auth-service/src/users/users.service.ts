import { Injectable, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
import {
  IdentityGrpcClient,
  isGrpcError,
  AccountStatus as GrpcAccountStatus,
} from '@my-girok/nest-common';
import { status as GrpcStatus } from '@grpc/grpc-js';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private identityClient: IdentityGrpcClient) {}

  async findById(id: string) {
    try {
      const response = await this.identityClient.getAccount({ id });

      if (!response.account) {
        throw new NotFoundException('User not found');
      }

      return this.mapAccountToUser(response.account);
    } catch (error) {
      if (isGrpcError(error) && error.code === GrpcStatus.NOT_FOUND) {
        throw new NotFoundException('User not found');
      }
      this.logger.error('Failed to find user by ID', error);
      throw error;
    }
  }

  async findByEmail(email: string) {
    try {
      const response = await this.identityClient.getAccountByEmail({ email });

      if (!response.account) {
        throw new NotFoundException('User not found');
      }

      return this.mapAccountToUser(response.account);
    } catch (error) {
      if (isGrpcError(error) && error.code === GrpcStatus.NOT_FOUND) {
        throw new NotFoundException('User not found');
      }
      this.logger.error('Failed to find user by email', error);
      throw error;
    }
  }

  async findByUsername(username: string) {
    try {
      const response = await this.identityClient.getAccountByUsername({ username });

      if (!response.account) {
        throw new NotFoundException('User not found');
      }

      return this.mapAccountToUser(response.account);
    } catch (error) {
      if (isGrpcError(error) && error.code === GrpcStatus.NOT_FOUND) {
        throw new NotFoundException('User not found');
      }
      this.logger.error('Failed to find user by username', error);
      throw error;
    }
  }

  async updateProfile(userId: string, _data: { name?: string; avatar?: string }) {
    try {
      // Note: Profile updates should go through identity-service profile API
      // For now, we update the account status to trigger a refresh
      const response = await this.identityClient.updateAccount({
        id: userId,
        // Profile fields like name/avatar are stored in Profile model in identity-service
      });

      if (!response.account) {
        throw new NotFoundException('User not found');
      }

      return this.mapAccountToUser(response.account);
    } catch (error) {
      if (isGrpcError(error) && error.code === GrpcStatus.NOT_FOUND) {
        throw new NotFoundException('User not found');
      }
      this.logger.error('Failed to update profile', error);
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, _newPassword: string) {
    try {
      // Validate current password via gRPC
      const passwordResponse = await this.identityClient.validatePassword({
        account_id: userId,
        password: currentPassword,
      });

      if (!passwordResponse.valid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Note: Password update should be handled by identity-service
      // This would require a new gRPC method: UpdatePassword
      // For now, throw an error indicating this needs identity-service
      throw new UnauthorizedException('Password change must be performed through identity-service');
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (isGrpcError(error) && error.code === GrpcStatus.NOT_FOUND) {
        throw new NotFoundException('User not found');
      }
      this.logger.error('Failed to change password', error);
      throw error;
    }
  }

  private mapAccountToUser(account: {
    id: string;
    email: string;
    username: string;
    status: GrpcAccountStatus;
    email_verified: boolean;
    created_at?: { seconds: number; nanos: number };
    updated_at?: { seconds: number; nanos: number };
  }) {
    return {
      id: account.id,
      email: account.email,
      username: account.username,
      emailVerified: account.email_verified,
      createdAt: account.created_at ? new Date(account.created_at.seconds * 1000) : new Date(),
      updatedAt: account.updated_at ? new Date(account.updated_at.seconds * 1000) : new Date(),
    };
  }
}
