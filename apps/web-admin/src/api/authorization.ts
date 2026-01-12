import apiClient from './client';

/**
 * Permission check request
 */
export interface PermissionCheckRequest {
  user: string;
  relation: string;
  object: string;
}

/**
 * Permission check response
 */
export interface PermissionCheckResponse {
  allowed: boolean;
  user: string;
  relation: string;
  object: string;
}

/**
 * Authorization model
 */
export interface AuthorizationModel {
  id: string;
  version: number;
  content: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
}

/**
 * Model validation result
 */
export interface ModelValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * List objects response
 */
export interface ListObjectsResponse {
  objects: string[];
  user: string;
  relation: string;
  objectType: string;
}

/**
 * List users response
 */
export interface ListUsersResponse {
  users: string[];
  object: string;
  relation: string;
}

/**
 * Grant/revoke request
 */
export interface GrantRevokeRequest {
  user: string;
  relation: string;
  object: string;
}

export const authorizationApi = {
  /**
   * Check permission
   */
  check: async (request: PermissionCheckRequest): Promise<PermissionCheckResponse> => {
    const response = await apiClient.post<PermissionCheckResponse>('/authorization/check', request);
    return response.data;
  },

  /**
   * Batch check permissions
   */
  batchCheck: async (requests: PermissionCheckRequest[]): Promise<PermissionCheckResponse[]> => {
    const response = await apiClient.post<PermissionCheckResponse[]>('/authorization/batch-check', {
      checks: requests,
    });
    return response.data;
  },

  /**
   * Get active authorization model
   */
  getModel: async (): Promise<AuthorizationModel> => {
    const response = await apiClient.get<AuthorizationModel>('/authorization/model');
    return response.data;
  },

  /**
   * Get all model versions
   */
  getModelVersions: async (): Promise<AuthorizationModel[]> => {
    const response = await apiClient.get<AuthorizationModel[]>('/authorization/model/versions');
    return response.data;
  },

  /**
   * Create new model version
   */
  createModel: async (content: string): Promise<AuthorizationModel> => {
    const response = await apiClient.post<AuthorizationModel>('/authorization/model', { content });
    return response.data;
  },

  /**
   * Validate model syntax
   */
  validateModel: async (content: string): Promise<ModelValidationResult> => {
    const response = await apiClient.post<ModelValidationResult>('/authorization/model/validate', {
      content,
    });
    return response.data;
  },

  /**
   * Activate model version
   */
  activateModel: async (modelId: string): Promise<AuthorizationModel> => {
    const response = await apiClient.post<AuthorizationModel>(
      `/authorization/model/${modelId}/activate`,
    );
    return response.data;
  },

  /**
   * Grant permission
   */
  grant: async (request: GrantRevokeRequest): Promise<void> => {
    await apiClient.post('/authorization/grant', request);
  },

  /**
   * Revoke permission
   */
  revoke: async (request: GrantRevokeRequest): Promise<void> => {
    await apiClient.post('/authorization/revoke', request);
  },

  /**
   * List objects user can access
   */
  listObjects: async (
    user: string,
    relation: string,
    objectType: string,
  ): Promise<ListObjectsResponse> => {
    const response = await apiClient.get<ListObjectsResponse>(
      `/authorization/list-objects?user=${encodeURIComponent(user)}&relation=${encodeURIComponent(relation)}&objectType=${encodeURIComponent(objectType)}`,
    );
    return response.data;
  },

  /**
   * List users who can access object
   */
  listUsers: async (object: string, relation: string): Promise<ListUsersResponse> => {
    const response = await apiClient.get<ListUsersResponse>(
      `/authorization/list-users?object=${encodeURIComponent(object)}&relation=${encodeURIComponent(relation)}`,
    );
    return response.data;
  },
};
