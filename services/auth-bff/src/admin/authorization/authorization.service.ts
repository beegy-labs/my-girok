import { Injectable, Logger } from '@nestjs/common';
import { AuthorizationGrpcClient } from '../../grpc-clients/authorization.client';
import { PrismaAuthzService } from '../../common/services/prisma-authz.service';

@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(
    private readonly authzClient: AuthorizationGrpcClient,
    private readonly prisma: PrismaAuthzService,
  ) {}

  /**
   * Check permission
   */
  async check(user: string, relation: string, object: string) {
    try {
      const allowed = await this.authzClient.check(user, relation, object);
      return {
        allowed,
        user,
        relation,
        object,
      };
    } catch (error) {
      this.logger.error(`Failed to check permission: ${error}`);
      return {
        allowed: false,
        user,
        relation,
        object,
      };
    }
  }

  /**
   * Batch check permissions
   */
  async batchCheck(checks: Array<{ user: string; relation: string; object: string }>) {
    try {
      const results = await this.authzClient.batchCheck(checks);
      return checks.map((check, index) => ({
        allowed: results[index],
        ...check,
      }));
    } catch (error) {
      this.logger.error(`Failed to batch check permissions: ${error}`);
      return checks.map((check) => ({
        allowed: false,
        ...check,
      }));
    }
  }

  /**
   * Get active authorization model
   */
  async getModel() {
    try {
      const model = await this.prisma.authorizationModel.findFirst({
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!model) {
        return {
          id: '',
          version: 0,
          content: '',
          isActive: false,
          createdAt: new Date().toISOString(),
          createdBy: '',
        };
      }

      return {
        id: model.id,
        version: parseInt(model.versionId, 10) || 0,
        content: model.dslSource,
        isActive: model.isActive || false,
        createdAt: model.createdAt?.toISOString() || new Date().toISOString(),
        createdBy: 'system',
      };
    } catch (error) {
      this.logger.error(`Failed to get active model: ${error}`);
      return {
        id: '',
        version: 0,
        content: '',
        isActive: false,
        createdAt: new Date().toISOString(),
        createdBy: '',
      };
    }
  }

  /**
   * Get all model versions
   */
  async getModelVersions() {
    try {
      const models = await this.prisma.authorizationModel.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      });

      return models.map((model) => ({
        id: model.id,
        version: parseInt(model.versionId, 10) || 0,
        content: model.dslSource,
        isActive: model.isActive || false,
        createdAt: model.createdAt?.toISOString() || new Date().toISOString(),
        createdBy: 'system',
      }));
    } catch (error) {
      this.logger.error(`Failed to get model versions: ${error}`);
      return [];
    }
  }

  /**
   * Create new model version
   * Note: Model creation should be done through authorization-service gRPC
   * This is a placeholder for future implementation
   */
  async createModel(content: string) {
    try {
      const model = await this.prisma.authorizationModel.create({
        data: {
          versionId: Date.now().toString(),
          schemaVersion: '1.0',
          dslSource: content,
          compiledModel: {},
          typeDefinitions: {},
          isActive: false,
        },
      });

      return {
        id: model.id,
        version: parseInt(model.versionId, 10) || 0,
        content: model.dslSource,
        isActive: model.isActive || false,
        createdAt: model.createdAt?.toISOString() || new Date().toISOString(),
        createdBy: 'admin',
      };
    } catch (error) {
      this.logger.error(`Failed to create model: ${error}`);
      throw error;
    }
  }

  /**
   * Validate model syntax
   * Note: Validation should be done by authorization-service
   * This is a placeholder that accepts all models
   */
  async validateModel(content: string) {
    if (!content || content.trim().length === 0) {
      return {
        valid: false,
        errors: ['Model content cannot be empty'],
      };
    }

    return {
      valid: true,
      errors: [],
    };
  }

  /**
   * Activate model version
   */
  async activateModel(id: string) {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.authorizationModel.updateMany({
          where: {
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });

        await tx.authorizationModel.update({
          where: {
            id,
          },
          data: {
            isActive: true,
          },
        });
      });

      const model = await this.prisma.authorizationModel.findUnique({
        where: {
          id,
        },
      });

      if (!model) {
        throw new Error('Model not found after activation');
      }

      return {
        id: model.id,
        version: parseInt(model.versionId, 10) || 0,
        content: model.dslSource,
        isActive: model.isActive || false,
        createdAt: model.createdAt?.toISOString() || new Date().toISOString(),
        createdBy: 'admin',
      };
    } catch (error) {
      this.logger.error(`Failed to activate model: ${error}`);
      throw error;
    }
  }

  /**
   * Grant permission
   */
  async grant(user: string, relation: string, object: string) {
    try {
      await this.authzClient.grant(user, relation, object);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to grant permission: ${error}`);
      throw error;
    }
  }

  /**
   * Revoke permission
   */
  async revoke(user: string, relation: string, object: string) {
    try {
      await this.authzClient.revoke(user, relation, object);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to revoke permission: ${error}`);
      throw error;
    }
  }

  /**
   * List objects user can access
   */
  async listObjects(user: string, relation: string, objectType: string) {
    try {
      const objects = await this.authzClient.listObjects(user, relation, objectType);
      return {
        objects,
        user,
        relation,
        objectType,
      };
    } catch (error) {
      this.logger.error(`Failed to list objects: ${error}`);
      return {
        objects: [],
        user,
        relation,
        objectType,
      };
    }
  }

  /**
   * List users who can access object
   */
  async listUsers(object: string, relation: string) {
    try {
      const users = await this.authzClient.listUsers(object, relation);
      return {
        users,
        object,
        relation,
      };
    } catch (error) {
      this.logger.error(`Failed to list users: ${error}`);
      return {
        users: [],
        object,
        relation,
      };
    }
  }
}
