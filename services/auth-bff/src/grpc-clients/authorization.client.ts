/**
 * Authorization gRPC Client
 *
 * Client for communicating with the authorization-service via gRPC.
 * Provides Zanzibar-style permission checking.
 */

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { Observable, firstValueFrom, catchError, of } from 'rxjs';

// Request/Response types
export interface TupleKey {
  user: string;
  relation: string;
  object: string;
}

export interface CheckRequest {
  user: string;
  relation: string;
  object: string;
  contextualTuples?: TupleKey[];
  trace?: boolean;
  consistencyToken?: string;
}

export interface CheckResponse {
  allowed: boolean;
  resolution?: unknown;
  consistencyToken?: string;
}

export interface BatchCheckRequest {
  checks: Array<{ user: string; relation: string; object: string }>;
}

export interface BatchCheckResponse {
  results: Array<{ allowed: boolean; error?: string }>;
}

export interface WriteRequest {
  writes?: TupleKey[];
  deletes?: TupleKey[];
}

export interface WriteResponse {
  consistencyToken: string;
  writtenCount: number;
  deletedCount: number;
}

export interface ListObjectsRequest {
  user: string;
  relation: string;
  type: string;
  pageSize?: number;
  pageToken?: string;
}

export interface ListObjectsResponse {
  objects: string[];
  nextPageToken?: string;
}

export interface ListUsersRequest {
  object: string;
  relation: string;
  userTypes?: string[];
  pageSize?: number;
  pageToken?: string;
}

export interface ListUsersResponse {
  users: string[];
  nextPageToken?: string;
}

export interface ListModelsRequest {
  pageSize?: number;
  pageToken?: string;
}

export interface ModelSummary {
  modelId: string;
  versionId: string;
  isActive: boolean;
  createdAt: string;
}

export interface ListModelsResponse {
  models: ModelSummary[];
  nextPageToken?: string;
}

export interface GetTeamRequest {
  teamId: string;
}

export interface Team {
  id: string;
  name: string;
  displayName: string;
  serviceId?: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetTeamResponse {
  team: Team;
}

export interface ListTeamsRequest {
  page: number;
  limit: number;
  search?: string;
}

export interface ListTeamsResponse {
  teams: Team[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
  serviceId?: string;
  createdBy: string;
}

export interface CreateTeamResponse {
  team: Team;
}

export interface UpdateTeamRequest {
  teamId: string;
  name?: string;
  description?: string;
}

export interface UpdateTeamResponse {
  team: Team;
}

export interface DeleteTeamRequest {
  teamId: string;
}

export interface DeleteTeamResponse {
  success: boolean;
}

interface AuthorizationServiceClient {
  check(request: CheckRequest): Observable<CheckResponse>;
  batchCheck(request: BatchCheckRequest): Observable<BatchCheckResponse>;
  write(request: WriteRequest): Observable<WriteResponse>;
  listObjects(request: ListObjectsRequest): Observable<ListObjectsResponse>;
  listUsers(request: ListUsersRequest): Observable<ListUsersResponse>;
  listModels(request: ListModelsRequest): Observable<ListModelsResponse>;
  getTeam(request: GetTeamRequest): Observable<GetTeamResponse>;
  listTeams(request: ListTeamsRequest): Observable<ListTeamsResponse>;
  createTeam(request: CreateTeamRequest): Observable<CreateTeamResponse>;
  updateTeam(request: UpdateTeamRequest): Observable<UpdateTeamResponse>;
  deleteTeam(request: DeleteTeamRequest): Observable<DeleteTeamResponse>;
}

@Injectable()
export class AuthorizationGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(AuthorizationGrpcClient.name);
  private authzService!: AuthorizationServiceClient;
  private client!: ClientGrpc;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('grpc.authorization.host', 'localhost');
    const port = this.configService.get<number>('grpc.authorization.port', 50055);

    try {
      const protoBasePath = join(process.cwd(), '../../packages/proto');
      const { ClientProxyFactory } = require('@nestjs/microservices');

      this.client = ClientProxyFactory.create({
        transport: Transport.GRPC,
        options: {
          package: 'authorization.v1',
          protoPath: join(protoBasePath, 'authorization/v1/authorization.proto'),
          url: `${host}:${port}`,
          loader: {
            keepCase: false,
            longs: Number,
            enums: Number,
            defaults: true,
            oneofs: true,
            includeDirs: [protoBasePath],
          },
        },
      });

      this.authzService =
        this.client.getService<AuthorizationServiceClient>('AuthorizationService');
      this.isConnected = true;
      this.logger.log(`Authorization gRPC client initialized: ${host}:${port}`);
    } catch (error) {
      this.logger.warn(`Failed to initialize authorization gRPC client: ${error}`);
      this.isConnected = false;
    }
  }

  /**
   * Check if a user has a specific permission
   */
  async check(user: string, relation: string, object: string): Promise<boolean> {
    if (!this.isConnected || !this.authzService) {
      this.logger.warn('Authorization service not connected');
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.authzService.check({ user, relation, object }).pipe(
          catchError((error) => {
            this.logger.warn(`Check failed: ${error.message}`);
            return of({ allowed: false });
          }),
        ),
      );
      return response.allowed;
    } catch (error) {
      this.logger.warn(`Check failed: ${error}`);
      return false;
    }
  }

  /**
   * Check permission with contextual tuples
   */
  async checkWithContext(
    user: string,
    relation: string,
    object: string,
    contextualTuples: TupleKey[],
  ): Promise<boolean> {
    if (!this.isConnected || !this.authzService) {
      this.logger.warn('Authorization service not connected');
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.authzService.check({ user, relation, object, contextualTuples }).pipe(
          catchError((error) => {
            this.logger.warn(`CheckWithContext failed: ${error.message}`);
            return of({ allowed: false });
          }),
        ),
      );
      return response.allowed;
    } catch (error) {
      this.logger.warn(`CheckWithContext failed: ${error}`);
      return false;
    }
  }

  /**
   * Batch check multiple permissions
   */
  async batchCheck(
    checks: Array<{ user: string; relation: string; object: string }>,
  ): Promise<boolean[]> {
    if (!this.isConnected || !this.authzService) {
      this.logger.warn('Authorization service not connected');
      return checks.map(() => false);
    }

    try {
      const response = await firstValueFrom(
        this.authzService.batchCheck({ checks }).pipe(
          catchError((error) => {
            this.logger.warn(`BatchCheck failed: ${error.message}`);
            return of({ results: checks.map(() => ({ allowed: false })) });
          }),
        ),
      );
      return response.results.map((r) => r.allowed);
    } catch (error) {
      this.logger.warn(`BatchCheck failed: ${error}`);
      return checks.map(() => false);
    }
  }

  /**
   * Write tuples (grant/revoke permissions)
   */
  async write(writes: TupleKey[], deletes?: TupleKey[]): Promise<string> {
    if (!this.isConnected || !this.authzService) {
      throw new Error('Authorization service not connected');
    }

    const response = await firstValueFrom(
      this.authzService.write({ writes, deletes }).pipe(
        catchError((error) => {
          this.logger.error(`Write failed: ${error.message}`);
          throw error;
        }),
      ),
    );
    return response.consistencyToken;
  }

  /**
   * Grant a permission
   */
  async grant(user: string, relation: string, object: string): Promise<string> {
    return this.write([{ user, relation, object }]);
  }

  /**
   * Revoke a permission
   */
  async revoke(user: string, relation: string, object: string): Promise<string> {
    return this.write([], [{ user, relation, object }]);
  }

  /**
   * List objects a user can access
   */
  async listObjects(user: string, relation: string, type: string): Promise<string[]> {
    if (!this.isConnected || !this.authzService) {
      this.logger.warn('Authorization service not connected');
      return [];
    }

    try {
      const response = await firstValueFrom(
        this.authzService.listObjects({ user, relation, type }).pipe(
          catchError((error) => {
            this.logger.warn(`ListObjects failed: ${error.message}`);
            return of({ objects: [] });
          }),
        ),
      );
      return response.objects;
    } catch (error) {
      this.logger.warn(`ListObjects failed: ${error}`);
      return [];
    }
  }

  /**
   * List users with access to an object
   */
  async listUsers(object: string, relation: string, userTypes?: string[]): Promise<string[]> {
    if (!this.isConnected || !this.authzService) {
      this.logger.warn('Authorization service not connected');
      return [];
    }

    try {
      const response = await firstValueFrom(
        this.authzService.listUsers({ object, relation, userTypes }).pipe(
          catchError((error) => {
            this.logger.warn(`ListUsers failed: ${error.message}`);
            return of({ users: [] });
          }),
        ),
      );
      return response.users;
    } catch (error) {
      this.logger.warn(`ListUsers failed: ${error}`);
      return [];
    }
  }

  /**
   * List all authorization models
   */
  async listModels(pageSize?: number, pageToken?: string): Promise<ListModelsResponse | null> {
    if (!this.isConnected || !this.authzService) {
      this.logger.warn('Authorization service not connected');
      return null;
    }

    try {
      return await firstValueFrom(
        this.authzService.listModels({ pageSize, pageToken }).pipe(
          catchError((error) => {
            this.logger.warn(`ListModels failed: ${error.message}`);
            return of(null as any);
          }),
        ),
      );
    } catch (error) {
      this.logger.warn(`ListModels failed: ${error}`);
      return null;
    }
  }

  /**
   * Get team by ID
   */
  async getTeam(teamId: string): Promise<Team | null> {
    if (!this.isConnected || !this.authzService) {
      this.logger.warn('Authorization service not connected');
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.authzService.getTeam({ teamId }).pipe(
          catchError((error) => {
            this.logger.warn(`GetTeam failed: ${error.message}`);
            return of(null as any);
          }),
        ),
      );
      return response?.team || null;
    } catch (error) {
      this.logger.warn(`GetTeam failed: ${error}`);
      return null;
    }
  }

  /**
   * List teams with pagination and search
   */
  async listTeams(page: number, limit: number, search?: string): Promise<ListTeamsResponse | null> {
    if (!this.isConnected || !this.authzService) {
      this.logger.warn('Authorization service not connected');
      return null;
    }

    try {
      return await firstValueFrom(
        this.authzService.listTeams({ page, limit, search }).pipe(
          catchError((error) => {
            this.logger.warn(`ListTeams failed: ${error.message}`);
            return of(null as any);
          }),
        ),
      );
    } catch (error) {
      this.logger.warn(`ListTeams failed: ${error}`);
      return null;
    }
  }

  /**
   * Create a new team
   */
  async createTeam(
    name: string,
    createdBy: string,
    description?: string,
    serviceId?: string,
  ): Promise<Team | null> {
    if (!this.isConnected || !this.authzService) {
      throw new Error('Authorization service not connected');
    }

    try {
      const response = await firstValueFrom(
        this.authzService.createTeam({ name, description, serviceId, createdBy }).pipe(
          catchError((error) => {
            this.logger.error(`CreateTeam failed: ${error.message}`);
            throw error;
          }),
        ),
      );
      return response.team;
    } catch (error) {
      this.logger.error(`CreateTeam failed: ${error}`);
      throw error;
    }
  }

  /**
   * Update team
   */
  async updateTeam(teamId: string, name?: string, description?: string): Promise<Team | null> {
    if (!this.isConnected || !this.authzService) {
      throw new Error('Authorization service not connected');
    }

    try {
      const response = await firstValueFrom(
        this.authzService.updateTeam({ teamId, name, description }).pipe(
          catchError((error) => {
            this.logger.error(`UpdateTeam failed: ${error.message}`);
            throw error;
          }),
        ),
      );
      return response.team;
    } catch (error) {
      this.logger.error(`UpdateTeam failed: ${error}`);
      throw error;
    }
  }

  /**
   * Delete team
   */
  async deleteTeam(teamId: string): Promise<boolean> {
    if (!this.isConnected || !this.authzService) {
      throw new Error('Authorization service not connected');
    }

    try {
      const response = await firstValueFrom(
        this.authzService.deleteTeam({ teamId }).pipe(
          catchError((error) => {
            this.logger.error(`DeleteTeam failed: ${error.message}`);
            throw error;
          }),
        ),
      );
      return response.success;
    } catch (error) {
      this.logger.error(`DeleteTeam failed: ${error}`);
      throw error;
    }
  }

  /**
   * Check if the client is connected
   */
  isServiceConnected(): boolean {
    return this.isConnected;
  }
}
