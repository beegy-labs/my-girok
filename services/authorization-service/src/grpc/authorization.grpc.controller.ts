/**
 * Authorization gRPC Controller
 *
 * Implements the AuthorizationService gRPC interface.
 */

import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { CheckEngine } from '../engine';
import { TupleRepository, ModelRepository, TeamRepository } from '../storage';
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

interface ListModelsRequest {
  pageSize?: number;
  pageToken?: string;
}

interface ListModelsResponse {
  models: Array<{
    modelId: string;
    versionId: string;
    isActive: boolean;
    createdAt: string;
  }>;
  nextPageToken?: string;
}

interface GetTeamRequest {
  teamId: string;
}

interface GetTeamResponse {
  team: {
    id: string;
    name: string;
    displayName: string;
    serviceId?: string;
    description?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  };
}

interface ListTeamsRequest {
  page: number;
  limit: number;
  search?: string;
}

interface ListTeamsResponse {
  teams: Array<{
    id: string;
    name: string;
    displayName: string;
    serviceId?: string;
    description?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
  page: number;
  totalPages: number;
}

interface CreateTeamRequest {
  name: string;
  description?: string;
  serviceId?: string;
  createdBy: string;
}

interface CreateTeamResponse {
  team: {
    id: string;
    name: string;
    displayName: string;
    serviceId?: string;
    description?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  };
}

interface UpdateTeamRequest {
  teamId: string;
  name?: string;
  description?: string;
}

interface UpdateTeamResponse {
  team: {
    id: string;
    name: string;
    displayName: string;
    serviceId?: string;
    description?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  };
}

interface DeleteTeamRequest {
  teamId: string;
}

interface DeleteTeamResponse {
  success: boolean;
}

@Controller()
export class AuthorizationGrpcController {
  private readonly logger = new Logger(AuthorizationGrpcController.name);

  constructor(
    private readonly checkEngine: CheckEngine,
    private readonly tupleRepository: TupleRepository,
    private readonly modelRepository: ModelRepository,
    private readonly teamRepository: TeamRepository,
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

  /**
   * List all authorization models
   */
  @GrpcMethod('AuthorizationService', 'ListModels')
  async listModels(request: ListModelsRequest): Promise<ListModelsResponse> {
    try {
      const limit = request.pageSize || 100;
      const offset = request.pageToken ? parseInt(request.pageToken, 10) : 0;

      const models = await this.modelRepository.list({ limit: limit + 1, offset });

      const hasNext = models.length > limit;
      const resultModels = hasNext ? models.slice(0, limit) : models;

      return {
        models: resultModels.map((m) => ({
          modelId: m.id,
          versionId: m.versionId,
          isActive: m.isActive,
          createdAt: m.createdAt.toISOString(),
          dslSource: m.dslSource,
        })),
        nextPageToken: hasNext ? (offset + limit).toString() : undefined,
      };
    } catch (error) {
      this.logger.error(`ListModels failed: ${error}`);
      throw new RpcException((error as Error).message);
    }
  }

  /**
   * Get team by ID
   */
  @GrpcMethod('AuthorizationService', 'GetTeam')
  async getTeam(request: GetTeamRequest): Promise<GetTeamResponse> {
    try {
      const team = await this.teamRepository.getById(request.teamId);

      if (!team) {
        throw new Error(`Team with ID ${request.teamId} not found`);
      }

      return {
        team: {
          id: team.id,
          name: team.name,
          displayName: team.displayName,
          serviceId: team.serviceId || undefined,
          description: team.description || undefined,
          createdBy: team.createdBy,
          createdAt: (team.createdAt ?? new Date()).toISOString(),
          updatedAt: (team.updatedAt ?? new Date()).toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`GetTeam failed: ${error}`);
      throw new RpcException((error as Error).message);
    }
  }

  /**
   * List teams with pagination and search
   */
  @GrpcMethod('AuthorizationService', 'ListTeams')
  async listTeams(request: ListTeamsRequest): Promise<ListTeamsResponse> {
    try {
      const { teams, total } = await this.teamRepository.list({
        page: request.page,
        limit: request.limit,
        search: request.search,
      });

      const totalPages = Math.ceil(total / request.limit);

      return {
        teams: teams.map((t) => ({
          id: t.id,
          name: t.name,
          displayName: t.displayName,
          serviceId: t.serviceId || undefined,
          description: t.description || undefined,
          createdBy: t.createdBy,
          createdAt: (t.createdAt ?? new Date()).toISOString(),
          updatedAt: (t.updatedAt ?? new Date()).toISOString(),
        })),
        total,
        page: request.page,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`ListTeams failed: ${error}`);
      throw new RpcException((error as Error).message);
    }
  }

  /**
   * Create a new team
   */
  @GrpcMethod('AuthorizationService', 'CreateTeam')
  async createTeam(request: CreateTeamRequest): Promise<CreateTeamResponse> {
    try {
      const team = await this.teamRepository.create({
        name: request.name,
        description: request.description,
        serviceId: request.serviceId,
        createdBy: request.createdBy,
      });

      return {
        team: {
          id: team.id,
          name: team.name,
          displayName: team.displayName,
          serviceId: team.serviceId || undefined,
          description: team.description || undefined,
          createdBy: team.createdBy,
          createdAt: (team.createdAt ?? new Date()).toISOString(),
          updatedAt: (team.updatedAt ?? new Date()).toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`CreateTeam failed: ${error}`);
      throw new RpcException((error as Error).message);
    }
  }

  /**
   * Update team
   */
  @GrpcMethod('AuthorizationService', 'UpdateTeam')
  async updateTeam(request: UpdateTeamRequest): Promise<UpdateTeamResponse> {
    try {
      const team = await this.teamRepository.update(request.teamId, {
        name: request.name,
        description: request.description,
      });

      return {
        team: {
          id: team.id,
          name: team.name,
          displayName: team.displayName,
          serviceId: team.serviceId || undefined,
          description: team.description || undefined,
          createdBy: team.createdBy,
          createdAt: (team.createdAt ?? new Date()).toISOString(),
          updatedAt: (team.updatedAt ?? new Date()).toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`UpdateTeam failed: ${error}`);
      throw new RpcException((error as Error).message);
    }
  }

  /**
   * Delete team
   */
  @GrpcMethod('AuthorizationService', 'DeleteTeam')
  async deleteTeam(request: DeleteTeamRequest): Promise<DeleteTeamResponse> {
    try {
      const success = await this.teamRepository.delete(request.teamId);
      return { success };
    } catch (error) {
      this.logger.error(`DeleteTeam failed: ${error}`);
      throw new RpcException((error as Error).message);
    }
  }
}
