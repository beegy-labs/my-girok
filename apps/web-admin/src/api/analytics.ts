import apiClient from './client';

/**
 * User summary statistics
 */
export interface UserSummary {
  userId: string;
  email: string;
  totalSessions: number;
  totalDuration: number;
  totalPageViews: number;
  totalClicks: number;
  countries: string[];
  devices: string[];
  lastSessionAt: string;
  firstSessionAt: string;
}

/**
 * User session summary for list
 */
export interface UserSessionSummary {
  sessionId: string;
  startedAt: string;
  durationSeconds: number;
  pageViews: number;
  clicks: number;
  deviceType: string;
  browser: string;
  countryCode: string;
  status: string;
}

/**
 * User location statistics
 */
export interface UserLocationStats {
  countryCode: string;
  countryName: string;
  sessionCount: number;
  totalDuration: number;
  percentage: number;
}

/**
 * User overview item
 */
export interface UserOverviewItem {
  userId: string;
  email: string;
  sessionCount: number;
  lastActive: string;
  countries: string[];
  devices: string[];
}

/**
 * Top users response
 */
export interface TopUsersResponse {
  data: UserOverviewItem[];
  total: number;
}

/**
 * Query parameters for user sessions
 */
export interface UserSessionsQuery {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export const analyticsApi = {
  /**
   * Get user summary statistics
   */
  getUserSummary: async (userId: string): Promise<UserSummary> => {
    const response = await apiClient.get<UserSummary>(`/analytics/users/${userId}/summary`);
    return response.data;
  },

  /**
   * Get user session list
   */
  getUserSessions: async (
    userId: string,
    query?: UserSessionsQuery,
  ): Promise<{ data: UserSessionSummary[]; total: number }> => {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);

    const response = await apiClient.get<{ data: UserSessionSummary[]; total: number }>(
      `/analytics/users/${userId}/sessions?${params}`,
    );
    return response.data;
  },

  /**
   * Get user location statistics
   */
  getUserLocations: async (userId: string): Promise<UserLocationStats[]> => {
    const response = await apiClient.get<UserLocationStats[]>(
      `/analytics/users/${userId}/locations`,
    );
    return response.data;
  },

  /**
   * Get top active users
   */
  getTopUsers: async (limit = 50): Promise<TopUsersResponse> => {
    const response = await apiClient.get<TopUsersResponse>(`/analytics/users/top?limit=${limit}`);
    return response.data;
  },

  /**
   * Get users overview
   */
  getUsersOverview: async (query?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ data: UserOverviewItem[]; total: number; page: number; totalPages: number }> => {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.search) params.append('search', query.search);

    const response = await apiClient.get<{
      data: UserOverviewItem[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/analytics/users/overview?${params}`);
    return response.data;
  },
};
