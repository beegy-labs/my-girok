import apiClient from './client';

/**
 * Team entity
 */
export interface Team {
  id: string;
  name: string;
  description?: string;
  members: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Team member
 */
export interface TeamMember {
  userId: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

/**
 * Create team request
 */
export interface CreateTeamRequest {
  name: string;
  description?: string;
  members?: {
    userId: string;
    role: 'owner' | 'admin' | 'member';
  }[];
}

/**
 * Update team request
 */
export interface UpdateTeamRequest {
  name?: string;
  description?: string;
}

/**
 * Teams list response
 */
export interface TeamsListResponse {
  data: Team[];
  total: number;
  page: number;
  totalPages: number;
}

export const teamsApi = {
  /**
   * List all teams
   */
  listTeams: async (query?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<TeamsListResponse> => {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.search) params.append('search', query.search);

    const response = await apiClient.get<TeamsListResponse>(`/teams?${params}`);
    return response.data;
  },

  /**
   * Get team by ID
   */
  getTeam: async (id: string): Promise<Team> => {
    const response = await apiClient.get<Team>(`/teams/${id}`);
    return response.data;
  },

  /**
   * Create new team
   */
  createTeam: async (data: CreateTeamRequest): Promise<Team> => {
    const response = await apiClient.post<Team>('/teams', data);
    return response.data;
  },

  /**
   * Update team
   */
  updateTeam: async (id: string, data: UpdateTeamRequest): Promise<Team> => {
    const response = await apiClient.patch<Team>(`/teams/${id}`, data);
    return response.data;
  },

  /**
   * Delete team
   */
  deleteTeam: async (id: string): Promise<void> => {
    await apiClient.delete(`/teams/${id}`);
  },

  /**
   * Add team member
   */
  addMember: async (
    teamId: string,
    member: { userId: string; role: 'owner' | 'admin' | 'member' },
  ): Promise<Team> => {
    const response = await apiClient.post<Team>(`/teams/${teamId}/members`, member);
    return response.data;
  },

  /**
   * Remove team member
   */
  removeMember: async (teamId: string, userId: string): Promise<Team> => {
    const response = await apiClient.delete<Team>(`/teams/${teamId}/members/${userId}`);
    return response.data;
  },

  /**
   * Update member role
   */
  updateMemberRole: async (
    teamId: string,
    userId: string,
    role: 'owner' | 'admin' | 'member',
  ): Promise<Team> => {
    const response = await apiClient.patch<Team>(`/teams/${teamId}/members/${userId}`, { role });
    return response.data;
  },
};
