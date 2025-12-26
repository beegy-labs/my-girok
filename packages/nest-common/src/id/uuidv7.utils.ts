import { UUIDv7, ID } from './uuidv7.generator';

/**
 * Generate multiple UUIDv7s
 * @param count - Number of UUIDs to generate
 * @returns Array of UUID strings
 */
export function generateIds(count: number): string[] {
  return Array.from({ length: count }, () => ID.generate());
}

/**
 * Sort array of objects by UUID field
 * UUIDv7s sort in chronological order due to timestamp prefix
 * @param items - Array of objects with UUID field
 * @param field - Field name to sort by (default: 'id')
 * @param order - Sort order (default: 'asc')
 * @returns Sorted array (new array, does not mutate original)
 */
export function sortByUUID<T extends Record<string, unknown>>(
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
 * Filter items by UUIDv7 time range
 * @param items - Array of objects with UUID field
 * @param field - Field name containing UUIDv7
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
 * Extract creation time from entity with UUIDv7 id
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

/**
 * Check if a string is a valid UUIDv7 specifically
 * @param id - String to check
 * @returns boolean
 */
export function isUUIDv7(id: string): boolean {
  return UUIDv7.isValid(id);
}

/**
 * Check if a string is a valid UUID (any version 1-8)
 * @param id - String to check
 * @returns boolean
 */
export function isUUID(id: string): boolean {
  return UUIDv7.isValidUUID(id);
}

/**
 * Parse UUIDv7 into components
 * @param uuid - UUIDv7 string
 * @returns Object with timestamp, version, variant, and random parts
 */
export function parseUUIDv7(uuid: string): {
  timestamp: Date;
  version: number;
  variant: string;
  isValid: boolean;
} {
  const clean = uuid.replace(/-/g, '');
  if (clean.length !== 32) {
    return { timestamp: new Date(0), version: 0, variant: '', isValid: false };
  }

  const timestamp = new Date(parseInt(clean.slice(0, 12), 16));
  const version = parseInt(clean.slice(12, 13), 16);
  const variantNibble = parseInt(clean.slice(16, 17), 16);

  let variant = 'unknown';
  if ((variantNibble & 0xc) === 0x8) {
    variant = 'RFC 4122/9562';
  }

  return {
    timestamp,
    version,
    variant,
    isValid: UUIDv7.isValid(uuid),
  };
}

// Legacy alias exports for backward compatibility with ULID-based code
export { sortByUUID as sortByUlid };
