/**
 * Theme System Types
 *
 * ThemeName: The actual theme applied (maps to data-theme attribute)
 * Theme: User preference stored in localStorage
 */

/** Theme names available in the system */
export type ThemeName = 'vintage' | 'dark';

/** User preference options (includes 'system' for auto-detection) */
export type Theme = 'light' | 'dark' | 'system';

/** Available themes with metadata */
export const AVAILABLE_THEMES: ReadonlyArray<{
  name: ThemeName;
  label: string;
  description: string;
}> = [
  {
    name: 'vintage',
    label: 'Vintage Library',
    description: 'Warm wood tones inspired by classic libraries',
  },
  {
    name: 'dark',
    label: 'Moonlit Library',
    description: 'Cool slate tones for comfortable night reading',
  },
] as const;

/**
 * Maps user preference to actual theme name
 * 'light' preference -> 'vintage' theme
 * 'dark' preference -> 'dark' theme
 */
export function mapPreferenceToTheme(preference: 'light' | 'dark'): ThemeName {
  return preference === 'light' ? 'vintage' : 'dark';
}
