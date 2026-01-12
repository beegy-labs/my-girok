import apiClient from './client';

/**
 * Session recording metadata
 */
export interface SessionRecordingMetadata {
  sessionId: string;
  actorId?: string;
  actorType?: string;
  actorEmail?: string;
  serviceSlug: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  totalEvents: number;
  pageViews: number;
  clicks: number;
  entryPage: string;
  exitPage?: string;
  browser: string;
  os: string;
  deviceType: string;
  countryCode: string;
  status: string;
}

/**
 * Session recording list response
 */
export interface SessionRecordingListResponse {
  data: SessionRecordingMetadata[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Session recording with events for replay
 */
export interface SessionRecordingEvents {
  sessionId: string;
  metadata: SessionRecordingMetadata;
  events: unknown[];
}

/**
 * Query parameters for listing recordings
 */
export interface SessionRecordingQuery {
  serviceSlug?: string;
  actorId?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const recordingsApi = {
  /**
   * List recorded sessions
   */
  listSessions: async (query?: SessionRecordingQuery): Promise<SessionRecordingListResponse> => {
    const params = new URLSearchParams();
    if (query?.serviceSlug) params.append('serviceSlug', query.serviceSlug);
    if (query?.actorId) params.append('actorId', query.actorId);
    if (query?.deviceType) params.append('deviceType', query.deviceType);
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());

    const response = await apiClient.get<SessionRecordingListResponse>(
      `/recordings/sessions?${params}`,
    );
    return response.data;
  },

  /**
   * Get session recording events for replay
   */
  getSessionEvents: async (sessionId: string): Promise<SessionRecordingEvents> => {
    const response = await apiClient.get<SessionRecordingEvents>(
      `/recordings/sessions/${sessionId}/events`,
    );
    return response.data;
  },
};
