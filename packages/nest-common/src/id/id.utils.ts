import { ID } from './ulid.generator';

/**
 * Generate multiple ULIDs
 * @param count - Number of ULIDs to generate
 * @returns Array of ULID strings
 */
export function generateIds(count: number): string[] {
  return Array.from({ length: count }, () => ID.generate());
}

/**
 * Sort array of objects by ULID field
 * @param items - Array of objects with ULID field
 * @param field - Field name to sort by (default: 'id')
 * @param order - Sort order (default: 'asc')
 * @returns Sorted array (new array, does not mutate original)
 */
export function sortByUlid<T extends Record<string, unknown>>(
  items: T[],
  field: keyof T = 'id',
  order: 'asc' | 'desc' = 'asc',
): T[] {
  return [...items].sort((a, b) => {
    const comparison = ID.compare(String(a[field]), String(b[field]));
    return order === 'asc' ? comparison : -comparison;
  });
}

/**
 * Filter items by ULID time range
 * @param items - Array of objects with ULID field
 * @param field - Field name containing ULID
 * @param startTime - Start of time range
 * @param endTime - End of time range
 * @returns Filtered array
 */
export function filterByTimeRange<T extends Record<string, unknown>>(
  items: T[],
  field: keyof T,
  startTime: Date,
  endTime: Date,
): T[] {
  const startTs = startTime.getTime();
  const endTs = endTime.getTime();

  return items.filter((item) => {
    try {
      const ts = ID.getTimestamp(String(item[field])).getTime();
      return ts >= startTs && ts <= endTs;
    } catch {
      return false;
    }
  });
}

/**
 * Extract creation time from entity with ULID id
 * @param entity - Entity with id field
 * @returns Date object or null if invalid
 */
export function getCreatedAt<T extends { id: string }>(entity: T): Date | null {
  try {
    return ID.getTimestamp(entity.id);
  } catch {
    return null;
  }
}
