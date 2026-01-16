/**
 * Hierarchical Rendering Utilities
 *
 * Shared utilities for rendering hierarchical data structures (skills, achievements)
 * with consistent bullet styles and indentation across the application.
 */

/**
 * Get bullet symbol for a given depth level
 * @param depth - Depth level (1-4)
 * @returns Bullet symbol (without trailing space)
 */
export function getBulletSymbol(depth: number): string {
  switch (depth) {
    case 1:
      return '•'; // Filled circle
    case 2:
      return '◦'; // Open circle
    case 3:
      return '▪'; // Filled square
    case 4:
      return '▫'; // Open square
    default:
      return '•';
  }
}

/**
 * Get bullet symbol with trailing space for display
 * @param depth - Depth level (1-4)
 * @returns Bullet symbol with space
 */
export function getBulletStyle(depth: number): string {
  return getBulletSymbol(depth) + ' ';
}

/**
 * Calculate indentation for a given depth level
 * Standard: 1.5 units per depth level (approximately 6 spaces)
 *
 * @param depth - Depth level (1-4)
 * @param unit - CSS unit ('em' | 'rem' | 'px')
 * @returns CSS indentation value
 */
export function getIndentation(depth: number, unit: 'em' | 'rem' | 'px' = 'em'): string {
  const value = (depth - 1) * 1.5;
  return `${value}${unit}`;
}

/**
 * Type definition for hierarchical item
 */
export interface HierarchicalItem {
  content: string;
  depth: number;
  order: number;
  children?: HierarchicalItem[];
}

/**
 * Sort hierarchical items by order
 */
export function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}
