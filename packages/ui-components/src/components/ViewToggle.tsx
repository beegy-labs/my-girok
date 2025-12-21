import { memo } from 'react';
import { focusClasses } from '../styles/constants';

export type ViewMode = 'grid' | 'list';

export interface ViewToggleProps {
  /**
   * Current view mode
   */
  value: ViewMode;
  /**
   * Callback when view mode changes
   */
  onChange: (mode: ViewMode) => void;
  /**
   * Additional CSS classes
   */
  className?: string;
}

// Static class definitions (2025 best practice - outside component)
// V0.0.1 AAA Workstation Design System

// p-4 ensures reliable 56px touch target with larger icons
const buttonBaseClasses =
  'p-4 rounded-soft transition-all duration-200 min-h-[56px] min-w-[56px] flex items-center justify-center border-2 border-transparent';

const buttonActiveClasses = 'bg-theme-primary text-btn-primary-text shadow-theme-lg';

const buttonInactiveClasses =
  'text-theme-text-secondary hover:bg-theme-bg-hover hover:border-theme-border-default';

/**
 * View Toggle Component for switching between Grid and List views (2025 Accessible Pattern)
 * V0.0.1 AAA Workstation Design System
 *
 * Features:
 * - Toggle between grid (2-column cards) and list (compact rows) views
 * - WCAG 2.1 AAA compliant touch targets (56x56px with p-4 padding)
 * - Theme-aware text colors for proper contrast in both light/dark modes
 * - Clear visual feedback for active state with shadow
 *
 * @example
 * ```tsx
 * const [viewMode, setViewMode] = useState<ViewMode>('grid');
 * <ViewToggle value={viewMode} onChange={setViewMode} />
 * ```
 */
export const ViewToggle = memo(function ViewToggle({
  value,
  onChange,
  className = '',
}: ViewToggleProps) {
  // 2025 best practice: inline handlers when component is already memoized
  return (
    <div className={`inline-flex gap-4 ${className}`} role="radiogroup" aria-label="View mode">
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={`${buttonBaseClasses} ${focusClasses} ${
          value === 'grid' ? buttonActiveClasses : buttonInactiveClasses
        }`}
        role="radio"
        aria-checked={value === 'grid'}
        aria-label="Grid view"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        className={`${buttonBaseClasses} ${focusClasses} ${
          value === 'list' ? buttonActiveClasses : buttonInactiveClasses
        }`}
        role="radio"
        aria-checked={value === 'list'}
        aria-label="List view"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </div>
  );
});
