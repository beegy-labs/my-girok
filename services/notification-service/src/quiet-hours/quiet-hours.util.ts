/**
 * Quiet Hours Utility Functions
 *
 * Provides timezone-aware quiet hours checking functionality.
 * Quiet hours are time periods when notifications should not be delivered
 * (except for URGENT priority notifications).
 */

export interface QuietHoursConfig {
  enabled: boolean;
  startTime: string; // "22:00"
  endTime: string; // "08:00"
  timezone: string; // "Asia/Seoul"
}

/**
 * Check if the current time is within quiet hours for a given timezone
 *
 * @param config - Quiet hours configuration
 * @param checkTime - Optional time to check (defaults to now)
 * @returns true if currently in quiet hours
 *
 * @example
 * // Quiet hours from 22:00 to 08:00 in Seoul timezone
 * isInQuietHours({
 *   enabled: true,
 *   startTime: '22:00',
 *   endTime: '08:00',
 *   timezone: 'Asia/Seoul'
 * });
 */
export function isInQuietHours(config: QuietHoursConfig, checkTime?: Date): boolean {
  if (!config.enabled) {
    return false;
  }

  const now = checkTime || new Date();

  // Get current time in the user's timezone
  const userTime = getTimeInTimezone(now, config.timezone);

  // Parse start and end times
  const startMinutes = parseTimeToMinutes(config.startTime);
  const endMinutes = parseTimeToMinutes(config.endTime);
  const currentMinutes = userTime.hours * 60 + userTime.minutes;

  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (startMinutes > endMinutes) {
    // Quiet hours span midnight
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    // Normal quiet hours (e.g., 13:00 to 15:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
}

/**
 * Get the current time in a specific timezone
 */
export function getTimeInTimezone(
  date: Date,
  timezone: string,
): { hours: number; minutes: number; seconds: number } {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const hours = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minutes = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    const seconds = parseInt(parts.find((p) => p.type === 'second')?.value || '0', 10);

    return { hours, minutes, seconds };
  } catch {
    // Fallback to UTC if timezone is invalid
    return {
      hours: date.getUTCHours(),
      minutes: date.getUTCMinutes(),
      seconds: date.getUTCSeconds(),
    };
  }
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Format minutes since midnight to time string (HH:MM)
 */
export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Validate timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get common timezone options
 */
export const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Australia/Sydney',
] as const;

/**
 * Get the next time quiet hours will end
 * Useful for scheduling delayed notifications
 */
export function getQuietHoursEndTime(config: QuietHoursConfig, fromTime?: Date): Date | null {
  if (!config.enabled) {
    return null;
  }

  const now = fromTime || new Date();
  const userTime = getTimeInTimezone(now, config.timezone);
  const currentMinutes = userTime.hours * 60 + userTime.minutes;

  const endMinutes = parseTimeToMinutes(config.endTime);

  // Calculate minutes until quiet hours end
  let minutesUntilEnd: number;

  if (currentMinutes < endMinutes) {
    // End time is today
    minutesUntilEnd = endMinutes - currentMinutes;
  } else {
    // End time is tomorrow
    minutesUntilEnd = 24 * 60 - currentMinutes + endMinutes;
  }

  const endTime = new Date(now.getTime() + minutesUntilEnd * 60 * 1000);
  return endTime;
}
