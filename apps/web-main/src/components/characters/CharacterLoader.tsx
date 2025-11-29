import { useTheme } from '../../hooks/useTheme';
import Squirrel from './Squirrel';
import Owl from './Owl';

export type CharacterState = 'idle' | 'loading' | 'sad' | 'confused' | 'sleeping';

interface CharacterLoaderProps {
  state?: CharacterState;
  size?: number;
  className?: string;
}

/**
 * CharacterLoader - Theme-aware character display
 *
 * Automatically switches between Squirrel (light mode) and Owl (dark mode)
 * based on the current theme.
 *
 * States:
 * - idle: Default calm state
 * - loading: Active animation (tail wag, wing flap, glowing eyes)
 * - sad: Used for errors, deleted content
 * - confused: Used for 404, not found
 * - sleeping: Used for expired content, maintenance
 */
export default function CharacterLoader({
  state = 'idle',
  size = 120,
  className = ''
}: CharacterLoaderProps) {
  const { effectiveTheme } = useTheme();

  return (
    <div className={`flex items-center justify-center ${className}`}>
      {effectiveTheme === 'dark' ? (
        <Owl state={state} size={size} />
      ) : (
        <Squirrel state={state} size={size} />
      )}
    </div>
  );
}
