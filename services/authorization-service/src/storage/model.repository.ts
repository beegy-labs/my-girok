/**
 * Model Repository
 *
 * Handles CRUD operations for authorization models (DSL).
 * Only one model can be active at a time.
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationModel, TypeDefinition } from '../types';
import { compile, CompilationResult } from '../dsl';

/**
 * Options for creating a model
 */
export interface CreateModelOptions {
  dslSource: string;
  activate?: boolean;
}

/**
 * Model with raw Prisma fields
 */
interface PrismaModel {
  id: string;
  versionId: string;
  schemaVersion: string;
  dslSource: string;
  compiledModel: unknown;
  typeDefinitions: unknown;
  isActive: boolean;
  createdAt: Date;
}

@Injectable()
export class ModelRepository {
  private cachedActiveModel: AuthorizationModel | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new authorization model from DSL source
   */
  async create(
    options: CreateModelOptions,
  ): Promise<CompilationResult & { model?: AuthorizationModel }> {
    // Compile the DSL
    const result = compile(options.dslSource);

    if (!result.success || !result.model) {
      return result;
    }

    const model = result.model;

    // Store in database
    const created = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // If activating, deactivate all other models
      if (options.activate) {
        await tx.authorizationModel.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
      }

      return tx.authorizationModel.create({
        data: {
          id: model.id,
          versionId: model.versionId,
          schemaVersion: model.schemaVersion,
          dslSource: model.dslSource,
          compiledModel: JSON.parse(JSON.stringify(model.types)),
          typeDefinitions: JSON.parse(JSON.stringify(model.types)),
          isActive: options.activate ?? false,
        },
      });
    });

    const savedModel = this.toAuthorizationModel(created);

    // Update cache if activated
    if (options.activate) {
      this.cachedActiveModel = savedModel;
    }

    return {
      ...result,
      model: savedModel,
    };
  }

  /**
   * Get the currently active model
   */
  async getActive(): Promise<AuthorizationModel | null> {
    // Return cached model if available
    if (this.cachedActiveModel) {
      return this.cachedActiveModel;
    }

    const model = await this.prisma.authorizationModel.findFirst({
      where: { isActive: true },
    });

    if (!model) {
      return null;
    }

    const authModel = this.toAuthorizationModel(model);
    this.cachedActiveModel = authModel;
    return authModel;
  }

  /**
   * Get a model by ID
   */
  async getById(id: string): Promise<AuthorizationModel | null> {
    const model = await this.prisma.authorizationModel.findUnique({
      where: { id },
    });

    if (!model) {
      return null;
    }

    return this.toAuthorizationModel(model);
  }

  /**
   * Get a model by version ID
   */
  async getByVersionId(versionId: string): Promise<AuthorizationModel | null> {
    const model = await this.prisma.authorizationModel.findFirst({
      where: { versionId },
    });

    if (!model) {
      return null;
    }

    return this.toAuthorizationModel(model);
  }

  /**
   * Activate a specific model
   */
  async activate(id: string): Promise<AuthorizationModel | null> {
    const model = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Check if model exists
      const existing = await tx.authorizationModel.findUnique({
        where: { id },
      });

      if (!existing) {
        return null;
      }

      // Deactivate all other models
      await tx.authorizationModel.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });

      // Activate this model
      return tx.authorizationModel.update({
        where: { id },
        data: { isActive: true },
      });
    });

    if (!model) {
      return null;
    }

    const authModel = this.toAuthorizationModel(model);
    this.cachedActiveModel = authModel;
    return authModel;
  }

  /**
   * List all models
   */
  async list(options?: { limit?: number; offset?: number }): Promise<AuthorizationModel[]> {
    const models = await this.prisma.authorizationModel.findMany({
      take: options?.limit ?? 100,
      skip: options?.offset,
      orderBy: { createdAt: 'desc' },
    });

    return models.map(this.toAuthorizationModel);
  }

  /**
   * Delete a model
   */
  async delete(id: string): Promise<boolean> {
    try {
      const model = await this.prisma.authorizationModel.findUnique({
        where: { id },
      });

      if (!model) {
        return false;
      }

      // Don't delete active model
      if (model.isActive) {
        throw new Error('Cannot delete active model');
      }

      await this.prisma.authorizationModel.delete({
        where: { id },
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Invalidate the cached active model
   */
  invalidateCache(): void {
    this.cachedActiveModel = null;
  }

  /**
   * Convert Prisma model to AuthorizationModel
   */
  private toAuthorizationModel(model: PrismaModel): AuthorizationModel {
    return {
      id: model.id,
      versionId: model.versionId,
      schemaVersion: model.schemaVersion,
      dslSource: model.dslSource,
      types: model.compiledModel as Record<string, TypeDefinition>,
      isActive: model.isActive,
      createdAt: model.createdAt,
    };
  }
}
