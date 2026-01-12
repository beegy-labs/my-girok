/**
 * Authorization gRPC Controller
 *
 * Implements the AuthorizationService gRPC interface.
 */

import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { CheckEngine } from '../engine';
import { TupleRepository, ModelRepository } from '../storage';
import { TupleKey, TupleUtils, CheckRequest as InternalCheckRequest } from '../types';

// gRPC message types (matching proto definitions)
interface CheckRequest {
  user: string;
  relation: string;
  object: string;
  contextualTuples?: Array<{ user: string; relation: string; object: string }>;
  trace?: boolean;
  consistencyToken?: string;
}

interface CheckResponse {
  allowed: boolean;
  resolution?: unknown;
  consistencyToken?: string;
}

interface BatchCheckRequest {
  checks: Array<{ user: string; relation: string; object: string }>;
}

interface BatchCheckResponse {
  results: Array<{ allowed: boolean; error?: string }>;
}

interface WriteRequest {
  writes?: Array<{ user: string; relation: string; object: string }>;
  deletes?: Array<{ user: string; relation: string; object: string }>;
}

interface WriteResponse {
  consistencyToken: string;
  writtenCount: number;
  deletedCount: number;
}

interface ReadRequest {
  user?: string;
  relation?: string;
  object?: string;
  pageSize?: number;
  pageToken?: string;
}

interface ReadResponse {
  tuples: Array<{ user: string; relation: string; object: string }>;
  nextPageToken?: string;
}

interface ListObjectsRequest {
  user: string;
  relation: string;
  type: string;
  pageSize?: number;
  pageToken?: string;
}

interface ListObjectsResponse {
  objects: string[];
  nextPageToken?: string;
}

interface ListUsersRequest {
  object: string;
  relation: string;
  userTypes?: string[];
  pageSize?: number;
  pageToken?: string;
}

interface ListUsersResponse {
  users: string[];
  nextPageToken?: string;
}

interface WriteModelRequest {
  dslSource: string;
  activate?: boolean;
}

interface WriteModelResponse {
  success: boolean;
  modelId?: string;
  versionId?: string;
  errors?: Array<{
    type: string;
    relation?: string;
    message: string;
    line?: number;
    column?: number;
  }>;
  warnings?: Array<{
    type: string;
    relation?: string;
    message: string;
  }>;
}

interface ReadModelRequest {
  versionId?: string;
}

interface ReadModelResponse {
  dslSource: string;
  modelId: string;
  versionId: string;
  isActive: boolean;
}

interface ActivateModelRequest {
  modelId: string;
}

interface ActivateModelResponse {
  success: boolean;
  message?: string;
}

@Controller()
export class AuthorizationGrpcController {
  private readonly logger = new Logger(AuthorizationGrpcController.name);

  constructor(
    private readonly checkEngine: CheckEngine,
    private readonly tupleRepository: TupleRepository,
    private readonly modelRepository: ModelRepository,
  ) {}

  /**
   * Check if a user has a specific relation to an object
   */
  @GrpcMethod('AuthorizationService', 'Check')
  async check(request: CheckRequest): Promise<CheckResponse> {
    try {
      const internalRequest: InternalCheckRequest = {
        user: request.user,
        relation: request.relation,
        object: request.object,
        contextualTuples: request.contextualTuples?.map((t) => ({
          user: t.user,
          relation: t.relation,
          object: t.object,
        })),
        trace: request.trace,
        consistencyToken: request.consistencyToken,
      };

      const result = await this.checkEngine.check(internalRequest);

      return {
        allowed: result.allowed,
        resolution: result.resolution,
        consistencyToken: result.consistencyToken,
      };
    } catch (error) {
      this.logger.error(`Check failed: ${error}`);
      throw new RpcException((error as Error).message);
    }
  }

  /**
   * Batch check multiple permissions
   */
  @GrpcMethod('AuthorizationService', 'BatchCheck')
  async batchCheck(request: BatchCheckRequest): Promise<BatchCheckResponse> {
    try {
      const results = await this.checkEngine.batchCheck(request.checks);
      return { results };
    } catch (error) {
      this.logger.error(`BatchCheck failed: ${error}`);
      throw new RpcException((error as Error).message);
    }
  }

  /**
   * Write tuples (create and/or delete)
   */
  @GrpcMethod('AuthorizationService', 'Write')
  async write(request: WriteRequest): Promise<WriteResponse> {
    try {
      const writes: TupleKey[] =
        request.writes?.map((t) => ({
          user: t.user,
          relation: t.relation,
          object: t.object,
        })) ?? [];

      const deletes: TupleKey[] =
        request.deletes?.map((t) => ({
          user: t.user,
          relation: t.relation,
          object: t.object,
        })) ?? [];

      const result = await this.tupleRepository.write(writes, deletes);

      return {
        consistencyToken: result.txid.toString(),
        writtenCount: result.writtenCount,
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      this.logger.error(`Write failed: ${error}`);
      throw new RpcException((error as Error).message);
    }
  }

  /**
   * Read tuples
   */
  @GrpcMethod('AuthorizationService', 'Read')
  async read(request: ReadRequest): Promise<ReadResponse> {
    try {
      const limit = request.pageSize || 100;
      const offset = request.pageToken ? parseInt(request.pageToken, 10) : 0;

      // Parse filters
      let userType: string | undefined;
      let userId: string | undefined;
      let objectType: string | undefined;
      let objectId: string | undefined;

      if (request.user) {
        const parsed = TupleUtils.parseUser(request.user);
        userType = parsed.type;
        userId = parsed.id;
      }

      if (request.object) {
        const parsed = TupleUtils.parseObject(request.object);
        objectType = parsed.type;
        objectId = parsed.id;
      }

      const tuples = await this.tupleRepository.find({
        userType,
        userId,
        relation: request.relation,
        objectType,
        objectId,
        limit: limit + 1, // Fetch one extra to determine if there's a next page
        offset,
      });

      const hasNext = tuples.length > limit;
      const resultTuples = hasNext ? tuples.slice(0, limit) : tuples;

      return {
        tuples: resultTuples.map((t) => ({
          user: TupleUtils.buildUser(t.userType, t.userId, t.userRelation),
          relation: t.relation,
          object: TupleUtils.buildObject(t.objectType, t.objectId),
        })),
        nextPageToken: hasNext ? (offset + limit).toString() : undefined,
      };
    } catch (error) {
      this.logger.error(`Read failed: ${error}`);
      throw new RpcException((error as Error).message);
    }
  }

  /**
   * List objects a user can access
   */
  @GrpcMethod('AuthorizationService', 'ListObjects')
  async listObjects(request: ListObjectsRequest): Promise<ListObjectsResponse> {
    try {
      const parsedUser = TupleUtils.parseUser(request.user);
      const limit = request.pageSize || 100;
      const offset = request.pageToken ? parseInt(request.pageToken, 10) : 0;

      // Get tuples where user has the relation
      const tuples = await this.tupleRepository.findByUser(
        parsedUser.type,
        parsedUser.id,
        request.relation,
        request.type,
      );

      // TODO: Also check computed relations via check engine
      // For now, just return direct tuples

      const objects = tuples.map((t) => TupleUtils.buildObject(t.objectType, t.objectId));
      const paginatedObjects = objects.slice(offset, offset + limit);
      const hasNext = objects.length > offset + limit;

      return {
        objects: paginatedObjects,
        nextPageToken: hasNext ? (offset + limit).toString() : undefined,
      };
    } catch (error) {
      this.logger.error(`ListObjects failed: ${error}`);
      throw new RpcException((error as Error).message);
    }
  }

  /**
   * List users with access to an object
   */
  @GrpcMethod('AuthorizationService', 'ListUsers')
  async listUsers(request: ListUsersRequest): Promise<ListUsersResponse> {
    try {
      const parsedObject = TupleUtils.parseObject(request.object);
      const limit = request.pageSize || 100;
      const offset = request.pageToken ? parseInt(request.pageToken, 10) : 0;

      // Get tuples where object has the relation
      const tuples = await this.tupleRepository.findByObject(
        parsedObject.type,
        parsedObject.id,
        request.relation,
      );

      // Filter by user types if specified
      let filteredTuples = tuples;
      if (request.userTypes && request.userTypes.length > 0) {
        filteredTuples = tuples.filter((t) => request.userTypes!.includes(t.userType));
      }

      const users = filteredTuples.map((t) =>
        TupleUtils.buildUser(t.userType, t.userId, t.userRelation),
      );
      const paginatedUsers = users.slice(offset, offset + limit);
      const hasNext = users.length > offset + limit;

      return {
        users: paginatedUsers,
        nextPageToken: hasNext ? (offset + limit).toString() : undefined,
      };
    } catch (error) {
      this.logger.error(`ListUsers failed: ${error}`);
      throw new RpcException((error as Error).message);
    }
  }

  /**
   * Write a new authorization model
   */
  @GrpcMethod('AuthorizationService', 'WriteModel')
  async writeModel(request: WriteModelRequest): Promise<WriteModelResponse> {
    try {
      const result = await this.modelRepository.create({
        dslSource: request.dslSource,
        activate: request.activate,
      });

      return {
        success: result.success,
        modelId: result.model?.id,
        versionId: result.model?.versionId,
        errors: result.errors,
        warnings: result.warnings,
      };
    } catch (error) {
      this.logger.error(`WriteModel failed: ${error}`);
      throw new RpcException((error as Error).message);
    }
  }

  /**
   * Read the authorization model
   */
  @GrpcMethod('AuthorizationService', 'ReadModel')
  async readModel(request: ReadModelRequest): Promise<ReadModelResponse> {
    try {
      let model;

      if (request.versionId) {
        model = await this.modelRepository.getByVersionId(request.versionId);
      } else {
        model = await this.modelRepository.getActive();
      }

      if (!model) {
        throw new Error('Model not found');
      }

      return {
        dslSource: model.dslSource,
        modelId: model.id,
        versionId: model.versionId,
        isActive: model.isActive,
      };
    } catch (error) {
      this.logger.error(`ReadModel failed: ${error}`);
      throw new RpcException((error as Error).message);
    }
  }

  /**
   * Activate a specific model version
   */
  @GrpcMethod('AuthorizationService', 'ActivateModel')
  async activateModel(request: ActivateModelRequest): Promise<ActivateModelResponse> {
    try {
      const model = await this.modelRepository.activate(request.modelId);

      if (!model) {
        return {
          success: false,
          message: 'Model not found',
        };
      }

      return {
        success: true,
        message: `Model ${model.versionId} activated`,
      };
    } catch (error) {
      this.logger.error(`ActivateModel failed: ${error}`);
      throw new RpcException((error as Error).message);
    }
  }
}
