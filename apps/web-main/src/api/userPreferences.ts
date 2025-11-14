import { personalApi } from './resume';

export enum Theme {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
}

export enum SectionType {
  SKILLS = 'SKILLS',
  EXPERIENCE = 'EXPERIENCE',
  PROJECT = 'PROJECT',
  EDUCATION = 'EDUCATION',
  CERTIFICATE = 'CERTIFICATE',
}

export interface SectionOrderItem {
  type: SectionType;
  order: number;
  visible: boolean;
}

export interface UserPreferences {
  id: string;
  userId: string;
  theme: Theme;
  sectionOrder: SectionOrderItem[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPreferencesDto {
  theme: Theme;
  sectionOrder?: SectionOrderItem[];
}

export interface UpdateUserPreferencesDto {
  theme?: Theme;
  sectionOrder?: SectionOrderItem[];
}

/**
 * Get user preferences
 * Creates default if not exists
 */
export const getUserPreferences = async (): Promise<UserPreferences> => {
  const response = await personalApi.get<UserPreferences>(
    '/v1/user-preferences',
  );
  return response.data;
};

/**
 * Create or update user preferences (upsert)
 */
export const upsertUserPreferences = async (
  dto: CreateUserPreferencesDto,
): Promise<UserPreferences> => {
  const response = await personalApi.post<UserPreferences>(
    '/v1/user-preferences',
    dto,
  );
  return response.data;
};

/**
 * Update user preferences (partial update)
 */
export const updateUserPreferences = async (
  dto: UpdateUserPreferencesDto,
): Promise<UserPreferences> => {
  const response = await personalApi.put<UserPreferences>(
    '/v1/user-preferences',
    dto,
  );
  return response.data;
};

/**
 * Delete user preferences (reset to default)
 */
export const deleteUserPreferences = async (): Promise<void> => {
  await personalApi.delete('/v1/user-preferences');
};
