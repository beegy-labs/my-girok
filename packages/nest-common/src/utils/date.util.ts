/**
 * Formats a Date object into a partition key string.
 * This is useful for creating partition keys for time-series databases like ClickHouse.
 * @param date The date to format.
 * @param unit The time unit for the partition ('month' or 'day').
 * @returns The formatted partition string (e.g., '202601' or '20260102').
 */
export function formatPartition(date: Date, unit: 'month' | 'day'): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  if (unit === 'month') {
    return `${year}${month}`;
  }

  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}
