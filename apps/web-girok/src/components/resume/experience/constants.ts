import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

// DnD sensor activation options
export const SENSOR_OPTIONS = {
  pointer: { activationConstraint: { distance: 8 } },
  touch: { activationConstraint: { delay: 200, tolerance: 5 } },
  keyboard: { coordinateGetter: sortableKeyboardCoordinates },
} as const;

// Depth colors for hierarchical achievements - WCAG AAA 7:1+ compliant
export const DEPTH_COLORS = {
  1: {
    bg: 'bg-theme-level-1-bg',
    border: 'border-l-theme-level-1-border',
    text: 'text-theme-level-1-text',
  },
  2: {
    bg: 'bg-theme-level-2-bg',
    border: 'border-l-theme-level-2-border',
    text: 'text-theme-level-2-text',
  },
  3: {
    bg: 'bg-theme-level-3-bg',
    border: 'border-l-theme-level-3-border',
    text: 'text-theme-level-3-text',
  },
  4: {
    bg: 'bg-theme-level-4-bg',
    border: 'border-l-theme-level-4-border',
    text: 'text-theme-level-4-text',
  },
} as const;

export type DepthLevel = keyof typeof DEPTH_COLORS;
