/**
 * Theme System Types
 *
 * ThemeName: The actual theme applied (maps to data-theme attribute)
 * Theme: User preference stored in localStorage
 */

/** Theme names available in the system (matches CSS [data-theme] selectors) */
export type ThemeName = 'light' | 'dark';

/** User preference options (includes 'system' for auto-detection) */
export type Theme = 'light' | 'dark' | 'system';

/** Available themes with metadata */
export const AVAILABLE_THEMES: ReadonlyArray<{
  name: ThemeName;
  label: string;
  description: string;
}> = [
  {
    name: 'light',
    label: 'Clean White Oak',
    description: 'Warm oak tones for comfortable daytime reading',
  },
  {
    name: 'dark',
    label: 'Midnight Gentle Study',
    description: 'Cool tones for comfortable night reading',
  },
] as const;

/**
 * Maps user preference to actual theme name
 * Direct mapping - preference equals theme name
 */
export function mapPreferenceToTheme(preference: 'light' | 'dark'): ThemeName {
  return preference;
}
