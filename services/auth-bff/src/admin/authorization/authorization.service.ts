import { Injectable, Logger } from '@nestjs/common';
import { AuthorizationGrpcClient } from '../../grpc-clients/authorization.client';

@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(private readonly authzClient: AuthorizationGrpcClient) {}

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
      const models = await this.authzClient.listModels(1);

      if (!models || models.models.length === 0) {
        return {
          id: '',
          version: 0,
          content: '',
          isActive: false,
          createdAt: new Date().toISOString(),
          createdBy: '',
        };
      }

      const activeModel = models.models.find((m) => m.isActive) || models.models[0];

      return {
        id: activeModel.modelId,
        version: parseInt(activeModel.versionId, 10) || 0,
        content: '',
        isActive: activeModel.isActive,
        createdAt: activeModel.createdAt,
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
      const result = await this.authzClient.listModels(100);

      if (!result) {
        return [];
      }

      return result.models.map((m) => ({
        id: m.modelId,
        version: parseInt(m.versionId, 10) || 0,
        isActive: m.isActive,
        createdAt: m.createdAt,
      }));
    } catch (error) {
      this.logger.error(`Failed to get model versions: ${error}`);
      return [];
    }
  }

  /**
   * Create a new model
   */
  async createModel(dslSource: string, activate?: boolean) {
    try {
      const result = await this.authzClient.writeModel(dslSource, activate);

      if (!result) {
        throw new Error('Failed to create model: No response from server');
      }

      if (!result.success) {
        return {
          success: false,
          errors: result.errors || [],
        };
      }

      return {
        success: true,
        modelId: result.modelId,
        versionId: result.versionId,
      };
    } catch (error) {
      this.logger.error(`Failed to create model: ${error}`);
      throw error;
    }
  }

  /**
   * Validate a model
   */
  async validateModel(dslSource: string) {
    // Model validation is handled by authorization-service
    // This is a simple validation
    if (!dslSource || dslSource.trim().length === 0) {
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
   * Activate a model
   */
  async activateModel(id: string) {
    try {
      const result = await this.authzClient.activateModel(id);

      if (!result) {
        throw new Error('Failed to activate model: No response from server');
      }

      if (!result.success) {
        throw new Error(result.message || 'Failed to activate model');
      }

      return {
        success: true,
        message: result.message || 'Model activated successfully',
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
   * List objects a user can access
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
   * List users with access to an object
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
